"""Обработка сообщения пользователя: правила извлечения + ОДИН запрос к ИИ на сообщение.

Порядок: код забирает из сообщения всё, что пользователь написал явно (ФИО, адрес,
даты, суммы, требования), затем модель дополняет недостающее. В контекст модели
передаётся распознанный текст загруженных документов и текущая претензия — поэтому
она отвечает по реальным данным, а не догадкам. Вопрос в конце формируется кодом
по действительно пустым полям.
"""
import json, re
from fastapi import HTTPException
from pydantic import ValidationError
from ..config import settings
from ..db import now
from ..schemas import AIResult, AIExtraction
from ..legal import categories as C, research, confidence as CF
from .. import cases as CS
from ..docs import service as DS, ai_edit as DE
from ..files import autoapply as FA
from . import runtime, demo_engine, extract as EX
from .base import LLMError

SYSTEM = (
    "Ты — ИИ-помощник по бытовым юридическим вопросам для физических лиц в РФ. Отвечай по-русски, кратко (до 5 предложений), "
    "дружелюбно. Ты не заменяешь юриста и не даёшь окончательных заключений.\n"
    "Правила: 1) В facts запиши ВСЁ, что пользователь сообщил в этом сообщении, даже если таких сведений несколько "
    "(ФИО, адрес, даты, суммы, объёмы, названия организаций, требование). Ничего не выдумывай. Даты — ГГГГ-ММ-ДД, "
    "суммы — числом в рублях, requirement — одно из: refund, replace, repair, discount, compensation, other. "
    "2) В блоке ИЗВЕСТНО уже есть сведения — НЕ спрашивай о них и не проси повторить. "
    "3) Задай не более одного вопроса, только по полю из СПРОСИТЬ; если СПРОСИТЬ пусто — не задавай вопросов, подведи итог. "
    "4) Статьи законов называй ТОЛЬКО из блока НОРМЫ; если блока нет — не называй статей и номеров актов. "
    "5) Если пользователь не знает ответа — не настаивай. "
    "6) Если в деле есть готовая претензия (блок ТЕКУЩАЯ ПРЕТЕНЗИЯ), говори о её содержании только по этому тексту. "
    "Если чего-то в документе нет — прямо скажи, что этого нет, и предложи исправить документ. "
    'Ответ — строго JSON без пояснений: {"reply": "...", "category": "ключ или null", "facts": {"ключ": "значение"}}'
)

SYSTEM_FILES = (
    "Ты извлекаешь сведения из документов для досудебной претензии в РФ. "
    "Бери только то, что прямо написано в тексте документа. Не путай продавца и покупателя: "
    "applicant_* — заявитель (покупатель), seller_*/contractor_*/counterpart_* — организация из документа. "
    "Если сведений нет — не добавляй поле. Даты — ГГГГ-ММ-ДД, суммы — числом в рублях, "
    "requirement — refund|replace|repair|discount|compensation|other. "
    'Ответ строго JSON: {"category": "ключ или null", "facts": {"ключ": "значение"}}'
)

ALL_KEYS = ["applicant_name", "applicant_address", "seller_name", "seller_address", "contractor_name", "contractor_address",
            "product", "service", "price", "purchase_date", "contract_date", "defect_date", "incident_date", "event_date",
            "defect", "damage_description", "damage_amount", "counterpart_name", "counterpart_address", "amount", "requirement"]

EDIT_RE = re.compile(r"(?i)^\s*(?:добавь|допиши|исправь|поправь|измени|замени|убери|удали|перепиши|сделай|укажи|внеси|дополни|оформи|напиши)\b")


