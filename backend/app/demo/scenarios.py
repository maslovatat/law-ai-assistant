"""Демонстрационные сценарии с ВЫМЫШЛЕННЫМИ данными и тестовыми файлами."""
import io, json, secrets
from datetime import date, timedelta
from pathlib import Path
from ..config import settings
from ..db import now
from .. import cases as CS
from ..files import service as FS
from ..docs import render
from ..legal import categories as C

DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME = "demo@example.com", "demo12345", "Иван Петров (демо)"
APPLICANT = {"applicant_name": "Петров Иван Сергеевич (вымышленное лицо)", "applicant_address": "г. Москва, ул. Примерная, д. 1, кв. 10",
             "applicant_phone": "+7 900 000-00-00"}

def _pdf(lines: list[str]) -> bytes:
    return render.to_pdf("\n".join(lines))

def _png(text: str) -> bytes:
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new("RGB", (640, 400), (205, 212, 222))
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype(str(settings.fonts_dir / "DejaVuSerif.ttf"), 22)
    d.rectangle([40, 120, 600, 340], outline=(60, 70, 90), width=4)
    d.line([300, 200, 380, 260], fill=(150, 30, 30), width=6)
    d.text((40, 30), "ДЕМО-ФОТО (не реальное)", fill=(30, 40, 60), font=font)
    d.text((40, 70), text, fill=(30, 40, 60), font=font)
    buf = io.BytesIO(); im.save(buf, "PNG")
    return buf.getvalue()

def _d(days_ago: int) -> date:
    return date.today() - timedelta(days=days_ago)

def scenarios() -> list[dict]:
    fr_buy, fr_def = _d(14), _d(7)
    car = _d(3)
    sv = _d(20)
    f = lambda d: d.strftime("%d.%m.%Y")
    return [
        {"title": "[Демо] Неисправный холодильник", "category": "consumer_goods", "complete": True,
         "messages": [("user", "Купил холодильник Samsung RB-34 в магазине ТехноМаркет, через неделю перестал работать."),
                      ("assistant", "Понял, это похоже на обращение по теме «Защита прав потребителей: товар». Уточните, пожалуйста, когда именно вы приобрели холодильник и есть ли чек?"),
                      ("user", f"Купил {f(fr_buy)}, чек и гарантийный талон есть. Заплатил 45990 руб."),
                      ("assistant", "Принял. Что именно не так с холодильником и когда вы это заметили?"),
                      ("user", f"Перестал охлаждать {f(fr_def)}. Хочу вернуть деньги."),
                      ("assistant", "Спасибо, все необходимые сведения собраны. Проверьте их в карточке дела справа.")],
         "facts": {**APPLICANT, "seller_name": "ООО «ТехноМаркет»", "seller_address": "г. Москва, ул. Торговая, д. 5", "product": "Холодильник Samsung RB-34",
                   "purchase_date": fr_buy.isoformat(), "price": "45990", "defect": "Перестал охлаждать", "defect_date": fr_def.isoformat(), "requirement": "refund"},
         "files": [("Чек.pdf", _pdf(["ООО «ТехноМаркет»", "Кассовый чек № 004512", f"Дата: {f(fr_buy)}", "Холодильник Samsung RB-34", "ИТОГО: 45990 руб."])),
                   ("Гарантийный талон.pdf", _pdf(["ГАРАНТИЙНЫЙ ТАЛОН", "Холодильник Samsung RB-34", f"Дата продажи: {f(fr_buy)}", "Гарантийный срок: 12 месяцев", "Продавец: ООО «ТехноМаркет»"]))]},
        {"title": "[Демо] Повреждение авто на парковке", "category": "auto_damage", "complete": True,
         "messages": [("user", "Мне помяли автомобиль на парковке. Есть фото повреждений, но виновник не выходит на связь. Что делать?"),
                      ("assistant", "Понял, это похоже на обращение по теме «Автомобили и ДТП». Когда это произошло?"),
                      ("user", f"{f(car)}, парковка у дома, г. Москва, ул. Примерная, д. 1."),
                      ("assistant", "Принял. Что известно о втором автомобиле?"),
                      ("user", "Lada Vesta, А123ВС77, владелец Сидоров Пётр Андреевич. Ремонт оценили в 38000 руб."),
                      ("assistant", "Спасибо, все необходимые сведения собраны. Проверьте их в карточке дела справа.")],
         "facts": {**APPLICANT, "incident_date": car.isoformat(), "incident_place": "Парковка у дома, г. Москва, ул. Примерная, д. 1",
                   "damage_description": "Вмятина и царапины на заднем бампере и крыле", "counterpart_name": "Сидоров Пётр Андреевич (вымышленное лицо)",
                   "counterpart_vehicle": "Lada Vesta, А123ВС77", "counterpart_address": "г. Москва, ул. Вымышленная, д. 7, кв. 3",
                   "damage_amount": "38000", "requirement": "compensation"},
         "files": [("Фото повреждений 1.png", _png("Вмятина на заднем бампере")), ("Фото повреждений 2.png", _png("Царапины на крыле")),
                   ("Смета ремонта.pdf", _pdf(["СМЕТА РЕМОНТА (демо)", "Оценка ущерба: кузовной ремонт и покраска", "ИТОГО: 38000 руб."]))]},
        {"title": "[Демо] Некачественный ремонт (диалог не завершён)", "category": "consumer_service", "complete": False,
         "messages": [("user", "Заказал ремонт ванной, оплатил, а мастер сделал плохо — плитка отваливается."),
                      ("assistant", "Понял, это похоже на обращение по теме «Защита прав потребителей: услуга». Кто исполнитель услуги?")],
         "facts": {**APPLICANT, "service": "Ремонт ванной комнаты (укладка плитки)", "defect": "Плитка отваливается", "price": "80000"},
         "files": [("Договор подряда.pdf", _pdf(["ДОГОВОР ПОДРЯДА (демо)", f"Дата: {f(sv)}", "Исполнитель: ИП Смирнов А. А.", "Работы: ремонт ванной комнаты", "ИТОГО: 80000 руб."]))]},
    ]

