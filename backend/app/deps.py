import time
from fastapi import Depends, Header, HTTPException
from .db import get_db
from .security import user_by_token, user_by_api_key

_RATE: dict[int, list[float]] = {}
RATE_LIMIT, RATE_WINDOW = 120, 60

def current_user(authorization: str = Header(default=""), conn=Depends(get_db)):
    token = authorization.removeprefix("Bearer ").strip()
    user = user_by_token(conn, token) if token else None
    if not user:
        raise HTTPException(401, "Требуется вход в систему")
    user["_token"] = token
    return user

def _throttle(key_id: int):
    t = time.time()
    hits = [h for h in _RATE.get(key_id, []) if t - h < RATE_WINDOW]
    if len(hits) >= RATE_LIMIT:
        raise HTTPException(429, f"Слишком много запросов: не более {RATE_LIMIT} в минуту на ключ")
    hits.append(t)
    _RATE[key_id] = hits

def api_user(x_api_key: str = Header(default=""), authorization: str = Header(default=""), conn=Depends(get_db)):
    """Публичный API: ключ в X-API-Key или Authorization: Bearer ak_…"""
    raw = (x_api_key or "").strip()
    if not raw and (authorization or "").lower().startswith("bearer "):
        raw = authorization[7:].strip()
    if not raw:
        raise HTTPException(401, "Нужен API-ключ: передайте его в заголовке X-API-Key")
    user = user_by_api_key(conn, raw)
    if not user:
        raise HTTPException(401, "API-ключ недействителен или отозван")
    _throttle(user["_key_id"])
    return user

def own_case(conn, user, case_id: int):
    r = conn.execute("SELECT * FROM legal_cases WHERE id=? AND user_id=?", (case_id, user["id"])).fetchone()
    if not r:
        raise HTTPException(404, "Дело не найдено")
    return dict(r)

def own_conversation(conn, user, cid: int):
    r = conn.execute("SELECT * FROM conversations WHERE id=? AND user_id=?", (cid, user["id"])).fetchone()
    if not r:
        raise HTTPException(404, "Диалог не найден")
    return dict(r)

def own_document(conn, user, did: int):
    r = conn.execute("SELECT * FROM documents WHERE id=? AND user_id=?", (did, user["id"])).fetchone()
    if not r:
        raise HTTPException(404, "Документ не найден")
    return dict(r)
