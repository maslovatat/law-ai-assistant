from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from ..db import get_db, now, rows
from ..deps import current_user, own_conversation
from ..schemas import ConversationIn, RenameIn, MessageIn
from ..ai import orchestrator
from .. import cases as CS
from ..files import service as FS, extract as FX, autoapply as FA
from ..legal import categories as C
from .. import cases as CS
import json

router = APIRouter(prefix="/api/conversations", tags=["chat"])

GREETING = ("Здравствуйте! Я ИИ-помощник по бытовым юридическим вопросам. Опишите вашу ситуацию обычными словами — "
            "я уточню детали, помогу собрать документы и подготовить претензию. Я не заменяю юриста.")

def _msgs(conn, cid):
    out = rows(conn.execute("SELECT id,role,content,meta_json,created_at FROM messages WHERE conversation_id=? ORDER BY id", (cid,)))
    for m in out:
        m["meta"] = json.loads(m.pop("meta_json")) if m["meta_json"] else {}
    return out

def _payload(conn, conv):
    return {"conversation": {k: conv[k] for k in ("id", "title", "case_id", "created_at", "updated_at")},
            "messages": _msgs(conn, conv["id"]), "case": CS.snapshot(conn, conv["case_id"]) if conv["case_id"] else None}

@router.get("")
def list_conv(user=Depends(current_user), conn=Depends(get_db)):
    return rows(conn.execute(
        "SELECT c.id,c.title,c.case_id,c.updated_at,l.status FROM conversations c LEFT JOIN legal_cases l ON l.id=c.case_id "
        "WHERE c.user_id=? ORDER BY c.updated_at DESC, c.id DESC", (user["id"],)))

@router.post("")
def create(body: ConversationIn, user=Depends(current_user), conn=Depends(get_db)):
    title = (body.title or "").strip() or "Новое обращение"
    ts = now()
    try:
        conn.execute("BEGIN")
        case_id = conn.execute("INSERT INTO legal_cases(user_id,title,created_at,updated_at) VALUES(?,?,?,?)", (user["id"], title, ts, ts)).lastrowid
        cid = conn.execute("INSERT INTO conversations(user_id,case_id,title,created_at,updated_at) VALUES(?,?,?,?,?)",
                           (user["id"], case_id, title, ts, ts)).lastrowid
        conn.execute("INSERT INTO messages(conversation_id,role,content,created_at) VALUES(?,?,?,?)", (cid, "assistant", GREETING, ts))
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK"); raise
    CS.recompute(conn, case_id)
    return _payload(conn, own_conversation(conn, user, cid))

@router.get("/{cid}")
def get(cid: int, user=Depends(current_user), conn=Depends(get_db)):
    return _payload(conn, own_conversation(conn, user, cid))

@router.patch("/{cid}")
def rename(cid: int, body: RenameIn, user=Depends(current_user), conn=Depends(get_db)):
    conv = own_conversation(conn, user, cid)
    conn.execute("UPDATE conversations SET title=? WHERE id=?", (body.title.strip(), cid))
    if conv["case_id"]:
        conn.execute("UPDATE legal_cases SET title=? WHERE id=?", (body.title.strip(), conv["case_id"]))
    return {"ok": True}

@router.delete("/{cid}")
def delete(cid: int, user=Depends(current_user), conn=Depends(get_db)):
    own_conversation(conn, user, cid)
    conn.execute("DELETE FROM conversations WHERE id=?", (cid,))   # дело и документы сохраняются
    return {"ok": True}

@router.post("/{cid}/messages")
def send(cid: int, body: MessageIn, user=Depends(current_user), conn=Depends(get_db)):
    conv = own_conversation(conn, user, cid)
    if not conv["case_id"]:
        raise HTTPException(409, "У диалога нет связанного дела")
    try:
        orchestrator.handle_message(conn, user, conv, body.content)
    except HTTPException:
        raise
    except Exception as e:  # сообщение пользователя уже сохранено — история не теряется
        raise HTTPException(500, f"Ошибка обработки сообщения: {type(e).__name__}. Сообщение сохранено, попробуйте ещё раз.")
    return _payload(conn, conv)

@router.post("/{cid}/files")
async def upload(cid: int, file: UploadFile = File(...), user=Depends(current_user), conn=Depends(get_db)):
    conv = own_conversation(conn, user, cid)
    data = await file.read(FS.settings.max_upload_bytes + 1)
    try:
        rec = FS.store_upload(conn, user, conv["case_id"], file.filename or "file", data)
    except FX.FileRejected as e:
        raise HTTPException(400, str(e))
    a = json.loads(rec["analysis_json"])
    case = dict(conn.execute("SELECT * FROM legal_cases WHERE id=?", (conv["case_id"],)).fetchone())
    applied = FA.apply_facts(conn, conv["case_id"], FX.proposals(case["category"], a.get("found", {})))
    try:
        applied.update(orchestrator.extract_from_files(conn, case, [rec]))
    except Exception:
        pass
    CS.recompute(conn, conv["case_id"])
    text = f"📎 Загружен файл «{rec['original_name']}». {a['summary']}"
    if a.get("note"):
        text += f"\n⚠ {a['note']}"
    if applied:
        text += "\n\nЗаписал в карточку дела: " + "; ".join(f"{C.label(k)} — {C.fmt_value(k, v)}" for k, v in applied.items()) + "."
    else:
        text += "\n\nНовых сведений для карточки дела не нашёл."
    text += " Проверьте данные в карточке дела: распознавание может ошибаться."
    conn.execute("INSERT INTO messages(conversation_id,role,content,created_at) VALUES(?,?,?,?)", (cid, "assistant", text, now()))
    conn.execute("UPDATE conversations SET updated_at=? WHERE id=?", (now(), cid))
    return _payload(conn, conv)
