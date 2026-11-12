"""Демонстрационный диалог без внешнего ИИ: правила + заполнение полей без переспроса.

Вопрос пользователю формирует orchestrator — по полям, которые действительно
пусты. Здесь только разбор ответа и короткое подтверждение.
"""
import re
from ..legal import categories as C
from ..schemas import AIResult

UNKNOWN_RE = re.compile(r"^\s*(не знаю|не известно|неизвестно|нет данных|не помню|затрудняюсь)\b", re.I)
PLATE_RE = re.compile(r"[АВЕКМНОРСТУХABEKMHOPCTYX]\s?\d{3}\s?[АВЕКМНОРСТУХABEKMHOPCTYX]{2}\s?\d{2,3}", re.I)
HINT = {"date": "Напишите дату, например 10.10.2026 или «10 октября».",
        "money": "Напишите сумму цифрами, например 45000.",
        "req": "Выберите: вернуть деньги, заменить, отремонтировать, уменьшить цену или возместить ущерб."}

def _extract_free(profile: str, text: str, facts: dict[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    t = text.lower()
    p = C.PROFILES[profile]
    if profile == "consumer_goods":
        m = re.search(r"(?:купил[аи]?|приобр[её]л[аи]?)\s+(?:себе\s+)?([а-яёa-z0-9\- ]{3,40}?)(?=[,.;]|\s+(?:в|на|за|через|и|но|а|у|по)\s|\s*$)", t)
        if m and not facts.get("product"):
            out["product"] = m.group(1).strip().capitalize()
    if profile in ("consumer_goods", "consumer_service"):
        m = re.search(r"(?:за|стоил[аи]?|стоимост\w+|заплатил\w*|оплатил\w*)\s*(\d[\d\s]{2,})\s*(?:руб|₽|р\b)", t)
        if m and not facts.get("price"):
            v = C.parse_money(m.group(1))
            if v: out["price"] = v
        m = re.search(r"(перестал[аи]?\s+[а-яё]+|не\s+(?:работает|охлаждает|включается|морозит|греет)|сломал\w*|течёт|течет)", t)
        if m and not facts.get("defect"):
            out["defect"] = m.group(1).strip()
    if profile == "auto_damage":
        m = PLATE_RE.search(text)
        if m and not facts.get("counterpart_vehicle"):
            out["counterpart_vehicle"] = re.sub(r"\s", "", m.group(0)).upper()
        m = re.search(r"((?:помяли|поцарапал\w*|разбил\w*|повредил\w*|вмятин\w*|царапин\w*)[^.!?]{0,60})", t)
        if m and not facts.get("damage_description"):
            out["damage_description"] = m.group(1).strip().capitalize()
    d = C.parse_date(text)
    if d and not facts.get(p["date"]) and re.search(r"\d", text):
        out[p["date"]] = d
    if re.search(r"хочу|требую|верните|вернуть|верн[её]т|пусть", t) and not facts.get("requirement"):
        r = C.parse_requirement(t)
        if r and r in p["allowed_req"]:
            out["requirement"] = r
    return {k: v for k, v in out.items() if v}

def _direct_value(key: str, message: str) -> str | None:
    """Целое сообщение принимаем как ответ, только если оно похоже на один факт."""
    m = message.strip()
    kind = C.FIELDS[key][2]
    if kind in ("date", "money"):
        return m if len(m) <= 40 else None
    if key == "applicant_name":
        return m if re.fullmatch(r"[А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+){1,2}", m) else None
    if kind == "text":
        return m if len(m) <= 200 else None
    return m

def respond(profile: str | None, facts: dict[str, str], last_asked: str | None, message: str, first: bool = False) -> tuple[AIResult, str | None]:
    """Возвращает (результат без вопроса, ключ следующего вопроса)."""
    new: dict[str, str] = {}
    prefix = ""
    if not profile:
        profile = C.detect_profile(message)
        if not profile:
            return AIResult(reply="Расскажите подробнее, что произошло: например, что вы купили, что случилось "
                                  "с автомобилем или с кем возник спор. Так я определю тип обращения."), None
        prefix = f"Понял, это похоже на обращение по теме «{C.PROFILES[profile]['title']}». "
    direct = _direct_value(last_asked, message) if last_asked and last_asked in C.FIELDS and not facts.get(last_asked) else None
    if last_asked and last_asked in C.FIELDS and not facts.get(last_asked) and direct is not None:
        if UNKNOWN_RE.match(message):
            new[last_asked] = C.UNKNOWN
        else:
            val = C.normalize(last_asked, direct)
            if val is None:
                hint = HINT.get(C.FIELDS[last_asked][2], "Попробуйте ответить иначе.")
                return AIResult(reply=f"{prefix}Не удалось распознать ответ. {hint}", category=profile), last_asked
            new[last_asked] = val
    if first or not last_asked or len(message) > 50:
        for k, v in _extract_free(profile, message, {**facts, **new}).items():
            new.setdefault(k, v)
    merged = {**facts, **new}
    missing = C.missing_fields(profile, merged)
    if not missing:
        reply = prefix + "Спасибо, все необходимые сведения собраны. Проверьте их в карточке дела справа."
    else:
        reply = (prefix + ("Принял. " if new else "")).strip() or "Принял."
    return AIResult(reply=reply, category=profile, facts=new), (missing[0] if missing else None)