def load(conn, user) -> list[dict]:
    created = []
    for sc in scenarios():
        if conn.execute("SELECT 1 FROM conversations WHERE user_id=? AND title=?", (user["id"], sc["title"])).fetchone():
            continue
        ts = now()
        case_id = conn.execute("INSERT INTO legal_cases(user_id,title,category,description,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                               (user["id"], sc["title"], sc["category"], sc["messages"][0][1][:500], ts, ts)).lastrowid
        cid = conn.execute("INSERT INTO conversations(user_id,case_id,title,created_at,updated_at) VALUES(?,?,?,?,?)",
                           (user["id"], case_id, sc["title"], ts, ts)).lastrowid
        for role, text in sc["messages"]:
            conn.execute("INSERT INTO messages(conversation_id,role,content,meta_json,created_at) VALUES(?,?,?,?,?)",
                         (cid, role, text, json.dumps({"provider": "demo"}), ts))
        for k, v in sc["facts"].items():
            CS.set_fact(conn, case_id, k, v, "demo", False)
        for name, data in sc["files"]:
            FS.store_upload(conn, user, case_id, name, data)
        facts = CS.get_facts(conn, case_id)
        missing = C.missing_fields(sc["category"], facts)
        conn.execute("UPDATE legal_cases SET last_asked=? WHERE id=?", (missing[0] if missing else None, case_id))
        CS.recompute(conn, case_id)
        created.append({"conversation_id": cid, "case_id": case_id, "title": sc["title"]})
    return created

def ensure_demo_user(conn):
    from .. import security
    if not conn.execute("SELECT 1 FROM users WHERE email=?", (DEMO_EMAIL,)).fetchone():
        conn.execute("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)",
                     (DEMO_EMAIL, DEMO_NAME, security.hash_password(DEMO_PASSWORD), now()))
