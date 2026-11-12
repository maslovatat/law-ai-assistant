"""Справочник профилей дел, полей и вопросов. Недостающие сведения вычисляются КОДОМ, не моделью."""
import re
from datetime import date, datetime

UNKNOWN = "__unknown__"

# key -> (label, question, kind)   kind: text|date|money|req|phone
FIELDS = {
    "applicant_name": ("ФИО заявителя", "Как вас зовут (ФИО полностью, как в паспорте)?", "text"),
    "applicant_address": ("Адрес заявителя", "Укажите ваш адрес для ответа (почтовый адрес).", "text"),
    "applicant_phone": ("Телефон заявителя", "Телефон для связи (необязательно).", "phone"),
    "seller_name": ("Продавец", "Кто продавец? Название магазина или организации (как указано в чеке).", "text"),
    "seller_address": ("Адрес продавца", "Какой у продавца адрес (юридический или адрес магазина)?", "text"),
    "product": ("Товар", "Какой именно товар вы купили (наименование, модель)?", "text"),
    "purchase_date": ("Дата покупки", "Когда вы купили товар? Назовите дату.", "date"),
    "price": ("Стоимость, ₽", "Какая сумма указана в чеке или договоре (в рублях)?", "money"),
    "defect": ("Недостаток", "В чём именно проявляется недостаток?", "text"),
    "defect_date": ("Дата обнаружения недостатка", "Когда вы обнаружили недостаток?", "date"),
    "requirement": ("Требование", "Что вы хотите потребовать: вернуть деньги, заменить, отремонтировать или уменьшить цену?", "req"),
    "contractor_name": ("Исполнитель", "Кто исполнитель услуги/работ (организация или ИП)?", "text"),
    "contractor_address": ("Адрес исполнителя", "Какой адрес у исполнителя?", "text"),
    "service": ("Услуга/работа", "Какую работу или услугу вы заказали?", "text"),
    "contract_date": ("Дата договора/оплаты", "Когда вы заключили договор или оплатили работу?", "date"),
    "incident_date": ("Дата происшествия", "Когда это произошло? Назовите дату.", "date"),
    "incident_place": ("Место происшествия", "Где это произошло (адрес парковки)?", "text"),
    "damage_description": ("Повреждения", "Какие повреждения получил ваш автомобиль?", "text"),
    "counterpart_name": ("Виновник / другая сторона", "Известно ли, кто виновник (ФИО)? Если нет, напишите «не знаю».", "text"),
    "counterpart_vehicle": ("Автомобиль виновника", "Что известно о втором автомобиле (марка, госномер)?", "text"),
    "damage_amount": ("Сумма ущерба, ₽", "Какова сумма ущерба (по оценке или смете), в рублях?", "money"),
    "counterpart_address": ("Адрес другой стороны", "Какой адрес у другой стороны?", "text"),
    "event_date": ("Дата событий", "Когда произошли основные события? Назовите дату.", "date"),
    "description": ("Обстоятельства", "Опишите, что произошло, в нескольких предложениях.", "text"),
    "amount": ("Сумма требования, ₽", "О какой сумме идёт речь (в рублях)? Если не о деньгах, напишите «нет».", "money"),
    "place": ("Место составления", "", "text"),
    "recipient_details": ("Реквизиты адресата (ИНН/ОГРН, тел., e-mail)", "", "text"),
}

REQUIREMENTS = {
    "refund": "вернуть уплаченные денежные средства",
    "replace": "заменить товар на аналогичный надлежащего качества",
    "repair": "безвозмездно устранить недостатки",
    "discount": "соразмерно уменьшить цену",
    "compensation": "возместить причинённый ущерб",
    "other": "исполнить обязательство",
}
REQ_KEYWORDS = {
    "refund": ["возврат", "вернуть", "верните", "деньги", "расторж"],
    "replace": ["замен", "обмен"],
    "repair": ["ремонт", "устран", "починит"],
    "discount": ["уменьш", "скидк", "снизить"],
    "compensation": ["возмест", "компенс", "ущерб"],
}

