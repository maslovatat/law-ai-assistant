from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, FileResponse
from ..db import get_db, rows
from ..deps import current_user, own_case, own_document
from ..schemas import VersionIn, DocumentIn, AIEditIn
from ..docs import service as DS, render, builder, ai_review, ai_edit
from ..dispatch import providers as P
from .. import cases as CS

router = APIRouter(prefix="/api", tags=["documents"])

@router.get("/documents")
def list_docs(user=Depends(current_user), conn=Depends(get_db)):
    out = []
    for d in rows(conn.execute("SELECT * FROM documents WHERE user_id=? ORDER BY id DESC", (user["id"],))):
        v = DS.doc_view(conn, d, with_content=False)
        c = conn.execute("SELECT title FROM legal_cases WHERE id=?", (d["case_id"],)).fetchone()
        out.append({k: v[k] for k in ("id", "title", "type_label", "status", "status_label", "latest_version", "created_at", "case_id")} | {"case_title": c["title"]})
    return out

@router.post("/cases/{cid}/documents")
def create_doc(cid: int, body: DocumentIn, user=Depends(current_user), conn=Depends(get_db)):
    case = own_case(conn, user, cid)
    if body.type != "claim":
        raise HTTPException(400, "Поддерживается только досудебная претензия")
    did = DS.create_claim(conn, user, case)
    return DS.doc_view(conn, own_document(conn, user, did))

@router.get("/documents/{did}")
def get_doc(did: int, user=Depends(current_user), conn=Depends(get_db)):
    return DS.doc_view(conn, own_document(conn, user, did))

@router.post("/documents/{did}/versions")
def new_version(did: int, body: VersionIn, user=Depends(current_user), conn=Depends(get_db)):
    DS.add_version(conn, user, own_document(conn, user, did), body.content, body.note)
    return DS.doc_view(conn, own_document(conn, user, did))

def _version(conn, user, did, ver):
    doc = own_document(conn, user, did)
    v = conn.execute("SELECT * FROM document_versions WHERE document_id=? AND version=?", (did, ver)).fetchone()
    if not v:
        raise HTTPException(404, "Версия не найдена")
    return doc, dict(v)

@router.get("/documents/{did}/versions/{ver}/download")
def download(did: int, ver: int, fmt: str = "pdf", user=Depends(current_user), conn=Depends(get_db)):
    doc, v = _version(conn, user, did, ver)
    name = quote(f"{doc['title']} v{ver}.{fmt}")
    try:
        if fmt == "docx":
            data, mt = render.to_docx(v["content"]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif fmt == "pdf":
            data, mt = render.to_pdf(v["content"]), "application/pdf"
        else:
            raise HTTPException(400, "Формат: docx или pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Не удалось сформировать {fmt.upper()}: {type(e).__name__}. Файл не создан.")
    return Response(data, media_type=mt, headers={"Content-Disposition": f"attachment; filename*=UTF-8''{name}"})

# ----- подписание (демо) -----
@router.post("/documents/{did}/versions/{ver}/sign")
def start_sign(did: int, ver: int, user=Depends(current_user), conn=Depends(get_db)):
    doc, v = _version(conn, user, did, ver)
    if DS.latest_version(conn, did)["version"] != ver:
        raise HTTPException(409, "Подписать можно только последнюю версию документа")
    rev = builder.review(v["content"])
    if not rev["ok"]:
        raise HTTPException(409, "Нельзя перейти к подписанию: " + "; ".join(rev["issues"]))
    return P.MockSignatureProvider(conn).create_signing_request(v, user)

def _own_sig(conn, user, sid):
    s = conn.execute("SELECT s.* FROM signatures s WHERE s.id=? AND s.user_id=?", (sid, user["id"])).fetchone()
    if not s:
        raise HTTPException(404, "Запрос на подписание не найден")
    return dict(s)

@router.get("/signatures/{sid}")
def get_sig(sid: int, user=Depends(current_user), conn=Depends(get_db)):
    s = _own_sig(conn, user, sid)
    v = dict(conn.execute("SELECT * FROM document_versions WHERE id=?", (s["document_version_id"],)).fetchone())
    doc = dict(conn.execute("SELECT * FROM documents WHERE id=?", (v["document_id"],)).fetchone())
    s["status_label"] = P.SIGN_LABELS.get(s["status"], s["status"])
    s["notice"] = P.DEMO_SIGN_NOTICE
    s["document"] = {"id": doc["id"], "title": doc["title"], "version": v["version"], "content": v["content"], "case_id": doc["case_id"]}
    s["verification"] = P.MockSignatureProvider(conn).verify_signature(sid)
    return s

@router.post("/signatures/{sid}/confirm")
def confirm_sig(sid: int, user=Depends(current_user), conn=Depends(get_db)):
    _own_sig(conn, user, sid)
    try:
        s = P.MockSignatureProvider(conn).confirm(sid, user)
    except P.DispatchError as e:
        raise HTTPException(409, str(e))
    v = conn.execute("SELECT d.case_id FROM document_versions v JOIN documents d ON d.id=v.document_id WHERE v.id=?", (s["document_version_id"],)).fetchone()
    CS.recompute(conn, v["case_id"])
    return get_sig(sid, user, conn)

@router.get("/signatures/{sid}/download")
def sig_download(sid: int, user=Depends(current_user), conn=Depends(get_db)):
    _own_sig(conn, user, sid)
    try:
        path = P.MockSignatureProvider(conn).get_signed_document(sid)
    except P.DispatchError as e:
        raise HTTPException(404, str(e))
    return FileResponse(path, media_type="application/pdf", filename=f"demo_signed_{sid}.pdf")


@router.post("/documents/{did}/versions/{ver}/ai-review")
def review_doc(did: int, ver: int, user=Depends(current_user), conn=Depends(get_db)):
    doc, v = _version(conn, user, did, ver)
    case = own_case(conn, user, doc["case_id"])
    return ai_review.run(conn, case, CS.get_facts(conn, case["id"]), v["content"])


@router.post("/documents/{did}/versions/{ver}/ai-edit")
def ai_edit_doc(did: int, ver: int, body: AIEditIn, user=Depends(current_user), conn=Depends(get_db)):
    """Переработка текста моделью с сохранением новой версии."""
    doc, v = _version(conn, user, did, ver)
    if DS.latest_version(conn, did)["version"] != ver:
        raise HTTPException(409, "Переработать можно только последнюю версию документа")
    if v["is_signed"]:
        raise HTTPException(409, "Версия подписана — сначала создайте новую версию вручную")
    case = own_case(conn, user, doc["case_id"])
    res = ai_edit.run(conn, case, CS.get_facts(conn, case["id"]), v["content"], body.instruction)
    if not res["ok"]:
        raise HTTPException(409, res["message"])
    try:
        DS.add_version(conn, user, doc, res["content"], "Переработано ИИ" + (f": {body.instruction[:120]}" if body.instruction else ""))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Не удалось сохранить версию: {type(e).__name__}")
    return DS.doc_view(conn, own_document(conn, user, did))
