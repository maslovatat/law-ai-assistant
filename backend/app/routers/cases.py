import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from ..db import get_db, rows
from ..deps import current_user, own_case
from ..schemas import FactIn, VerifyFileIn, CaseStructured
from ..legal import categories as C, research
from .. import cases as CS
from ..files import service as FS, extract as FX, autoapply as FA

router = APIRouter(prefix="/api", tags=["cases"])

@router.get("/cases")
def list_cases(user=Depends(current_user), conn=Depends(get_db)):
    out = []
    for c in rows(conn.execute("SELECT id FROM legal_cases WHERE user_id=? ORDER BY updated_at DESC, id DESC", (user["id"],))):
        s = CS.snapshot(conn, c["id"])
        conv = conn.execute("SELECT id FROM conversations WHERE case_id=?", (c["id"],)).fetchone()
        out.append({"id": s["id"], "title": s["title"], "category_title": s["category_title"], "status": s["status"],
                    "status_label": s["status_label"], "created_at": s["created_at"], "filled": s["filled"],
                    "required_total": s["required_total"], "score": (s["confidence"] or {}).get("score"),
                    "level": (s["confidence"] or {}).get("level"), "documents": len(s["documents"]),
                    "conversation_id": conv["id"] if conv else None})
    return out

@router.get("/cases/{cid}")
def get_case(cid: int, user=Depends(current_user), conn=Depends(get_db)):
    own_case(conn, user, cid)
    snap = CS.snapshot(conn, cid)
    snap["conversation_id"] = (conn.execute("SELECT id FROM conversations WHERE case_id=?", (cid,)).fetchone() or {"id": None})["id"]
    snap["reviews"] = rows(conn.execute("SELECT id,score,level,created_at,document_id FROM legal_reviews WHERE case_id=? ORDER BY id DESC LIMIT 10", (cid,)))
    prof = snap["category"]
    snap["legal_basis"] = [{"id": n["id"], "citation": research.cite(n), "title": n["title"], "source": n["source"],
                            "actual_date": n["actual_date"], "verified": n["verified"], "note": n["note"]}
                           for n in research.for_profile(prof, next((f["value"] for f in snap["facts"] if f["key"] == "requirement"), None))]
    snap["legal_disclaimer"] = research.DISCLAIMER
    return snap

@router.get("/cases/{cid}/structured")
def structured(cid: int, user=Depends(current_user), conn=Depends(get_db)):
    own_case(conn, user, cid)
    return CaseStructured(**CS.structured(CS.snapshot(conn, cid))).model_dump()

@router.put("/cases/{cid}/facts")
def put_fact(cid: int, body: FactIn, user=Depends(current_user), conn=Depends(get_db)):
    own_case(conn, user, cid)
    if body.key not in C.FIELDS:
        raise HTTPException(400, "Неизвестное поле")
    if not body.value.strip():
        CS.clear_fact(conn, cid, body.key)
    elif not CS.set_fact(conn, cid, body.key, body.value, "manual", True):
        if C.normalize(body.key, body.value) is None:
            raise HTTPException(400, f"Не удалось распознать значение для «{C.label(body.key)}»")
    CS.recompute(conn, cid)
    return CS.snapshot(conn, cid)

@router.post("/cases/{cid}/files")
async def upload(cid: int, file: UploadFile = File(...), user=Depends(current_user), conn=Depends(get_db)):
    own_case(conn, user, cid)
    data = await file.read(FS.settings.max_upload_bytes + 1)
    try:
        rec = FS.store_upload(conn, user, cid, file.filename or "file", data)
    except FX.FileRejected as e:
        raise HTTPException(400, str(e))
    a = json.loads(rec["analysis_json"])
    FA.apply_facts(conn, cid, FX.proposals(case["category"], a.get("found", {})))
    CS.recompute(conn, cid)
    return CS.snapshot(conn, cid)

def _own_file(conn, user, fid):
    f = conn.execute("SELECT * FROM uploaded_files WHERE id=? AND user_id=?", (fid, user["id"])).fetchone()
    if not f:
        raise HTTPException(404, "Файл не найден")
    return dict(f)

@router.post("/files/{fid}/verify")
def verify(fid: int, body: VerifyFileIn, user=Depends(current_user), conn=Depends(get_db)):
    f = _own_file(conn, user, fid)
    case = own_case(conn, user, f["case_id"])
    conn.execute("UPDATE uploaded_files SET verified=? WHERE id=?", (int(body.verified), fid))
    a = json.loads(f["analysis_json"] or "{}")
    props = FX.proposals(case["category"], a.get("found", {}))
    for k in body.apply:
        if k in props:
            CS.set_fact(conn, f["case_id"], k, props[k], "file", True)
    CS.recompute(conn, f["case_id"])
    return CS.snapshot(conn, f["case_id"])

@router.get("/files/{fid}/download")
def download(fid: int, user=Depends(current_user), conn=Depends(get_db)):
    f = _own_file(conn, user, fid)
    return FileResponse(f["stored_path"], media_type=f["mime"], filename=f["original_name"])

@router.delete("/files/{fid}")
def delete_file(fid: int, user=Depends(current_user), conn=Depends(get_db)):
    from pathlib import Path
    f = _own_file(conn, user, fid)
    conn.execute("DELETE FROM uploaded_files WHERE id=?", (fid,))
    Path(f["stored_path"]).unlink(missing_ok=True)
    CS.recompute(conn, f["case_id"])
    return CS.snapshot(conn, f["case_id"])
