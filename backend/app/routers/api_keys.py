"""Управление API-ключами пользователя (для внешних приложений)."""
from fastapi import APIRouter, Depends, HTTPException
from ..db import get_db, rows
from ..deps import current_user
from ..schemas import ApiKeyIn
from .. import security

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])
MAX_KEYS = 10


@router.get("")
def list_keys(user=Depends(current_user), conn=Depends(get_db)):
    return rows(conn.execute(
        "SELECT id,name,prefix,created_at,last_used_at,revoked_at FROM api_keys WHERE user_id=? ORDER BY id DESC",
        (user["id"],)))


@router.post("", status_code=201)
def create_key(body: ApiKeyIn, user=Depends(current_user), conn=Depends(get_db)):
    active = conn.execute("SELECT COUNT(*) c FROM api_keys WHERE user_id=? AND revoked_at IS NULL", (user["id"],)).fetchone()["c"]
    if active >= MAX_KEYS:
        raise HTTPException(409, f"Уже {MAX_KEYS} активных ключей — отзовите ненужные.")
    raw = security.create_api_key(conn, user["id"], body.name)
    k = conn.execute("SELECT id,name,prefix,created_at FROM api_keys WHERE key_hash=?",
                     (security.hash_api_key(raw),)).fetchone()
    return {**dict(k), "key": raw}


@router.delete("/{kid}")
def revoke_key(kid: int, user=Depends(current_user), conn=Depends(get_db)):
    k = conn.execute("SELECT * FROM api_keys WHERE id=? AND user_id=?", (kid, user["id"])).fetchone()
    if not k:
        raise HTTPException(404, "Ключ не найден")
    if k["revoked_at"]:
        return {"ok": True}
    conn.execute("UPDATE api_keys SET revoked_at=datetime('now') WHERE id=?", (kid,))
    return {"ok": True}
