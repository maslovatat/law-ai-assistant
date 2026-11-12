"""Публичный API для внешних приложений.

Авторизация — ключ в заголовке `X-API-Key` (или `Authorization: Bearer ak_…`),
ключи создаются в интерфейсе: Настройки → API-доступ. Лимит 120 запросов в минуту на ключ.
"""
import json
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from ..db import get_db, now, rows
from ..deps import api_user, own_case, own_document
from ..schemas import ApiCaseIn, ApiMessageIn, ApiDocIn
from ..ai import orchestrator
from .. import cases as CS
from ..docs import service as DS
from ..files import service as FS, extract as FX, autoapply as FA

router = APIRouter(prefix="/api/v1", tags=["public-api"])


def _conversation(conn, user, case: dict) -> dict:
    r = conn.execute("SELECT * FROM conversations WHERE case_id=? ORDER BY id LIMIT 1", (case["id"],)).fetchone()
    if r:
        return dict(r)
    ts = now()
    cid = conn.execute("INSERT INTO conversations(user_id,case_id,title,created_at,updated_at) VALUES(?,?,?,?,?)",
                       (user["id"], case["id"], case["title"], ts, ts)).lastrowid
    return dict(conn.execute("SELECT * FROM conversations WHERE id=?", (cid,)).fetchone())


def _case_payload(conn, case_id: int) -> dict:
    snap = CS.snapshot(conn, case_id)
    conv = conn.execute("SELECT id FROM conversations WHERE case_id=?", (case_id,)).fetchone()
    snap["conversation_id"] = conv["id"] if conv else None
    return snap


@router.get("/me", summary="Профиль и лимиты")
def me(user=Depends(api_user), conn=Depends(get_db)):
    cases = conn.execute("SELECT COUNT(*) c FROM legal_cases WHERE user_id=?", (user["id"],)).fetchone()["c"]
    keys = conn.execute("SELECT COUNT(*) c FROM api_keys WHERE user_id=? AND revoked_at IS NULL", (user["id"],)).fetchone()["c"]
    return {"user": {k: user[k] for k in ("id", "name", "email")}, "cases": cases, "active_keys": keys,
            "rate_limit": "120 запросов в минуту на ключ"}


@router.get("/cases", summary="Список дел")
def list_cases(user=Depends(api_user), conn=Depends(get_db)):
    out = []
    for r in rows(conn.execute("SELECT id FROM legal_cases WHERE user_id=? ORDER BY updated_at DESC, id DESC", (user["id"],))):
        s = CS.snapshot(conn, r["id"])
        out.append({"id": s["id"], "title": s["title"], "category": s["category"], "category_title": s["category_title"],
                    "status": s["status"], "ready": s["ready"], "filled": s["filled"], "required_total": s["required_total"],
                    "score": (s["confidence"] or {}).get("score"), "created_at": s["created_at"],
                    "updated_at": conn.execute("SELECT updated_at FROM legal_cases WHERE id=?", (s["id"],)).fetchone()["updated_at"]})
    return out


@router.post("/cases", status_code=201, summary="Создать дело")
def create_case(body: ApiCaseIn, user=Depends(api_user), conn=Depends(get_db)):
    ts, title = now(), (body.title or "").strip()[:120] or "Новое обращение"
    case_id = conn.execute("INSERT INTO legal_cases(user_id,title,created_at,updated_at) VALUES(?,?,?,?)",
                           (user["id"], title, ts, ts)).lastrowid
    case = dict(conn.execute("SELECT * FROM legal_cases WHERE id=?", (case_id,)).fetchone())
    _conversation(conn, user, case)
    CS.recompute(conn, case_id)
    return _case_payload(conn, case_id)


@router.get("/cases/{cid}", summary="Дело с фактами и оценкой")
def get_case(cid: int, user=Depends(api_user), conn=Depends(get_db)):
    own_case(conn, user, cid)
    return _case_payload(conn, cid)


@router.post("/cases/{cid}/messages", summary="Отправить сообщение помощнику")
def send_message(cid: int, body: ApiMessageIn, user=Depends(api_user), conn=Depends(get_db)):
    case = own_case(conn, user, cid)
    conv = _conversation(conn, user, case)
    try:
        orchestrator.handle_message(conn, user, conv, body.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Ошибка обработки сообщения: {type(e).__name__}")
    last = conn.execute("SELECT content,meta_json FROM messages WHERE conversation_id=? AND role='assistant' "
                        "ORDER BY id DESC LIMIT 1", (conv["id"],)).fetchone()
    meta = json.loads(last["meta_json"]) if last and last["meta_json"] else {}
    return {"reply": last["content"] if last else "", "provider": meta.get("provider"), "notice": meta.get("notice"),
            "conversation_id": conv["id"], "case": _case_payload(conn, cid)}


@router.post("/cases/{cid}/files", summary="Загрузить документ (чек, договор, фото)")
async def upload_file(cid: int, file: UploadFile = File(...), user=Depends(api_user), conn=Depends(get_db)):
    case = own_case(conn, user, cid)
    data = await file.read(FS.settings.max_upload_bytes + 1)
    try:
        rec = FS.store_upload(conn, user, cid, file.filename or "file", data)
    except FX.FileRejected as e:
        raise HTTPException(400, str(e))
    analysis = json.loads(rec["analysis_json"] or "{}")
    applied = FA.apply_facts(conn, cid, FX.proposals(case["category"], analysis.get("found", {})))
    try:
        applied.update(orchestrator.extract_from_files(conn, case, [rec]))
    except Exception:
        pass
    CS.recompute(conn, cid)
    return {"file": CS.file_view(rec, case["category"]), "applied": applied, "case": _case_payload(conn, cid)}


@router.post("/cases/{cid}/documents", status_code=201, summary="Составить претензию")
def create_document(cid: int, body: ApiDocIn, user=Depends(api_user), conn=Depends(get_db)):
    case = own_case(conn, user, cid)
    if body.type != "claim":
        raise HTTPException(400, "Поддерживается только type=claim (досудебная претензия)")
    did = DS.create_claim(conn, user, case)
    return DS.doc_view(conn, own_document(conn, user, did))


@router.get("/documents/{did}", summary="Документ и его версии")
def get_document(did: int, user=Depends(api_user), conn=Depends(get_db)):
    return DS.doc_view(conn, own_document(conn, user, did))
