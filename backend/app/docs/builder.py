"""Построение претензии ТОЛЬКО из структурированных фактов и шаблона. Модель текст фактов не меняет."""
import re
from datetime import date, timedelta
from ..config import settings
from ..legal import categories as C, research

PLACEHOLDER_RE = re.compile(r"\[НЕ УКАЗАНО: [^\]]+\]")
EXCLUDE_NORMS = {"zozpp-13", "gk-196"}
DEADLINE_DAYS = 10
CHRONO = {
    "purchase_date": "приобретён товар", "defect_date": "обнаружен недостаток", "contract_date": "заключён договор / оплачены работы",
    "incident_date": "произошло событие (повреждение имущества)", "event_date": "произошли описанные события",
}
SUBTITLES = {
    "refund": "о возврате уплаченных денежных средств", "replace": "о замене товара ненадлежащего качества",
    "repair": "о безвозмездном устранении недостатков", "discount": "о соразмерном уменьшении цены",
    "compensation": "о возмещении причинённого ущерба", "other": "об исполнении обязательства",
}

def missing_mark(key: str) -> str:
    return f"[НЕ УКАЗАНО: {C.label(key)}]"

def _val(facts, key):
    v = facts.get(key)
    return None if (not v or v == C.UNKNOWN) else C.fmt_value(key, v)

def requirement_text(profile: str, facts: dict) -> str:
    r = facts.get("requirement")
    if not r or r == C.UNKNOWN:
        return missing_mark("requirement")
    price = _val(facts, "price") or _val(facts, "damage_amount") or _val(facts, "amount")
    amount = f" в размере {price}" if price else ""
    goods = profile == "consumer_goods"
    return {
        "refund": ("расторгнуть договор купли-продажи и вернуть уплаченную за товар сумму" if goods else "вернуть уплаченные денежные средства") + amount,
        "replace": "заменить товар на аналогичный товар надлежащего качества",
        "repair": "безвозмездно устранить выявленные недостатки" + (" товара" if goods else ""),
        "discount": "соразмерно уменьшить цену" + amount,
        "compensation": "возместить причинённый ущерб" + amount,
        "other": "исполнить обязательство",
    }[r]

def build_claim(case: dict, facts: dict[str, str], files: list[dict], today: date | None = None) -> str:
    profile = case["category"]
    prof = C.PROFILES[profile]
    today = today or date.today()
    tpl = (settings.templates_dir / prof["template"]).read_text(encoding="utf-8")
    vals: dict[str, str | None] = {k: _val(facts, k) for k in C.FIELDS}
    rk_name, rk_addr = prof["recipient"]
    vals["recipient_name"] = vals.get(rk_name)
    vals["recipient_address"] = vals.get(rk_addr)
    if profile == "auto_damage":
        vals["recipient_name"] = vals["recipient_name"] or None
    vals["phone_line"] = f"Телефон: {vals['applicant_phone']}" if vals.get("applicant_phone") else None
    vals["place_line"] = f"Место составления: {vals['place']}" if vals.get("place") else None
    vals["recipient_address_line"] = f"Адрес: {vals['recipient_address']}" if vals.get("recipient_address") else None
    amt = facts.get("amount")
    vals["amount_line"] = f"Сумма требования: {C.fmt_value('amount', amt)}." if amt and amt not in (C.UNKNOWN, "0") else None
    vals["claim_subtitle"] = SUBTITLES.get(facts.get("requirement", ""), "")
    vals["requirement_text"] = requirement_text(profile, facts)
    vals["deadline_days"] = str(DEADLINE_DAYS)
    vals["deadline_date"] = (today + timedelta(days=DEADLINE_DAYS)).strftime("%d.%m.%Y")
    vals["recipient_details_line"] = vals.get("recipient_details")
    vals["date_today"] = today.strftime("%d.%m.%Y")
    # хронология
    ev = []
    for k, text in CHRONO.items():
        if facts.get(k) and facts[k] != C.UNKNOWN:
            extra = ""
            if k == "purchase_date" and _val(facts, "product"):
                extra = f": {vals['product']}"
            if k == "defect_date" and _val(facts, "defect"):
                extra = f": {vals['defect']}"
            if k == "incident_date" and _val(facts, "incident_place"):
                extra = f" ({vals['incident_place']})"
            ev.append((facts[k], f"{text}{extra}"))
    ev.sort()
    ev.append((today.isoformat(), "направляется настоящая претензия"))
    vals["chronology"] = "\n".join(f"{i}. {C.fmt_date(d)} — {t}" for i, (d, t) in enumerate(ev, 1))
    # правовое обоснование: только из базы, с указанием статьи
    norms = [n for n in research.for_profile(profile, facts.get("requirement")) if n["id"] not in EXCLUDE_NORMS][:5]
    vals["legal_grounds"] = ("\n".join(f"• {research.cite(n)} — {n['title'].lower()}." for n in norms)
                             if norms else "[НЕ УКАЗАНО: правовое обоснование — требуется проверка юристом]")
    vals["attachments"] = ("\n".join(f"— {C.DOC_TYPE_LABELS.get(f['doc_type'], 'Документ').lower()} (файл «{f['original_name']}»);"
                                     for i, f in enumerate(files, 1)) or "Приложения отсутствуют.")
    out = []
    for line in tpl.splitlines():
        keys_opt = re.findall(r"\{\?(\w+)\}", line)
        if keys_opt and any(not vals.get(k) for k in keys_opt):
            continue
        def sub(m):
            opt, k = m.group(1), m.group(2)
            v = vals.get(k)
            alias = {"recipient_name": rk_name, "recipient_address": rk_addr}
            if v:
                return v
            if k in alias:
                return missing_mark(alias[k])
            return missing_mark(k) if k in C.FIELDS else ""
        line = re.sub(r"\{(\??)(\w+)\}", sub, line)
        if line.strip() == ">":
            continue
        out.append(line)
    text = "\n".join(out)
    return re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"

def placeholders(content: str) -> list[str]:
    return PLACEHOLDER_RE.findall(content)

def review(content: str) -> dict:
    ph = placeholders(content)
    issues = [f"Не заполнено: {p[len('[НЕ УКАЗАНО: '):-1]}" for p in ph]
    return {"ok": not ph, "placeholders": ph, "issues": issues,
            "status": "Готов к подписанию" if not ph else f"Требует доработки: незаполненных полей — {len(ph)}"}


CHECK_KEYS = ["applicant_name", "seller_name", "contractor_name", "counterpart_name", "product", "service", "price",
              "damage_amount", "amount", "purchase_date", "contract_date", "incident_date", "event_date", "defect_date", "defect"]

def fact_check(facts: dict[str, str], content: str) -> list[str]:
    """Детерминированная сверка: значения из карточки дела должны присутствовать в тексте документа."""
    low = content.lower()
    out = []
    for k in CHECK_KEYS:
        v = facts.get(k)
        if v and v not in (C.UNKNOWN, "0") and C.fmt_value(k, v).lower() not in low:
            out.append(f"«{C.label(k)}»: значение «{C.fmt_value(k, v)}» из карточки дела не найдено в тексте (возможно, изменено при редактировании).")
    return out