def _context(conn, case, conv_id, text, facts, missing) -> str:
    prof = case["category"]
    parts = []
    if not prof:
        parts.append("КАТЕГОРИИ: " + "; ".join(f"{k} — {v['title']}" for k, v in C.PROFILES.items()))
        parts.append("КЛЮЧИ ФАКТОВ: " + ", ".join(f"{k} ({v[0]})" for k, v in C.FIELDS.items() if k != "place"))
    else:
        parts.append(f"КАТЕГОРИЯ: {prof}")
        parts.append("КЛЮЧИ ФАКТОВ: " + ", ".join(f"{k} ({C.label(k)})" for k in C.required_fields(prof)))
    parts.append("ИЗВЕСТНО (не спрашивай это): " + json.dumps({k: v for k, v in facts.items() if v != C.UNKNOWN}, ensure_ascii=False))
    ask = [k for k in missing if k not in facts][:2]
    parts.append("СПРОСИТЬ: " + (", ".join(f"{k} ({C.label(k)})" for k in ask) if ask else
                                 "ничего, сведения собраны — подведи итог и предложи составить документ"))
    fs = CS.files_of(conn, case["id"])
    if fs:
        parts.append("ФАЙЛЫ: " + " | ".join(f"{f['original_name']}: {json.loads(f['analysis_json'] or '{}').get('summary','')[:160]}" for f in fs[:5]))
        excerpts = []
        for f in fs[:3]:
            t = (f.get("extracted_text") or "").strip()
            if t:
                excerpts.append(f"«{f['original_name']}»:\n{t[:2500]}")
        if excerpts:
            parts.append("ТЕКСТ ДОКУМЕНТОВ (распознан локально, возможны ошибки):\n" + "\n\n".join(excerpts)[:7000])
    doc = conn.execute("SELECT d.title, v.version, v.content FROM documents d JOIN document_versions v ON v.document_id=d.id "
                       "WHERE d.case_id=? ORDER BY v.version DESC LIMIT 1", (case["id"],)).fetchone()
    if doc:
        parts.append(f"ТЕКУЩАЯ ПРЕТЕНЗИЯ «{doc['title']}» (версия {doc['version']}; цитируй только из этого текста):\n{doc['content'][:5000]}")
    if prof and (re.search(r"\?|стать|закон|срок|право|можно|как ", text.lower()) or not missing):
        frag = research.prompt_fragments(research.search(text, prof, facts.get("requirement"), 3))
        parts.append("НОРМЫ (демо-база, пересказ):\n" + frag if frag else "НОРМЫ: нет данных в базе")
    hist = conn.execute("SELECT role,content FROM messages WHERE conversation_id=? AND role IN ('user','assistant') "
                        "ORDER BY id DESC LIMIT ?", (conv_id, settings.ai_history)).fetchall()
    parts.append("ПОСЛЕДНИЕ СООБЩЕНИЯ:\n" + "\n".join(f"{'Пользователь' if r['role']=='user' else 'Ты'}: {r['content'][:400]}" for r in reversed(hist)))
    return "\n".join(parts)


def _parse_json(raw: str) -> dict:
    raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.S)
        if m:
            return json.loads(m.group(0))
        raise


_SPLIT = re.compile(r"(?<=[.!?…])\s+")


def _strip_questions(text: str) -> str:
    """Убирает вопросы модели: вопрос задаёт код по реально пустым полям."""
    parts = [p for p in _SPLIT.split((text or "").strip()) if "?" not in p]
    return " ".join(parts).strip()


def _final_reply(reply: str, profile: str | None, missing: list[str], ev: dict) -> str:
    if not profile:
        return (reply or "").strip()
    text = _strip_questions(reply)
    if missing:
        q = C.FIELDS[missing[0]][1]
        return f"{text}\n\n{q}" if text else q
    score = f" (демо-оценка подготовки: {ev['score']}/100)"
    if ev["level"] == "lawyer":
        tail = CF.LEVEL_TEXT["lawyer"] + score
    elif ev["level"] == "review":
        tail = "Сведения собраны. Проверьте карточку дела и приложите подтверждающие документы — документ составить можно, " \
               "но оценка пока ниже порога 85." + score
    else:
        tail = "Сведений достаточно — можно составлять претензию." + score + " Нажмите «Составить претензию» в карточке дела."
    return f"{text}\n\n{tail}" if text else tail


def extract_from_files(conn, case: dict, files: list[dict]) -> dict:
    """Один запрос к ИИ по распознанному тексту документа. Возвращает применённые поля."""
    texts = [f for f in files if (f.get("extracted_text") or "").strip()]
    if not texts:
        return {}
    provider_name, model = runtime.active_config(conn)
    if provider_name == "demo" or runtime.in_cooldown(provider_name):
        return {}
    facts = CS.get_facts(conn, case["id"])
    keys = C.required_fields(case["category"]) or ALL_KEYS
    body = ("КАТЕГОРИЯ: " + (case["category"] or "не определена") + "\n"
            "ПОЛЯ: " + ", ".join(f"{k} ({C.label(k)})" for k in keys) + "\n"
            "ИЗВЕСТНО: " + json.dumps({k: v for k, v in facts.items() if v != C.UNKNOWN}, ensure_ascii=False) + "\n"
            "ДОКУМЕНТЫ:\n" + "\n\n".join(f"«{f['original_name']}»:\n{(f.get('extracted_text') or '')[:4000]}" for f in texts[:3])[:9000])
    try:
        raw = runtime.build(provider_name, model).generate(SYSTEM_FILES, body, settings.ai_max_tokens)
        result = AIExtraction.model_validate(_parse_json(raw))
    except LLMError as e:
        runtime.mark_failed(provider_name, e)
        return {}
    except (ValidationError, ValueError, json.JSONDecodeError):
        return {}
    applied = FA.apply_facts(conn, case["id"], result.facts)
    if result.category and not case["category"]:
        CS.set_category(conn, case["id"], result.category)
        case["category"] = result.category
    return applied


def _latest_doc(conn, case_id: int):
    return conn.execute("SELECT d.id, d.title, v.version, v.content, v.is_signed FROM documents d "
                        "JOIN document_versions v ON v.document_id=d.id WHERE d.case_id=? "
                        "ORDER BY v.version DESC LIMIT 1", (case_id,)).fetchone()


