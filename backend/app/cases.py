"""Legal Case Manager: факты дела, хронология, статус, оценка качества."""
import json
from .db import now, rows
from .legal import categories as C, confidence as CF
from .files import extract as FX

STATUS_LABELS = {
    "intake": "Сбор сведений", "ready": "Готово к подготовке документа", "document": "Документ подготовлен",
    "signed": "Документ подписан (демо)", "sent": "Отправлено (демо)", "delivered": "Доставлено (демо)",
    "lawyer": "Требуется юрист",
}

def get_facts(conn, case_id: int) -> dict[str, str]:
    return {r["key"]: r["value"] for r in conn.execute("SELECT key,value FROM case_facts WHERE case_id=?", (case_id,))}

def facts_detail(conn, case_id: int, profile: str | None):
    data = {r["key"]: dict(r) for r in conn.execute("SELECT * FROM case_facts WHERE case_id=?", (case_id,))}
    keys = list(dict.fromkeys(C.required_fields(profile) + (C.OPTIONAL if profile else []) + list(data)))
    out = []
    for k in keys:
        r = data.get(k)
        out.append({"key": k, "label": C.label(k), "required": k in C.required_fields(profile),
                    "value": r["value"] if r else None,
                    "display": C.fmt_value(k, r["value"]) if r else None,
                    "source": r["source"] if r else None, "confirmed": bool(r["confirmed"]) if r else False,
                    "kind": C.FIELDS.get(k, ("", "", "text"))[2]})
    return out

def set_fact(conn, case_id: int, key: str, value: str, source: str, confirmed: bool = False) -> bool:
    """Записывает факт. ИИ ('ai') не может перезаписывать сведения пользователя/файлов."""
    if key not in C.FIELDS:
        return False
    norm = C.normalize(key, value)
    if norm is None:
        return False
    cur = conn.execute("SELECT source,value FROM case_facts WHERE case_id=? AND key=?", (case_id, key)).fetchone()
    if cur and source == "ai" and cur["source"] != "ai":
        return False
    if cur and cur["value"] == norm and cur["source"] == source:
        return False
    conn.execute(
        "INSERT INTO case_facts(case_id,key,value,source,confirmed,updated_at) VALUES(?,?,?,?,?,?) "
        "ON CONFLICT(case_id,key) DO UPDATE SET value=excluded.value,source=excluded.source,"
        "confirmed=excluded.confirmed,updated_at=excluded.updated_at",
        (case_id, key, norm, source, int(confirmed), now()))
    return True

def clear_fact(conn, case_id: int, key: str):
    conn.execute("DELETE FROM case_facts WHERE case_id=? AND key=?", (case_id, key))

def files_of(conn, case_id: int) -> list[dict]:
    return rows(conn.execute("SELECT * FROM uploaded_files WHERE case_id=? ORDER BY id", (case_id,)))

def timeline(profile: str | None, facts: dict[str, str]) -> list[dict]:
    ev = []
    for k, f in C.FIELDS.items():
        if f[2] == "date" and facts.get(k) and facts[k] != C.UNKNOWN:
            ev.append({"date": facts[k], "event": f[0]})
    return sorted(ev, key=lambda e: e["date"])

def participants(facts: dict[str, str]) -> list[dict]:
    spec = [("applicant_name", "Заявитель"), ("seller_name", "Продавец"), ("contractor_name", "Исполнитель"),
            ("counterpart_name", "Другая сторона")]
    return [{"role": r, "name": facts[k]} for k, r in spec if facts.get(k) and facts[k] != C.UNKNOWN]

def required_docs(profile: str | None, files: list[dict]) -> list[dict]:
    prof = C.PROFILES.get(profile or "")
    if not prof:
        return []
    have = {f["doc_type"] for f in files}
    return [{"kind": k, "label": lbl, "present": (k in have) or (k == "any" and bool(files))} for k, lbl in prof["evidence"]]

def contradictions(conn, case) -> list[dict]:
    return FX.find_contradictions(case["category"], get_facts(conn, case["id"]), files_of(conn, case["id"]))

def derive_status(conn, case) -> str:
    cid = case["id"]
    d = conn.execute("SELECT status FROM dispatches WHERE case_id=? ORDER BY id DESC LIMIT 1", (cid,)).fetchone()
    if d:
        return "delivered" if d["status"] == "delivered" else "sent"
    s = conn.execute("SELECT 1 FROM signatures sg JOIN document_versions v ON v.id=sg.document_version_id "
                     "JOIN documents d ON d.id=v.document_id WHERE d.case_id=? AND sg.status='signed_demo' LIMIT 1", (cid,)).fetchone()
    if s:
        return "signed"
    if conn.execute("SELECT 1 FROM documents WHERE case_id=? LIMIT 1", (cid,)).fetchone():
        return "document"
    facts = get_facts(conn, cid)
    if case["category"] and not C.missing_fields(case["category"], facts):
        return "ready"
    return "intake"