PROFILES = {
    "consumer_goods": {
        "title": "Защита прав потребителей: товар",
        "required": ["applicant_name", "applicant_address", "seller_name", "seller_address", "product",
                     "purchase_date", "price", "defect", "defect_date", "requirement"],
        "keywords": ["купил", "куплен", "приобр", "товар", "холодильник", "телефон", "телевизор", "стиральн", "ноутбук",
                     "магазин", "чек", "гарантий", "не работает", "сломал"],
        "allowed_req": ["refund", "replace", "repair", "discount"],
        "evidence": [("receipt", "Кассовый/товарный чек"), ("warranty", "Гарантийный талон")],
        "money": "price", "date": "purchase_date", "template": "claim_consumer_goods.txt",
        "recipient": ("seller_name", "seller_address"),
    },
    "consumer_service": {
        "title": "Защита прав потребителей: услуга",
        "required": ["applicant_name", "applicant_address", "contractor_name", "contractor_address", "service",
                     "contract_date", "price", "defect", "requirement"],
        "keywords": ["ремонт", "услуг", "исполнител", "мастер", "подрядчик", "работ", "заказал", "договор подряда",
                     "выполнил", "ненадлежащ", "плохо сделал", "заправк", "бензин", "топлив", "азс"],
        "allowed_req": ["refund", "repair", "discount", "compensation"],
        "evidence": [("contract", "Договор, смета или акт"), ("receipt", "Документ об оплате")],
        "money": "price", "date": "contract_date", "template": "claim_consumer_service.txt",
        "recipient": ("contractor_name", "contractor_address"),
    },
    "auto_damage": {
        "title": "Автомобили и ДТП",
        "required": ["applicant_name", "applicant_address", "incident_date", "incident_place", "damage_description",
                     "counterpart_name", "counterpart_vehicle", "damage_amount", "requirement"],
        "keywords": ["автомобил", "машин", "парковк", "дтп", "помяли", "царапин", "вмятин", "бампер", "авто", "гос",
                     "столкнул", "виновник"],
        "allowed_req": ["compensation"],
        "evidence": [("photo", "Фотографии повреждений"), ("estimate", "Смета/оценка ущерба")],
        "money": "damage_amount", "date": "incident_date", "template": "claim_auto_damage.txt",
        "recipient": ("counterpart_name", "counterpart_address"),
    },
    "real_estate": {
        "title": "Недвижимость",
        "required": ["applicant_name", "applicant_address", "counterpart_name", "counterpart_address", "event_date",
                     "description", "amount", "requirement"],
        "keywords": ["квартир", "недвижим", "аренд", "арендод", "залив", "сосед", "застройщик", "ипотек", "дом ",
                     "комнат", "собственност"],
        "allowed_req": ["refund", "compensation", "other"],
        "evidence": [("contract", "Договор или правоустанавливающий документ")],
        "money": "amount", "date": "event_date", "template": "claim_generic.txt",
        "recipient": ("counterpart_name", "counterpart_address"),
    },
    "civil_dispute": {
        "title": "Гражданско-правовой спор",
        "required": ["applicant_name", "applicant_address", "counterpart_name", "counterpart_address", "event_date",
                     "description", "amount", "requirement"],
        "keywords": ["долг", "заём", "займ", "расписк", "не вернул", "одолжил", "обязательств", "задолжен"],
        "allowed_req": ["refund", "compensation", "other"],
        "evidence": [("contract", "Расписка, договор или переписка")],
        "money": "amount", "date": "event_date", "template": "claim_generic.txt",
        "recipient": ("counterpart_name", "counterpart_address"),
    },
    "other": {
        "title": "Другое обращение",
        "required": ["applicant_name", "applicant_address", "counterpart_name", "counterpart_address", "event_date",
                     "description", "requirement"],
        "keywords": [],
        "allowed_req": ["refund", "compensation", "other"],
        "evidence": [("any", "Любые подтверждающие документы")],
        "money": "amount", "date": "event_date", "template": "claim_generic.txt",
        "recipient": ("counterpart_name", "counterpart_address"),
    },
}

DOC_TYPE_LABELS = {
    "receipt": "Чек / документ об оплате", "warranty": "Гарантийный талон", "contract": "Договор / акт / расписка",
    "photo": "Фотография", "estimate": "Смета / оценка ущерба", "other": "Документ (тип не определён)", "any": "Документ",
}

