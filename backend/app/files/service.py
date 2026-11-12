import hashlib, json, secrets
from pathlib import Path
from ..config import settings
from ..db import now
from .. import cases as CS
from . import extract as FX

def store_upload(conn, user: dict, case_id: int, name: str, data: bytes) -> dict:
    """Проверяет, сохраняет на диск (вне публичных URL), извлекает текст, анализирует. Бросает FileRejected."""
    ext, mime = FX.validate(name, data)
    safe = "".join(c for c in Path(name).stem if c.isalnum() or c in "-_ .")[:60] or "file"
    folder = settings.storage / "uploads" / str(user["id"])
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{secrets.token_hex(8)}{ext}"
    path.write_bytes(data)
    text, note = FX.extract_text(path, ext)
    a = FX.analyze(text, name, ext)
    a["note"] = note
    cur = conn.execute(
        "INSERT INTO uploaded_files(case_id,user_id,original_name,stored_path,mime,size,sha256,doc_type,extracted_text,analysis_json,verified,created_at) "
        "VALUES(?,?,?,?,?,?,?,?,?,?,0,?)",
        (case_id, user["id"], f"{safe}{ext}", str(path), mime, len(data), hashlib.sha256(data).hexdigest(), a["doc_type"],
         text[:20000], json.dumps(a, ensure_ascii=False), now()))
    CS.recompute(conn, case_id)
    return dict(conn.execute("SELECT * FROM uploaded_files WHERE id=?", (cur.lastrowid,)).fetchone())
