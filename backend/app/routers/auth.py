import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from ..db import get_db, now
from ..deps import current_user
from ..schemas import RegisterIn, LoginIn
from .. import security

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
def register(body: RegisterIn, conn=Depends(get_db)):
    try:
        cur = conn.execute("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)",
                           (body.email.lower().strip(), body.name.strip(), security.hash_password(body.password), now()))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Пользователь с таким e-mail уже существует")
    return {"token": security.create_session(conn, cur.lastrowid), "user": {"id": cur.lastrowid, "name": body.name.strip(), "email": body.email.lower()}}

@router.post("/login")
def login(body: LoginIn, conn=Depends(get_db)):
    u = conn.execute("SELECT * FROM users WHERE email=?", (body.email.lower().strip(),)).fetchone()
    if not u or not security.verify_password(body.password, u["password_hash"]):
        raise HTTPException(401, "Неверный e-mail или пароль")
    return {"token": security.create_session(conn, u["id"]), "user": {"id": u["id"], "name": u["name"], "email": u["email"]}}

@router.post("/logout")
def logout(user=Depends(current_user), conn=Depends(get_db)):
    security.drop_session(conn, user["_token"])
    return {"ok": True}

@router.get("/me")
def me(user=Depends(current_user)):
    return {k: user[k] for k in ("id", "name", "email")}
