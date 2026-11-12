import io, time
from datetime import date, timedelta

def api(client, h, method, url, **kw):
    return getattr(client, method)(url, headers=h, **kw)

def say(client, h, cid, text):
    r = api(client, h, "post", f"/api/conversations/{cid}/messages", json={"content": text})
    assert r.status_code == 200, r.text
    return r.json()

def fmt(d): return d.strftime("%d.%m.%Y")

def test_full_user_journey(client, user):
    h = user
    # 2-3. новое обращение, сообщение
    conv = api(client, h, "post", "/api/conversations", json={}).json()
    cid = conv["conversation"]["id"]
    assert conv["messages"][0]["role"] == "assistant"
    d1 = say(client, h, cid, "Купил холодильник Samsung в магазине, через неделю перестал работать")
    assert d1["case"]["category"] == "consumer_goods"
    last = d1["messages"][-1]["content"]
    assert "?" in last                                   # 4. уточняющий вопрос
    n_missing = len(d1["case"]["missing_information"])
    # ответы по одному вопросу; не переспрашивает известное
    answers = ["Петров Иван Сергеевич", "г. Москва, ул. Примерная, д. 1", "ООО «ТехноМаркет»", "г. Москва, ул. Торговая, д. 5",
               fmt(date.today() - timedelta(days=14)), "45990 руб", fmt(date.today() - timedelta(days=7)), "верните деньги"]
    asked = []
    for a in answers:
        asked.append(d1["messages"][-1]["content"])
        d1 = say(client, h, cid, a)
    assert len(set(asked)) == len(asked)
    assert d1["case"]["ready"], d1["case"]["missing_information"]
    assert "product" not in d1["case"]["missing_keys"]
    case_id = d1["case"]["id"]
    # 5. загрузка файлов (чек, текстовый PDF)
    from app.demo.scenarios import _pdf
    receipt = _pdf(["ООО «ТехноМаркет»", "Кассовый чек № 1", f"Дата: {fmt(date.today() - timedelta(days=14))}", "ИТОГО: 45990 руб."])
    r = api(client, h, "post", f"/api/conversations/{cid}/files", files={"file": ("Чек.pdf", receipt, "application/pdf")})
    assert r.status_code == 200
    case = r.json()["case"]
    assert case["files"][0]["doc_type"] == "receipt" and not case["files"][0]["verified"]
    assert not case["contradictions"]
    # 6-8. «перезапуск» — новая сессия клиента читает те же данные из SQLite
    again = api(client, h, "get", f"/api/conversations/{cid}").json()
    assert len(again["messages"]) >= 18
    say(client, h, cid, "Спасибо")
    # 9. претензия
    doc = api(client, h, "post", f"/api/cases/{case_id}/documents", json={"type": "claim"})
    assert doc.status_code == 200, doc.text
    doc = doc.json(); did = doc["id"]
    assert "# Претензия" in doc["content"] and "45 990 руб" in doc["content"] and "ст. 18" in doc["content"]
    assert "[НЕ УКАЗАНО" not in doc["content"]
    assert doc["versions"][0]["review"]["ok"]
    # 11-12. правка → версия 2
    new_text = doc["content"] + "\nДополнительно прошу ответить письменно.\n"
    v2 = api(client, h, "post", f"/api/documents/{did}/versions", json={"content": new_text, "note": "правка"}).json()
    assert v2["latest_version"] == 2 and len(v2["versions"]) == 2
    assert api(client, h, "post", f"/api/documents/{did}/versions", json={"content": new_text}).status_code == 409  # без изменений
    # 13. скачивание
    pdf = api(client, h, "get", f"/api/documents/{did}/versions/2/download?fmt=pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    dx = api(client, h, "get", f"/api/documents/{did}/versions/2/download?fmt=docx")
    assert dx.status_code == 200 and dx.content.startswith(b"PK")
    import docx
    assert "Претензия" in "\n".join(p.text for p in docx.Document(io.BytesIO(dx.content)).paragraphs)
    # 14-15. подписание: только последняя версия
    assert api(client, h, "post", f"/api/documents/{did}/versions/1/sign").status_code == 409
    sig = api(client, h, "post", f"/api/documents/{did}/versions/2/sign").json()
    assert sig["status"] == "pending"
    # отправка без подписи невозможна
    v2id = v2["versions"][0]["id"]
    body = {"document_version_id": v2id, "recipient_name": "ООО «ТехноМаркет»", "recipient_address": "г. Москва, ул. Торговая, д. 5"}
    assert api(client, h, "post", "/api/dispatches", json=body).status_code == 409
    s = api(client, h, "post", f"/api/signatures/{sig['id']}/confirm").json()
    assert s["status"] == "signed_demo" and s["verification"]["valid"] and s["verification"]["legal_force"] is False
    s2 = api(client, h, "post", f"/api/signatures/{sig['id']}/confirm").json()          # повторное подтверждение безопасно
    assert s2["signed_at"] == s["signed_at"]
    assert api(client, h, "get", f"/api/signatures/{sig['id']}/download").content.startswith(b"%PDF")
    # неизменяемость: правка → новая версия 3, подпись версии 2 остаётся
    v3 = api(client, h, "post", f"/api/documents/{did}/versions", json={"content": new_text + "ещё правка\n"}).json()
    assert v3["latest_version"] == 3 and v3["versions"][0]["status"] == "ready" and v3["versions"][1]["status"] == "signed"
    # 16-18. отправка
    d = api(client, h, "post", "/api/dispatches", json=body).json()
    assert d["status"] == "prepared" and d["tracking_number"] is None
    d_again = api(client, h, "post", "/api/dispatches", json=body).json()
    assert d_again["id"] == d["id"]
    sub = api(client, h, "post", f"/api/dispatches/{d['id']}/submit").json()
    assert sub["status"] == "accepted" and sub["tracking_number"].startswith("DEMO")
    sub2 = api(client, h, "post", f"/api/dispatches/{d['id']}/submit").json()           # двойной клик
    assert sub2["tracking_number"] == sub["tracking_number"]
    time.sleep(2.3)
    fin = api(client, h, "get", f"/api/dispatches/{d['id']}").json()
    assert fin["status"] == "delivered"
    assert [e["status"] for e in fin["events"]] == ["prepared", "accepted", "sent", "delivered"]
    assert fin["confirmation"]["demo"] and fin["deadlines"]
    # 19. статус дела
    c = api(client, h, "get", f"/api/cases/{case_id}").json()
    assert c["status"] == "delivered"
    assert len(api(client, h, "get", "/api/dispatches").json()) == 1

def test_signed_version_immutable_in_db(client, user):
    import sqlite3, pytest
    from app import db
    h = user
    from app.demo import scenarios  # noqa
    api(client, h, "post", "/api/demo/load")
    cases = api(client, h, "get", "/api/cases").json()
    c1 = next(c for c in cases if "холодильник" in c["title"])
    did = api(client, h, "post", f"/api/cases/{c1['id']}/documents", json={"type": "claim"}).json()["id"]
    sig = api(client, h, "post", f"/api/documents/{did}/versions/1/sign").json()
    api(client, h, "post", f"/api/signatures/{sig['id']}/confirm")
    conn = db.connect()
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("UPDATE document_versions SET content='подмена' WHERE document_id=?", (did,))
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("DELETE FROM document_versions WHERE document_id=?", (did,))
    conn.close()

def test_isolation_between_users(client, user):
    h1 = user
    conv = api(client, h1, "post", "/api/conversations", json={}).json()
    cid, case_id = conv["conversation"]["id"], conv["case"]["id"]
    r = client.post("/api/auth/register", json={"email": "other@example.com", "name": "Другой", "password": "secret123"})
    if r.status_code != 200:
        r = client.post("/api/auth/login", json={"email": "other@example.com", "password": "secret123"})
    h2 = {"Authorization": "Bearer " + r.json()["token"]}
    for url in (f"/api/conversations/{cid}", f"/api/cases/{case_id}", f"/api/cases/{case_id}/structured"):
        assert api(client, h2, "get", url).status_code == 404
    assert api(client, h2, "post", f"/api/conversations/{cid}/messages", json={"content": "привет"}).status_code == 404
    assert api(client, h2, "delete", f"/api/conversations/{cid}").status_code == 404
    api(client, h1, "post", "/api/demo/load")
    cs = api(client, h1, "get", "/api/cases").json()
    fr = next(c for c in cs if "холодильник" in c["title"])
    did = api(client, h1, "post", f"/api/cases/{fr['id']}/documents", json={"type": "claim"}).json()["id"]
    assert api(client, h2, "get", f"/api/documents/{did}").status_code == 404
    assert api(client, h2, "get", f"/api/documents/{did}/versions/1/download?fmt=pdf").status_code == 404
    assert api(client, h2, "post", f"/api/documents/{did}/versions/1/sign").status_code == 404
    assert client.get("/api/cases").status_code == 401

def test_auth_validation(client):
    assert client.post("/api/auth/register", json={"email": "bad", "name": "x", "password": "123456"}).status_code == 422
    assert client.post("/api/auth/register", json={"email": "a@b.ru", "name": "x", "password": "1"}).status_code == 422
    client.post("/api/auth/register", json={"email": "dup@b.ru", "name": "x", "password": "123456"})
    assert client.post("/api/auth/register", json={"email": "dup@b.ru", "name": "x", "password": "123456"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "dup@b.ru", "password": "wrong!"}).status_code == 401
    t = client.post("/api/auth/login", json={"email": "demo@example.com", "password": "demo12345"}).json()["token"]
    h = {"Authorization": "Bearer " + t}
    assert client.get("/api/auth/me", headers=h).status_code == 200
    client.post("/api/auth/logout", headers=h)
    assert client.get("/api/auth/me", headers=h).status_code == 401
    from app import db
    c = db.connect()
    assert "demo12345" not in c.execute("SELECT password_hash FROM users WHERE email='demo@example.com'").fetchone()[0]

def test_files_validation(client, user):
    h = user
    cid = api(client, h, "post", "/api/conversations", json={}).json()["conversation"]["id"]
    up = lambda name, data: api(client, h, "post", f"/api/conversations/{cid}/files", files={"file": (name, data)})
    assert up("virus.exe", b"MZ....").status_code == 400
    assert up("fake.pdf", b"not a pdf").status_code == 400
    assert up("empty.pdf", b"").status_code == 400
    assert up("big.pdf", b"%PDF" + b"0" * (11 * 1024 * 1024)).status_code == 400
    from app.demo.scenarios import _png
    r = up("photo.png", _png("тест"))
    assert r.status_code == 200 and r.json()["case"]["files"][0]["doc_type"] in ("photo", "other")

def test_validation_and_empty_fields(client, user):
    h = user
    cid = api(client, h, "post", "/api/conversations", json={}).json()["conversation"]["id"]
    assert api(client, h, "post", f"/api/conversations/{cid}/messages", json={"content": "   "}).status_code == 422
    assert api(client, h, "post", f"/api/conversations/{cid}/messages", json={}).status_code == 422
    case_id = api(client, h, "get", f"/api/conversations/{cid}").json()["conversation"]["case_id"]
    r = api(client, h, "post", f"/api/cases/{case_id}/documents", json={"type": "claim"})
    assert r.status_code == 409                          # категория не определена
    assert api(client, h, "post", f"/api/dispatches", json={"document_version_id": 1, "recipient_name": "", "recipient_address": ""}).status_code == 422

def test_placeholders_block_signing_and_lawyer_handoff(client, user):
    h = user
    api(client, h, "post", "/api/demo/load")
    cs = {c["title"]: c for c in api(client, h, "get", "/api/cases").json()}
    svc = next(c for t, c in cs.items() if "ремонт" in t.lower())
    # неполное дело: низкая оценка → передача юристу
    r = api(client, h, "post", f"/api/cases/{svc['id']}/documents", json={"type": "claim"})
    assert r.status_code == 409 and "юрист" in r.json()["detail"].lower()
    # критический риск независимо от оценки
    car = next(c for t, c in cs.items() if "авто" in t.lower())
    api(client, h, "put", f"/api/cases/{car['id']}/facts", json={"key": "damage_description", "value": "Водитель получил травму здоровья, вмятина"})
    assert api(client, h, "get", f"/api/cases/{car['id']}").json()["confidence"]["level"] == "lawyer"
    assert api(client, h, "post", f"/api/cases/{car['id']}/documents", json={"type": "claim"}).status_code == 409
    # неизвестный виновник → отметка в документе → подписание заблокировано
    api(client, h, "put", f"/api/cases/{car['id']}/facts", json={"key": "damage_description", "value": "Вмятина на бампере"})
    api(client, h, "put", f"/api/cases/{car['id']}/facts", json={"key": "counterpart_name", "value": "__unknown__"})
    doc = api(client, h, "post", f"/api/cases/{car['id']}/documents", json={"type": "claim"}).json()
    assert "[НЕ УКАЗАНО: Виновник / другая сторона]" in doc["content"]
    assert api(client, h, "post", f"/api/documents/{doc['id']}/versions/1/sign").status_code == 409
    fixed = doc["content"].replace("[НЕ УКАЗАНО: Виновник / другая сторона]", "Собственнику автомобиля Lada Vesta")
    api(client, h, "post", f"/api/documents/{doc['id']}/versions", json={"content": fixed})
    assert api(client, h, "post", f"/api/documents/{doc['id']}/versions/2/sign").status_code == 200

def test_contradiction_detection(client, user):
    h = user
    api(client, h, "post", "/api/demo/load")
    c = next(c for c in api(client, h, "get", "/api/cases").json() if "холодильник" in c["title"])
    api(client, h, "put", f"/api/cases/{c['id']}/facts", json={"key": "price", "value": "50000"})
    snap = api(client, h, "get", f"/api/cases/{c['id']}").json()
    assert any(x["key"] == "price" for x in snap["contradictions"])
    fid = next(f["id"] for f in snap["files"] if f["doc_type"] == "receipt")
    snap = api(client, h, "post", f"/api/files/{fid}/verify", json={"verified": True}).json()
    assert snap["confidence"]["details"]["contradictions"]["score"] < 100 and snap["confidence"]["level"] == "lawyer"
    snap = api(client, h, "post", f"/api/files/{fid}/verify", json={"verified": True, "apply": ["price"]}).json()
    assert not snap["contradictions"]

def test_ai_unavailable_falls_back_without_retry_storm(client, user, monkeypatch):
    from app.ai import runtime
    from app.config import settings
    h = user
    api(client, h, "put", "/api/settings", json={"provider": "gemini"})
    assert settings.gemini_key == ""
    cid = api(client, h, "post", "/api/conversations", json={}).json()["conversation"]["id"]
    out = say(client, h, cid, "Купил телефон, он сломался")
    last = out["messages"][-1]
    assert last["meta"]["notice"] and "GEMINI_API_KEY" in last["meta"]["notice"]
    assert out["case"]["category"] == "consumer_goods"                                   # диалог продолжается
    out = say(client, h, cid, "Иванов Иван")
    assert "временно отключён" in out["messages"][-1]["meta"]["notice"]                   # повторных запросов нет
    api(client, h, "put", "/api/settings", json={"provider": "demo"})
    assert api(client, h, "post", "/api/settings/test").json()["ok"]

def test_gemini_json_path_with_mock(client, user, monkeypatch):
    from app.ai.gemini import GeminiProvider
    from app.config import settings
    monkeypatch.setattr(settings, "gemini_key", "x")
    calls = []
    def fake(self, system, user_, max_tokens, json_mode=True):
        calls.append((len(system) + len(user_), max_tokens))
        return '```json\n{"reply":"Когда вы купили товар?","category":"consumer_goods","facts":{"product":"Холодильник","price":"45 990 руб","bogus":"x","purchase_date":"вчера"}}\n```'
    monkeypatch.setattr(GeminiProvider, "generate", fake)
    h = user
    api(client, h, "put", "/api/settings", json={"provider": "gemini"})
    cid = api(client, h, "post", "/api/conversations", json={}).json()["conversation"]["id"]
    out = say(client, h, cid, "Купил холодильник, не работает")
    assert len(calls) == 1 and calls[0][1] <= 1000                   # один запрос на сообщение, ограничение ответа
    facts = {f["key"]: f["value"] for f in out["case"]["facts"] if f["value"]}
    assert facts["product"] == "Холодильник" and facts["price"] == "45990" and "bogus" not in facts
    assert facts["purchase_date"] == (date.today() - timedelta(days=1)).isoformat()
    # ИИ не может перезаписать подтверждённые пользователем сведения
    case_id = out["case"]["id"]
    api(client, h, "put", f"/api/cases/{case_id}/facts", json={"key": "product", "value": "Стиральная машина"})
    out = say(client, h, cid, "ещё одно сообщение")
    assert {f["key"]: f["value"] for f in out["case"]["facts"]}["product"] == "Стиральная машина"
    api(client, h, "put", "/api/settings", json={"provider": "demo"})

def test_rename_delete_continue(client, user):
    h = user
    cid = api(client, h, "post", "/api/conversations", json={"title": "Тест"}).json()["conversation"]["id"]
    assert api(client, h, "patch", f"/api/conversations/{cid}", json={"title": "Новое имя"}).status_code == 200
    assert any(c["title"] == "Новое имя" for c in api(client, h, "get", "/api/conversations").json())
    case_id = api(client, h, "get", f"/api/conversations/{cid}").json()["conversation"]["case_id"]
    assert api(client, h, "delete", f"/api/conversations/{cid}").status_code == 200
    assert api(client, h, "get", f"/api/conversations/{cid}").status_code == 404
    assert api(client, h, "get", f"/api/cases/{case_id}").status_code == 200            # дело сохраняется

def test_structured_matches_spec(client, user):
    h = user
    api(client, h, "post", "/api/demo/load")
    c = next(c for c in api(client, h, "get", "/api/cases").json() if "холодильник" in c["title"])
    s = api(client, h, "get", f"/api/cases/{c['id']}/structured").json()
    assert s["category"] == "consumer_goods" and s["requirements"] == ["refund"] and s["missing_information"] == []


def test_ai_review_and_sample_format(client, user, monkeypatch):
    from app.ai.gemini import GeminiProvider
    from app.config import settings
    h = user
    api(client, h, "post", "/api/demo/load")
    c = next(c for c in api(client, h, "get", "/api/cases").json() if "холодильник" in c["title"])
    d = api(client, h, "post", f"/api/cases/{c['id']}/documents", json={"type": "claim"}).json()
    assert "# Претензия" in d["content"] and "в срок до" in d["content"] and "я обращусь в суд" in d["content"]
    assert "— кассовый" not in d["content"] and "— чек" in d["content"]
    r = api(client, h, "post", f"/api/documents/{d['id']}/versions/1/ai-review").json()
    assert not r["ai_used"] and r["rule_issues"] == [] and "demo" in r["message"]
    # искажённая цена в правке обнаруживается правилами
    api(client, h, "post", f"/api/documents/{d['id']}/versions", json={"content": d["content"].replace("45 990", "54 990")})
    r = api(client, h, "post", f"/api/documents/{d['id']}/versions/2/ai-review").json()
    assert any("Стоимость" in x for x in r["rule_issues"])
    monkeypatch.setattr(settings, "gemini_key", "x")
    calls = []
    monkeypatch.setattr(GeminiProvider, "generate", lambda self, s, u, m, json_mode=True: calls.append(1) or '{"verdict":"needs_fix","summary":"Есть расхождение","issues":[{"severity":"high","text":"Цена отличается"}]}')
    api(client, h, "put", "/api/settings", json={"provider": "gemini"})
    r = api(client, h, "post", f"/api/documents/{d['id']}/versions/2/ai-review").json()
    assert r["ai_used"] and r["ai"]["issues"][0]["severity"] == "high" and len(calls) == 1
    api(client, h, "put", "/api/settings", json={"provider": "demo"})
