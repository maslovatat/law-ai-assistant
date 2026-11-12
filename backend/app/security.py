import hashlib, hmac, os, secrets
from datetime import datetime, timedelta, timezone
from .config import settings
from .db import now

_ITER = 200_000

def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, _ITER)
    return f"pbkdf2${_ITER}${salt.hex()}${dk.hex()}"

def verify_password(pw: str, stored: str) -> bool:
    try:
        _, it, salt, dk = stored.split("$")
        calc = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), int(it))
        return hmac.compare_digest(calc.hex(), dk)
    except Exception:
        return False

def _h(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def create_session(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    exp = (datetime.now(timezone.utc) + timedelta(days=settings.session_days)).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("INSERT INTO sessions VALUES(?,?,?,?)", (_h(token), user_id, now(), exp))
    return token

def user_by_token(conn, token: str):
    r = conn.execute(
        "SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id "
        "WHERE s.token_hash=? AND s.expires_at>?", (_h(token), now())).fetchone()
    return dict(r) if r else None

def drop_session(conn, token: str):
    conn.execute("DELETE FROM sessions WHERE token_hash=?", (_h(token),))

API_PREFIX = "ak_"

def hash_api_key(raw: str) -> str:
    return _h(raw)

def create_api_key(conn, user_id: int, name: str) -> str:
    """Возвращает ключ в открытом виде — сохраняется только его хеш."""
    raw = API_PREFIX + secrets.token_urlsafe(24)
    conn.execute("INSERT INTO api_keys(user_id,name,prefix,key_hash,created_at) VALUES(?,?,?,?,?)",
                 (user_id, name.strip() or "API-ключ", raw[:11], hash_api_key(raw), now()))
    return raw

def user_by_api_key(conn, raw: str):
    r = conn.execute(
        "SELECT k.id AS key_id, u.id, u.email, u.name FROM api_keys k JOIN users u ON u.id=k.user_id "
        "WHERE k.key_hash=? AND k.revoked_at IS NULL", (hash_api_key(raw),)).fetchone()
    if not r:
        return None
    conn.execute("UPDATE api_keys SET last_used_at=? WHERE id=?", (now(), r["key_id"]))
    return {"id": r["id"], "email": r["email"], "name": r["name"], "_key_id": r["key_id"]}
