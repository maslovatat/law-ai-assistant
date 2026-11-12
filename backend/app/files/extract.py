"""Проверка загрузок, извлечение текста (PDF/DOCX/OCR) и эвристический анализ документа.

Анализ выполняется ЛОКАЛЬНО: из текста достаются реквизиты продавца, дата, сумма,
товар и ИНН. Текст документа используется затем моделью для уточнения фактов.
"""
import io, re, shutil
from pathlib import Path
from ..config import settings
from ..legal import categories as C

ALLOWED = {".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
           ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
MAGIC = {".pdf": [b"%PDF"], ".docx": [b"PK\x03\x04"], ".jpg": [b"\xff\xd8\xff"], ".jpeg": [b"\xff\xd8\xff"], ".png": [b"\x89PNG"]}

class FileRejected(Exception):
    pass

def validate(name: str, data: bytes) -> tuple[str, str]:
    ext = Path(name or "").suffix.lower()
    if ext not in ALLOWED:
        raise FileRejected("Неподдерживаемый формат. Разрешены: PDF, DOCX, JPG, PNG.")
    if not data:
        raise FileRejected("Файл пуст.")
    if len(data) > settings.max_upload_bytes:
        raise FileRejected(f"Файл больше {settings.max_upload_bytes // 1024 // 1024} МБ.")
    if not any(data.startswith(m) for m in MAGIC[ext]):
        raise FileRejected("Содержимое файла не соответствует его расширению.")
    return ext, ALLOWED[ext]

def _ocr(path: Path) -> tuple[str, str]:
    try:
        import pytesseract
        from PIL import Image
    except Exception:
        return "", "OCR недоступен: не установлен pytesseract."
    cmd = settings.tesseract_cmd or shutil.which("tesseract")
    if not cmd:
        return "", "OCR недоступен: Tesseract не установлен (см. README). Введите сведения вручную."
    pytesseract.pytesseract.tesseract_cmd = cmd
    try:
        langs = set(pytesseract.get_languages(config=""))
    except Exception:
        langs = set()
    lang = "rus+eng" if "rus" in langs else "eng"
    note = "" if "rus" in langs else "В Tesseract нет русского языка (rus) — распознавание кириллицы будет неточным."
    try:
        with Image.open(path) as im:
            return pytesseract.image_to_string(im, lang=lang), note
    except Exception as e:
        return "", f"Ошибка OCR: {e}"

def extract_text(path: Path, ext: str) -> tuple[str, str]:
    """Возвращает (текст, примечание)."""
    try:
        if ext == ".pdf":
            from pypdf import PdfReader
            r = PdfReader(str(path))
            text = "\n".join((p.extract_text() or "") for p in r.pages[:20])
            return text, ("" if text.strip() else "В PDF нет текстового слоя (скан). Загрузите изображение для OCR.")
        if ext == ".docx":
            import docx
            d = docx.Document(str(path))
            parts = [p.text for p in d.paragraphs]
            for t in d.tables:
                for row in t.rows:
                    parts.append(" | ".join(c.text for c in row.cells))
            return "\n".join(parts), ""
        return _ocr(path)
    except Exception as e:
        return "", f"Не удалось прочитать файл: {e}"

# ---------- эвристический анализ ----------
ORG_RE = re.compile(r"((?:ООО|ИП|АО|ПАО|ОАО|ЗАО)\s*[«\"“]?[^\n,;]{2,60}[»\"”]?)")
ADDR_RE = re.compile(
    r"(?:\b(?P<postal>\d{6})\b\s*,\s*)?"
    r"(?:г\.\s*|город\s+)?(?P<city>[А-ЯЁ][а-яё\-]{2,30})\s*,\s*"
    r"(?P<kind>(?i:ул\.?|улица|пр-т|проспект|пер\.?|переулок|шоссе|бульвар|б-р|наб\.?|набережная|проезд|мкр\.?|микрорайон))\s+"
    r"(?P<street>[^,\n]{2,60}?)\s*,\s*"
    r"(?i:д\.?\s*|дом\s*)(?P<house>\d+[^\s,;]*)"
    r"(?:\s*,\s*(?i:стр\.?\s*|строение\s*|корп\.?\s*|корпус\s*)(?P<build>\d+[^\s,;]*))?")
PRODUCT_WORD = re.compile(r"(?i)видеокарт\w*|ноутбук\w*|телефон\w*|смартфон\w*|холодильник\w*|телевизор\w*|стиральн\w*|"
                          r"пылесос\w*|наушник\w*|монитор\w*|клавиатур\w*|процессор\w*|материнск\w*|планшет\w*|камер\w*|"
                          r"колонк\w*|часы\w*")
PRODUCT_HINT = re.compile(PRODUCT_WORD.pattern + r"|\b(?:rtx|gtx|rx)\s?\d{3,4}\b", re.I)

def detect_doc_type(text: str, filename: str, ext: str) -> str:
    t, f = text.lower(), filename.lower()
    if re.search(r"гарантийн", t) or re.search(r"гарант", f):
        return "warranty"
    if re.search(r"смет|оценк.{0,10}ущерб|калькуляц", t) or re.search(r"смет|estimate|оценк", f):
        return "estimate"
    if re.search(r"договор|акт\b|расписк|подряд", t) or re.search(r"договор|акт|contract|расписк", f):
        return "contract"
    if re.search(r"кассов|товарный чек|итого|чек\b|квитанц|оплат", t) or re.search(r"чек|receipt|квитанц", f):
        return "receipt"
    if ext in (".jpg", ".jpeg", ".png"):
        return "photo"
    return "other"

def _flatten(text: str) -> str:
    return re.sub(r"[ \t]*\n[ \t]*", ", ", text or "")

def _find_org(text: str) -> tuple[str, int] | None:
    m = ORG_RE.search(text)
    if not m:
        return None
    return m.group(1).strip(" .,;"), m.start()

def _find_address(text: str, org_pos: int | None = None) -> str | None:
    flat = _flatten(text)
    matches = list(ADDR_RE.finditer(flat))
    if not matches:
        return None
    chosen = matches[0]
    if org_pos is not None:
        near = [m for m in matches if m.start() > org_pos]
        if near:
            chosen = near[0]
    return re.sub(r"\s+", " ", chosen.group(0)).strip(" ,")

def _find_product(text: str) -> str | None:
    candidates: list[tuple[int, int, str]] = []
    for line in (text or "").splitlines():
        if not PRODUCT_HINT.search(line):
            continue
        s = re.sub(r"(?i)\s+\d+\s*(?:шт\.?|ед\.?)\b.*$", "", line.strip())
        s = re.sub(r"(?i)\s+\d[\d\s]*(?:[.,]\d{2})?\s*(?:руб|₽)\s*$", "", s)
        s = re.sub(r"\s{2,}", " ", s).strip(" ,;")
        if 3 <= len(s) <= 120:
            candidates.append((0 if PRODUCT_WORD.search(line) else 1, len(s), s))
    if not candidates:
        return None
    candidates.sort()
    return candidates[0][2]

def analyze(text: str, filename: str, ext: str) -> dict:
    doc_type = detect_doc_type(text, filename, ext)
    found: dict[str, str] = {}
    flat = _flatten(text)
    d = C.parse_date(text) if text else None
    if d:
        found["date"] = d
    m = re.search(r"(?:итого|к оплате|сумма|всего|оплачено)[^\d\n]{0,25}(\d[\d\s]*(?:[.,]\d{1,2})?)", text, re.I)
    if m:
        v = C.parse_money(m.group(1))
        if v:
            found["amount"] = v
    org = _find_org(flat)
    if org:
        found["org"] = org[0]
    addr = _find_address(text, org[1] if org else None)
    if addr:
        found["address"] = addr
    product = _find_product(text)
    if product:
        found["product"] = product
    inn = re.search(r"ИНН[\s:№]*(\d{10,12})", text, re.I)
    if inn:
        found["inn"] = inn.group(1)
    label = C.DOC_TYPE_LABELS.get(doc_type, doc_type)
    parts = [f"Тип документа: {label}."]
    if found:
        names = {"date": "дата", "amount": "сумма", "org": "организация", "address": "адрес", "product": "товар", "inn": "ИНН"}
        parts.append("Найдено: " + "; ".join(
            f"{names[k]} — {C.fmt_date(v) if k == 'date' else v}" for k, v in found.items()) + ".")
    else:
        parts.append("Автоматически извлечь значимые сведения не удалось.")
    return {"doc_type": doc_type, "found": found, "summary": " ".join(parts),
            "warning": "Сведения распознаны автоматически и могут содержать ошибки — проверьте их."}

def proposals(profile: str | None, found: dict) -> dict[str, str]:
    """Переводит найденные значения в ключи фактов выбранного профиля."""
    p = C.PROFILES.get(profile or "")
    if not p:
        return {}
    out = {}
    if "date" in found:
        out[p["date"]] = found["date"]
    if "amount" in found:
        out[p["money"]] = found["amount"]
    if "org" in found and p["recipient"][0] in p["required"]:
        out[p["recipient"][0]] = found["org"]
    if "address" in found and p["recipient"][1] in p["required"]:
        out[p["recipient"][1]] = found["address"]
    if "product" in found and "product" in p["required"]:
        out["product"] = found["product"]
    if "inn" in found:
        out["recipient_details"] = f"ИНН {found['inn']}"
    return out

def _norm_text(s: str) -> str:
    return re.sub(r"[^а-яёa-z0-9]", "", (s or "").lower())

def find_contradictions(profile: str | None, facts: dict[str, str], files: list[dict]) -> list[dict]:
    import json
    res = []
    for f in files:
        if f.get("doc_type") not in ("receipt", "contract", "warranty", "estimate"):
            continue
        a = json.loads(f["analysis_json"]) if f.get("analysis_json") else {}
        for key, doc_val in proposals(profile, a.get("found", {})).items():
            if key.endswith("_address") or key == "recipient_details":
                continue
            user_val = facts.get(key)
            if not user_val or user_val == C.UNKNOWN:
                continue
            if key in ("seller_name", "contractor_name", "counterpart_name", "product"):
                x, y = _norm_text(doc_val), _norm_text(user_val)
                same = bool(x and y and (x in y or y in x))
            elif C.FIELDS[key][2] == "money":
                try:
                    same = abs(float(doc_val) - float(user_val)) < 0.01
                except ValueError:
                    same = True
            else:
                same = doc_val == user_val
            if not same:
                res.append({"file_id": f["id"], "file_name": f["original_name"], "file_verified": bool(f.get("verified")),
                            "key": key, "label": C.label(key), "document_value": C.fmt_value(key, doc_val),
                            "user_value": C.fmt_value(key, user_val), "raw_document_value": doc_val})
    return res