def recompute(conn, case_id: int, save_review: bool = False, document_id: int | None = None) -> dict:
    case = dict(conn.execute("SELECT * FROM legal_cases WHERE id=?", (case_id,)).fetchone())
    facts = get_facts(conn, case_id)
    files = files_of(conn, case_id)
    contr = FX.find_contradictions(case["category"], facts, files)
    ev = CF.evaluate(case["category"], facts, files, contr, case["description"])
    status = derive_status(conn, case)
    conn.execute("UPDATE legal_cases SET confidence_json=?, status=?, updated_at=? WHERE id=?",
                 (json.dumps(ev, ensure_ascii=False), status, now(), case_id))
    if save_review:
        conn.execute("INSERT INTO legal_reviews(case_id,document_id,score,level,details_json,critical_json,created_at) VALUES(?,?,?,?,?,?,?)",
                     (case_id, document_id, ev["score"], ev["level"], json.dumps(ev["details"], ensure_ascii=False),
                      json.dumps(ev["critical"], ensure_ascii=False), now()))
    return ev

def set_category(conn, case_id: int, profile: str):
    conn.execute("UPDATE legal_cases SET category=?, updated_at=? WHERE id=?", (profile, now(), case_id))

def auto_title(conn, case_id: int):
    case = dict(conn.execute("SELECT * FROM legal_cases WHERE id=?", (case_id,)).fetchone())
    if not case["category"] or not case["title"].startswith("Новое обращение"):
        return
    facts = get_facts(conn, case_id)
    detail = facts.get("product") or facts.get("service") or facts.get("damage_description") or ""
    t = C.PROFILES[case["category"]]["title"].split(": ")[-1]
    t = f"{t}: {detail[:40]}" if detail and detail != C.UNKNOWN else C.PROFILES[case["category"]]["title"]
    conn.execute("UPDATE legal_cases SET title=? WHERE id=?", (t, case_id))
    conn.execute("UPDATE conversations SET title=? WHERE case_id=? AND title LIKE 'Новое обращение%'", (t, case_id))

def snapshot(conn, case_id: int) -> dict:
    case = dict(conn.execute("SELECT * FROM legal_cases WHERE id=?", (case_id,)).fetchone())
    facts = get_facts(conn, case_id)
    files = files_of(conn, case_id)
    prof = case["category"]
    ev = json.loads(case["confidence_json"]) if case["confidence_json"] else None
    missing = C.missing_fields(prof, facts)
    contr = FX.find_contradictions(prof, facts, files)
    docs = rows(conn.execute("SELECT id,type,title,created_at FROM documents WHERE case_id=? ORDER BY id", (case_id,)))
    dl = rows(conn.execute("SELECT title,due_date,status FROM deadlines WHERE case_id=? ORDER BY due_date", (case_id,)))
    return {
        "id": case_id, "title": case["title"], "category": prof,
        "category_title": C.PROFILES[prof]["title"] if prof in C.PROFILES else "Не определена",
        "description": case["description"], "status": case["status"], "status_label": STATUS_LABELS.get(case["status"], case["status"]),
        "created_at": case["created_at"], "facts": facts_detail(conn, case_id, prof),
        "missing_information": [C.label(k) for k in missing], "missing_keys": missing,
        "unknown_information": [C.label(k) for k in C.unknown_fields(prof, facts)],
        "required_total": len(C.required_fields(prof)), "filled": len(C.required_fields(prof)) - len(missing),
        "participants": participants(facts), "timeline": timeline(prof, facts),
        "required_documents": required_docs(prof, files), "contradictions": contr,
        "files": [file_view(f, prof) for f in files], "documents": docs, "deadlines": dl,
        "confidence": ev, "ready": bool(prof) and not missing,
    }

def file_view(f: dict, profile: str | None) -> dict:
    a = json.loads(f["analysis_json"]) if f.get("analysis_json") else {}
    return {"id": f["id"], "name": f["original_name"], "mime": f["mime"], "size": f["size"], "doc_type": f["doc_type"],
            "doc_type_label": C.DOC_TYPE_LABELS.get(f["doc_type"], f["doc_type"]), "verified": bool(f["verified"]),
            "summary": a.get("summary", ""), "warning": a.get("warning", ""), "note": a.get("note", ""),
            "proposals": [{"key": k, "label": C.label(k), "value": v, "display": C.fmt_value(k, v)}
                          for k, v in FX.proposals(profile, a.get("found", {})).items()],
            "text_preview": (f.get("extracted_text") or "")[:4000], "created_at": f["created_at"]}

def structured(snap: dict) -> dict:
    """Структура в формате ТЗ (валидируется Pydantic в schemas.CaseStructured)."""
    f = {x["key"]: x["value"] for x in snap["facts"] if x["value"] and x["value"] != C.UNKNOWN}
    return {"category": snap["category"], "problem": snap["title"], "facts": f,
            "requirements": [f["requirement"]] if f.get("requirement") else [],
            "missing_information": snap["missing_information"]}