def _try_edit(conn, user, case: dict, instruction: str) -> dict | None:
    """Правка готовой претензии по команде в чате: реально создаёт новую версию."""
    doc = _latest_doc(conn, case["id"])
    if not doc:
        return None
    if doc["is_signed"]:
        return {"reply": "Последняя версия претензии подписана — изменить её нельзя. Откройте документ и создайте новую версию вручную, затем подпишите заново.",
                "used": "demo"}
    res = DE.run(conn, case, CS.get_facts(conn, case["id"]), doc["content"], instruction)
    if not res["ok"]:
        return {"reply": res["message"] + " Правку можно внести вручную в документе (вкладка «Редактирование»).",
                "used": "demo", "notice": res["message"]}
    full = dict(conn.execute("SELECT * FROM documents WHERE id=?", (doc["id"],)).fetchone())
    try:
        DS.add_version(conn, user, full, res["content"], "Переработано ИИ по запросу в чате")
    except HTTPException as e:
        return {"reply": f"Не удалось сохранить новую версию: {e.detail}", "used": "demo"}
    except Exception as e:
        return {"reply": f"Не удалось сохранить новую версию: {type(e).__name__}.", "used": "demo"}
    latest = _latest_doc(conn, case["id"])
    return {"reply": f"Готово: сохранил версию {latest['version']}. Текст переработан — проверьте формулировки в документе.",
            "used": res["used"]}


def handle_message(conn, user, conv: dict, text: str) -> dict:
    case_id = conv["case_id"]
    case = dict(conn.execute("SELECT * FROM legal_cases WHERE id=?", (case_id,)).fetchone())
    ts = now()
    conn.execute("INSERT INTO messages(conversation_id,role,content,created_at) VALUES(?,?,?,?)", (conv["id"], "user", text, ts))
    first = conn.execute("SELECT COUNT(*) c FROM messages WHERE conversation_id=? AND role='user'", (conv["id"],)).fetchone()["c"] == 1
    if not case["description"]:
        conn.execute("UPDATE legal_cases SET description=? WHERE id=?", (text[:1000], case_id))
        case["description"] = text[:1000]
    facts = CS.get_facts(conn, case_id)
    if not case["category"]:
        guess = C.detect_profile(text)
        if guess:
            CS.set_category(conn, case_id, guess); case["category"] = guess

    # 1. Правила: всё, что пользователь написал явно, попадает в дело ДО модели.
    for k, v in EX.extract(case["category"], text, facts, case["last_asked"]).items():
        CS.set_fact(conn, case_id, k, v, "user", True)
    facts = CS.get_facts(conn, case_id)

    provider_name, model = runtime.active_config(conn)
    notice, result, used = None, None, "demo"
    missing = C.missing_fields(case["category"], facts)
    doc_edit = None
    if case["category"] and EDIT_RE.match(text):
        doc_edit = _try_edit(conn, user, case, text)
    if doc_edit is not None:
        result = AIResult(reply=doc_edit["reply"], category=case["category"])
        used = doc_edit["used"]
        notice = doc_edit.get("notice")
    elif provider_name != "demo":
        prov = runtime.build(provider_name, model)
        if runtime.in_cooldown(provider_name):
            notice = f"ИИ-провайдер «{provider_name}» временно отключён после недавней ошибки. Работаю в демонстрационном режиме."
        else:
            try:
                raw = prov.generate(SYSTEM, _context(conn, case, conv["id"], text, facts, missing), settings.ai_max_tokens)
                result = AIResult.model_validate(_parse_json(raw))
                used = f"{provider_name}:{model}"
            except LLMError as e:
                runtime.mark_failed(provider_name, e)
                notice = f"{e.user_message}. Отвечаю в демонстрационном режиме."
            except (ValidationError, ValueError, json.JSONDecodeError):
                notice = "Модель вернула ответ в неверном формате. Для этого сообщения использован демонстрационный режим."
    if result is None:
        result, _ = demo_engine.respond(case["category"], facts, case["last_asked"], text, first)
    # 2. Дополняем моделью: сведения пользователя она перезаписать не может.
    if result.category and not case["category"]:
        CS.set_category(conn, case_id, result.category); case["category"] = result.category
    source = "ai" if used != "demo" else "user"
    for k, v in result.facts.items():
        CS.set_fact(conn, case_id, k, v, source)
    facts = CS.get_facts(conn, case_id)
    missing = C.missing_fields(case["category"], facts)
    next_key = missing[0] if missing and case["category"] else None
    conn.execute("UPDATE legal_cases SET last_asked=? WHERE id=?", (next_key, case_id))
    CS.auto_title(conn, case_id)
    ev = CS.recompute(conn, case_id)
    reply = doc_edit["reply"] if doc_edit else _final_reply(result.reply, case["category"], missing, ev)
    cur = conn.execute("INSERT INTO messages(conversation_id,role,content,meta_json,created_at) VALUES(?,?,?,?,?)",
                       (conv["id"], "assistant", reply, json.dumps({"provider": used, "notice": notice}, ensure_ascii=False), now()))
    conn.execute("UPDATE conversations SET updated_at=? WHERE id=?", (now(), conv["id"]))
    return {"message_id": cur.lastrowid}
