"""Детерминированное извлечение сведений из сообщений пользователя.

Правила работают ВСЕГДА — и в демо-режиме, и вместе с внешней моделью: всё, что
пользователь написал явно, сразу попадает в карточку дела. Значения не
додумываются: если шаблон не найден, поле остаётся пустым, и вопрос задаётся.
Модель только дополняет то, что не удалось разобрать правилами.
"""
import re
from ..legal import categories as C

NAME_RE = re.compile(r"\b([А-ЯЁ][а-яё]{1,20})\s+([А-ЯЁ][а-яё]{1,20})(?:\s+([А-ЯЁ][а-яё]{1,20}))?\b")
NAME_STOP = {"россия", "москва", "январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август",
             "сентябрь", "октябрь", "ноябрь", "декабрь", "суббота", "воскресенье", "понедельник"}

ORG_RE = re.compile(
    r"(?:(?P<prefix>(?i:ООО|ОАО|ЗАО|ПАО|АО|ИП|АЗС|АГЗС))\s*)?"
    r"[«\"“](?P<quoted>[^»\"”]{2,60})[»\"”]"
    r"|(?P<plain_prefix>(?i:ООО|ОАО|ЗАО|ПАО|АО|ИП|АЗС|АГЗС))\s+"
    r"(?P<plain>[А-ЯЁ][А-Яа-яёA-Za-z\-]*(?:\s+[А-ЯЁ][А-Яа-яёA-Za-z\-]*)?)")

STREET_RE = re.compile(r"(?i)\b(?:ул\.?|улиц[аы]|пр-т|проспект|пер\.?|переулок|шоссе|бульвар|б-р|наб\.?|"
                       r"набережн\w*|мкр\.?|микрорайон|площад[ьи]|пл\.?|проезд)\b")
CITY_RE = re.compile(r"(?i)\b(?:г\.|город[ае]?)\s*[А-ЯЁ]")
APT_RE = re.compile(r"(?i)(?:кв\.?\s*\d+|квартира\s*\d+)")
ADDR_SHORT_RE = re.compile(r"[А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ]?[а-яё\-]+){0,2},?\s*\d+[А-ЯЁа-яё0-9/\-]*"
                           r"\s*,?\s*(?:(?i:кв\.?|квартира)\s*\d+)?")
DATE_TOKEN_RE = re.compile(r"\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b")
TIME_RE = re.compile(r"\b(\d{1,2})[:.](\d{2})\b")

MONEY_RE = re.compile(r"(\d[\d\s\u00a0]*(?:[.,]\d{1,2})?)\s*(?i:руб(?:лей|ля|ль|\.)?|₽|р\.)(?![а-яa-z])")
MONEY_CTX_RE = re.compile(r"(?i)(?:вернуть|верните|верну|возместить|возместите|компенсац\w*|ущерб\w*|"
                          r"заплатил\w*|стоил\w*|стоимость|цена|сумма)\D{0,25}(\d[\d\s\u00a0]*(?:[.,]\d{1,2})?)")
NEGATIVE_RE = re.compile(r"(?i)без\s+(?:компенсации|возмещения)[^.,;)]*")

FUEL_RE = re.compile(r"(?i)заправ|бензин|топлив|\bазс\b|агзс")


def _person_name(text: str) -> str | None:
    for m in NAME_RE.finditer(text):
        words = [w for w in m.groups() if w]
        if any(w.lower() in NAME_STOP for w in words):
            continue
        # «АЗС Газпромнефть» и подобные — не имя: нужен хотя бы один падеж фамилии/имени
        if words[0][:1].isupper() and all(len(w) > 1 for w in words):
            return " ".join(words)
    return None


def _org(text: str) -> str | None:
    m = ORG_RE.search(text)
    if not m:
        return None
    if m.group("quoted"):
        name = m.group("quoted").strip(" .,;")
        prefix = m.group("prefix")
        return f"{prefix} «{name}»" if prefix else name
    name = (m.group("plain") or "").strip(" .,;")
    prefix = m.group("plain_prefix")
    return f"{prefix} {name}" if prefix else name


def _org_field(profile: str | None) -> str | None:
    prof = C.PROFILES.get(profile or "")
    if not prof:
        return "counterpart_name"
    key = prof["recipient"][0]
    return key if key in prof["required"] else "counterpart_name"


def _address_slots(profile: str | None) -> list[str]:
    if profile == "auto_damage":
        return ["incident_place", "applicant_address", "counterpart_address"]
    prof = C.PROFILES.get(profile or "")
    if prof:
        return ["applicant_address", prof["recipient"][1]]
    return ["applicant_address", "counterpart_address"]


