from fastapi import APIRouter, Depends, HTTPException
from ..db import get_db, rows
from ..deps import current_user
from ..schemas import DispatchIn
from ..dispatch import providers as P
from .. import cases as CS

router = APIRouter(prefix="/api/dispatches", tags=["dispatch"])

def _view(conn, d: dict, detail=False) -> dict:
    v = conn.execute("SELECT v.version,v.document_id,doc.title FROM document_versions v JOIN documents doc ON doc.id=v.document_id WHERE v.id=?",
                     (d["document_version_id"],)).fetchone()
    out = {**{k: d[k] for k in ("id", "status", "tracking_number", "recipient_name", "recipient_address", "delivery_method", "created_at",
                                "submitted_at", "error", "case_id", "document_version_id", "signature_id")},
           "status_label": P.DELIVERY_LABELS.get(d["status"], d["status"]), "document_id": v["document_id"],
           "document_title": v["title"], "version": v["version"], "notice": P.DEMO_POST_NOTICE}
    if detail:
        out["events"] = [dict(e) | {"label": P.DELIVERY_LABELS.get(e["status"], e["status"])} for e in
                         conn.execute("SELECT status,note,created_at FROM dispatch_events WHERE dispatch_id=? ORDER BY id", (d["id"],))]
        sig = conn.execute("SELECT id,request_id,status,signed_at,content_sha256,is_demo FROM signatures WHERE id=?", (d["signature_id"],)).fetchone()
        out["signature"] = dict(sig)
        out["confirmation"] = P.MockDeliveryProvider(conn).get_delivery_confirmation(d["id"])
        out["deadlines"] = rows(conn.execute("SELECT title,due_date,status FROM deadlines WHERE case_id=?", (d["case_id"],)))
    return out

def _own(conn, user, did):
    d = conn.execute("SELECT * FROM dispatches WHERE id=? AND user_id=?", (did, user["id"])).fetchone()
    if not d:
        raise HTTPException(404, "Отправление не найдено")
    return dict(d)

@router.get("")
def list_dispatches(user=Depends(current_user), conn=Depends(get_db)):
    prov = P.MockDeliveryProvider(conn)
    out = []
    for d in rows(conn.execute("SELECT id FROM dispatches WHERE user_id=? ORDER BY id DESC", (user["id"],))):
        out.append(_view(conn, prov.get_dispatch_status(d["id"])))
    return out

@router.post("")
def create(body: DispatchIn, user=Depends(current_user), conn=Depends(get_db)):
    v = conn.execute("SELECT v.*,d.case_id,d.user_id FROM document_versions v JOIN documents d ON d.id=v.document_id WHERE v.id=?",
                     (body.document_version_id,)).fetchone()
    if not v or v["user_id"] != user["id"]:
        raise HTTPException(404, "Версия документа не найдена")
    sig = conn.execute("SELECT * FROM signatures WHERE document_version_id=? AND status='signed_demo'", (v["id"],)).fetchone()
    if not sig:
        raise HTTPException(409, "Сначала подпишите именно эту версию документа (демо)")
    try:
        d = P.MockDeliveryProvider(conn).create_dispatch(dict(v), dict(sig), user, v["case_id"], body.recipient_name.strip(), body.recipient_address.strip())
    except P.DispatchError as e:
        raise HTTPException(409, str(e))
    CS.recompute(conn, v["case_id"])
    return _view(conn, d, True)

@router.get("/{did}")
def get(did: int, user=Depends(current_user), conn=Depends(get_db)):
    _own(conn, user, did)
    d = P.MockDeliveryProvider(conn).get_dispatch_status(did)
    CS.recompute(conn, d["case_id"])
    return _view(conn, d, True)

@router.post("/{did}/submit")
def submit(did: int, user=Depends(current_user), conn=Depends(get_db)):
    _own(conn, user, did)
    try:
        d = P.MockDeliveryProvider(conn).submit_dispatch(did)
    except P.DispatchError as e:
        raise HTTPException(409, str(e))
    CS.recompute(conn, d["case_id"])
    return _view(conn, d, True)
