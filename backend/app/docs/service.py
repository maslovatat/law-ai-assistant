"""Document Manager: создание, версии, статус проверки."""
import json
from fastapi import HTTPException
from ..db import now, rows
from .. import cases as CS
from ..legal import confidence as CF
from . import builder

TYPE_TITLES = {"claim": "Досудебная претензия"}
STATUS = {"draft": "Черновик", "needs_work": "Требует доработки", "ready": "Готов к подписанию",
          "pending_sign": "Ожидает подписания (демо)", "signed": "Подписан (демо)", "sent": "Отправлен (демо)", "delivered": "Доставлен (демо)"}

def create_claim(conn, user, case: dict) -> int:
    if not case["category"]:
        raise HTTPException(409, "Категория дела не определена: опишите ситуацию в чате.")
    ev = CS.recompute(conn, case["id"])
    if ev["level"] == "lawyer":
        why = "; ".join(ev["critical"]) or f"недостаточно данных (оценка {ev['score']}/100, порог 65)"
        raise HTTPException(409, f"Дело нужно передать юристу: {why}. Автоматическая подготовка документа остановлена.")
    facts = CS.get_facts(conn, case["id"])
    content = builder.build_claim(case, facts, CS.files_of(conn, case["id"]))
    title = f"Досудебная претензия — {case['title']}"[:150]
    try:
        conn.execute("BEGIN")
        cur = conn.execute("INSERT INTO documents(case_id,user_id,type,title,created_at) VALUES(?,?,?,?,?)",
                           (case["id"], user["id"], "claim", title, now()))
        did = cur.lastrowid
        conn.execute("INSERT INTO document_versions(document_id,version,content,note,created_by,created_at) VALUES(?,?,?,?,?,?)",
                     (did, 1, content, "Создано автоматически из фактов дела", "system", now()))
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK"); raise
    CS.recompute(conn, case["id"], save_review=True, document_id=did)
    return did

def latest_version(conn, doc_id: int) -> dict:
    return dict(conn.execute("SELECT * FROM document_versions WHERE document_id=? ORDER BY version DESC LIMIT 1", (doc_id,)).fetchone())

def add_version(conn, user, doc: dict, content: str, note: str | None) -> dict:
    content = content.replace("\r\n", "\n").strip() + "\n"
    last = latest_version(conn, doc["id"])
    if content == last["content"]:
        raise HTTPException(409, "Текст не изменился — новая версия не создана.")
    try:
        conn.execute("BEGIN")
        conn.execute("INSERT INTO document_versions(document_id,version,content,note,created_by,created_at) VALUES(?,?,?,?,?,?)",
                     (doc["id"], last["version"] + 1, content, note or "Ручное редактирование", "user", now()))
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK"); raise
    CS.recompute(conn, doc["case_id"])
    return latest_version(conn, doc["id"])

def version_state(conn, v: dict) -> dict:
    sig = conn.execute("SELECT * FROM signatures WHERE document_version_id=? AND status IN ('pending','signed_demo') ", (v["id"],)).fetchone()
    disp = conn.execute("SELECT * FROM dispatches WHERE document_version_id=?", (v["id"],)).fetchone()
    rev = builder.review(v["content"])
    if disp:
        st = "delivered" if disp["status"] == "delivered" else "sent"
    elif sig and sig["status"] == "signed_demo":
        st = "signed"
    elif sig:
        st = "pending_sign"
    else:
        st = "ready" if rev["ok"] else "needs_work"
    return {"id": v["id"], "version": v["version"], "created_at": v["created_at"], "note": v["note"], "created_by": v["created_by"],
            "is_signed": bool(v["is_signed"]), "status": st, "status_label": STATUS[st], "review": rev,
            "signature_id": sig["id"] if sig else None, "signature_status": sig["status"] if sig else None,
            "dispatch_id": disp["id"] if disp else None}

def doc_view(conn, doc: dict, with_content: bool = True) -> dict:
    vs = rows(conn.execute("SELECT * FROM document_versions WHERE document_id=? ORDER BY version DESC", (doc["id"],)))
    states = [version_state(conn, v) for v in vs]
    out = {"id": doc["id"], "case_id": doc["case_id"], "type": doc["type"], "type_label": TYPE_TITLES.get(doc["type"], doc["type"]),
           "title": doc["title"], "created_at": doc["created_at"], "status": states[0]["status"], "status_label": states[0]["status_label"],
           "latest_version": states[0]["version"], "versions": states}
    if with_content:
        out["content"] = vs[0]["content"]
        for s, v in zip(out["versions"], vs):
            s["content"] = v["content"]
        case = dict(conn.execute("SELECT * FROM legal_cases WHERE id=?", (doc["case_id"],)).fetchone())
        out["case_title"] = case["title"]
        out["confidence"] = json.loads(case["confidence_json"]) if case["confidence_json"] else None
        facts = CS.get_facts(conn, case["id"])
        from ..legal import categories as C
        p = C.PROFILES.get(case["category"] or "")
        if p:
            n, a = p["recipient"]
            out["recipient_suggestion"] = {"name": facts.get(n) if facts.get(n) != C.UNKNOWN else "",
                                           "address": facts.get(a, "") if facts.get(a) != C.UNKNOWN else ""}
    return out