def _clean_address(seg: str) -> str:
    s = DATE_TOKEN_RE.sub(" ", seg)
    s = re.sub(r"(?i)\bв\s*\d{1,2}[:.]\d{2}\b", " ", s)
    s = re.sub(r"(?i)\b(?:да|ну|это|я|мы|у меня)\b[,:]?\s*", "", s)
    m = re.search(r"(?i)\b(?:в|во|на)?\s*(?:г\.|город[ае]?\s|улиц[аы]|ул\.|пр-т|проспект|пер\.|переулок|шоссе|"
                  r"бульвар|б-р|наб\.|набережн\w*|мкр\.|микрорайон|площад[ьи]|пл\.|проезд)", s)
    if m:
        s = s[m.start():]
    s = re.sub(r"(?i)^(?:в|во)\s+", "", s.strip())
    s = re.sub(r"(?i)^город[ае]?\s+", "г. ", s)
    return re.sub(r"\s{2,}", " ", s).strip(" ,;.-")


def _addresses(text: str) -> list[str]:
    out = []
    for seg in re.split(r"[,;\n]", text):
        s = seg.strip()
        if not s or not re.search(r"\d", s):
            continue
        if STREET_RE.search(s) or CITY_RE.search(s) or ADDR_SHORT_RE.fullmatch(s):
            cleaned = _clean_address(s)
            if cleaned and len(cleaned) >= 5 and cleaned not in out:
                out.append(cleaned)
    return out


def _money(text: str) -> str | None:
    m = MONEY_RE.search(text) or MONEY_CTX_RE.search(text)
    if not m:
        return None
    return C.parse_money(m.group(1))


def _date_slot(profile: str | None, facts: dict[str, str], asked: str | None) -> str | None:
    date_fields = [k for k, f in C.FIELDS.items() if f[2] == "date" and k in C.required_fields(profile)]
    if asked in date_fields and not facts.get(asked):
        return asked
    if profile == "consumer_goods":
        for k in ("purchase_date", "defect_date"):
            if not facts.get(k):
                return k
    prof = C.PROFILES.get(profile or "")
    if prof:
        k = prof["date"]
        if not facts.get(k):
            return k
        for extra in date_fields:
            if not facts.get(extra):
                return extra
    return date_fields[0] if date_fields else None


def extract(profile: str | None, text: str, facts: dict[str, str], asked: str | None = None) -> dict[str, str]:
    """Возвращает поля, которые пользователь явно сообщил в этом сообщении."""
    t = (text or "").strip()
    if not t:
        return {}
    out: dict[str, str] = {}
    known = lambda k: facts.get(k) or out.get(k)
    prof = C.PROFILES.get(profile or "")

    name = _person_name(t)
    if name and not known("applicant_name"):
        out["applicant_name"] = name

    org = _org(t)
    org_key = _org_field(profile)
    if org and org_key and not known(org_key):
        out[org_key] = org

    slots = _address_slots(profile)
    has_org = bool(org) or bool(FUEL_RE.search(t))
    used: set[str] = set()
    for addr in _addresses(t):
        target = None
        if asked in slots and not known(asked) and asked not in used:
            target = asked
        elif APT_RE.search(addr) and not known("applicant_address"):
            target = "applicant_address"
        elif has_org and len(slots) > 1:
            target = next((s for s in slots[1:] if not known(s) and s not in used), None)
        if not target:
            target = next((s for s in slots if not known(s) and s not in used), None)
        if target:
            if target != "applicant_address":
                addr = re.sub(r"(?i)\bна\s+(?:АЗС|АГЗС)\s*[«\"“][^»\"”]+[»\"”]", "", addr)
                addr = re.sub(r"\s{2,}", " ", addr).strip(" ,")
            out[target] = addr
            used.add(target)

    d = C.parse_date(t)
    if d:
        slot = _date_slot(profile, facts, asked)
        if slot and not known(slot):
            out[slot] = d

    m = _money(t)
    if m:
        money_key = prof["money"] if prof else "amount"
        if not known(money_key):
            out[money_key] = m

    req = C.parse_requirement(NEGATIVE_RE.sub(" ", t))
    if req and (not prof or req in prof["allowed_req"]) and req != facts.get("requirement"):
        out["requirement"] = req

    if prof and profile == "consumer_service" and FUEL_RE.search(t):
        if not known("service"):
            out["service"] = "Заправка автомобиля топливом"
        if not known("defect"):
            m = re.search(r"(?i)((?:перелил|налил|недолил)[^.!?]{0,120})", t)
            if m:
                out["defect"] = m.group(1).strip()

    if prof and "description" in prof["required"] and not known("description") and len(t) > 40:
        out["description"] = t[:400]

    tm = TIME_RE.search(t)
    if tm and prof and "description" in prof["required"] and out.get("description") and "ремя" not in out["description"]:
        out["description"] = f"{out['description']} (время: {tm.group(1)}:{tm.group(2)})"

    return {k: v for k, v in out.items() if v}