def detect_profile(text: str) -> str | None:
    t = text.lower()
    best, score = None, 0
    for key, p in PROFILES.items():
        s = sum(1 for k in p["keywords"] if k in t)
        if s > score:
            best, score = key, s
    # «ремонт» двусмысленен: «купил… сломался» → товар; «заказал ремонт» → услуга
    if best == "consumer_service" and any(w in t for w in ["купил", "холодильник", "телефон"]) and "заказал" not in t:
        best = "consumer_goods"
    return best

OPTIONAL = ["applicant_phone", "recipient_details", "place"]

def required_fields(profile: str | None) -> list[str]:
    return PROFILES[profile]["required"] if profile in PROFILES else []

def label(key: str) -> str:
    return FIELDS.get(key, (key,))[0]

def missing_fields(profile: str | None, facts: dict[str, str]) -> list[str]:
    """Незаполненные обязательные поля (не считая тех, о которых пользователь сказал «не знаю»)."""
    return [k for k in required_fields(profile) if not facts.get(k)]

def unknown_fields(profile: str | None, facts: dict[str, str]) -> list[str]:
    return [k for k in required_fields(profile) if facts.get(k) == UNKNOWN]

def next_to_ask(profile: str | None, facts: dict[str, str], n: int = 1) -> list[str]:
    return missing_fields(profile, facts)[:n]

# ---------- нормализация значений ----------
MONTHS = {"января": 1, "февраля": 2, "марта": 3, "апреля": 4, "мая": 5, "июня": 6, "июля": 7, "августа": 8,
          "сентября": 9, "октября": 10, "ноября": 11, "декабря": 12}

def parse_date(text: str, today: date | None = None) -> str | None:
    today = today or date.today()
    t = text.lower()
    m = re.search(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", t)
    try:
        if m:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})", t)
        if m:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3))).isoformat()
        m = re.search(r"(\d{1,2})\s+(" + "|".join(MONTHS) + r")(?:\s+(\d{4}))?", t)
        if m:
            y = int(m.group(3)) if m.group(3) else today.year
            d = date(y, MONTHS[m.group(2)], int(m.group(1)))
            if not m.group(3) and d > today:
                d = date(y - 1, d.month, d.day)
            return d.isoformat()
    except ValueError:
        return None
    if "вчера" in t:
        return date.fromordinal(today.toordinal() - 1).isoformat()
    if "сегодня" in t:
        return today.isoformat()
    return None

def parse_money(text: str) -> str | None:
    m = re.search(r"(\d[\d\s\u00a0]*(?:[.,]\d{1,2})?)\s*(?:руб|₽|р\b|р\.|тыс)?", text.lower())
    if not m:
        return None
    raw = re.sub(r"[\s\u00a0]", "", m.group(1)).replace(",", ".")
    try:
        v = float(raw)
    except ValueError:
        return None
    if "тыс" in text.lower() and v < 1000:
        v *= 1000
    return str(int(v)) if v == int(v) else f"{v:.2f}"

def parse_requirement(text: str) -> str | None:
    t = text.lower()
    for key, kws in REQ_KEYWORDS.items():
        if any(k in t for k in kws):
            return key
    return None

def normalize(key: str, value: str) -> str | None:
    """Приводит значение к каноническому виду; None, если значение непригодно."""
    value = (value or "").strip()
    if not value:
        return None
    if value == UNKNOWN:
        return UNKNOWN
    kind = FIELDS.get(key, ("", "", "text"))[2]
    if kind == "date":
        return parse_date(value)
    if kind == "money":
        if value.lower() in ("нет", "не денежное"):
            return "0"
        return parse_money(value)
    if kind == "req":
        return value if value in REQUIREMENTS else parse_requirement(value)
    return value[:500]

def fmt_date(iso: str) -> str:
    try:
        return datetime.strptime(iso, "%Y-%m-%d").strftime("%d.%m.%Y")
    except Exception:
        return iso

def fmt_value(key: str, value: str) -> str:
    kind = FIELDS.get(key, ("", "", "text"))[2]
    if value == UNKNOWN:
        return "не известно заявителю"
    if kind == "date":
        return fmt_date(value)
    if kind == "money":
        try:
            n = float(value)
            return (f"{int(n):,}" if n == int(n) else f"{n:,.2f}").replace(",", " ") + " руб"
        except ValueError:
            return f"{value} руб"
    if kind == "req":
        return REQUIREMENTS.get(value, value)
    return value
