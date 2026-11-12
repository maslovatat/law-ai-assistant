"""Document Dispatch: интерфейсы SignatureProvider / DeliveryProvider и демонстрационные реализации.
Реальные Госключ и Почта России НЕ подключены: адреса API не выдумываются. Для подключения нужно
реализовать эти интерфейсы по согласованной документации (СМЭВ/договор с оператором)."""
import hashlib, secrets
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from pathlib import Path
from ..config import settings
from ..db import now
from ..docs import render

DEMO_SIGN_NOTICE = ("ДЕМОНСТРАЦИОННАЯ ПОДПИСЬ (СИМУЛЯЦИЯ). Не является УКЭП/УНЭП, не создана через Госключ "
                    "и не имеет юридической силы.")
DEMO_POST_NOTICE = "Это симуляция Почты России: реальное отправление не создаётся, письмо физически не отправляется."
DELIVERY_LABELS = {"prepared": "Подготовлено", "accepted": "Передано на отправку", "sent": "Отправлено",
                   "delivered": "Доставлено", "failed": "Ошибка"}
SIGN_LABELS = {"pending": "Ожидает подтверждения", "signed_demo": "Демо-подпись поставлена", "failed": "Ошибка"}

class DispatchError(Exception):
    pass

def sha(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

class SignatureProvider(ABC):
    name = "base"
    @abstractmethod
    def create_signing_request(self, version: dict, user: dict) -> dict: ...
    @abstractmethod
    def get_signing_status(self, request_id: str) -> dict: ...
    @abstractmethod
    def get_signed_document(self, signature_id: int) -> Path: ...
    @abstractmethod
    def verify_signature(self, signature_id: int) -> dict: ...

class DeliveryProvider(ABC):
    name = "base"
    @abstractmethod
    def create_dispatch(self, version: dict, signature: dict, user: dict, case_id: int, recipient_name: str, recipient_address: str) -> dict: ...
    @abstractmethod
    def submit_dispatch(self, dispatch_id: int) -> dict: ...
    @abstractmethod
    def get_dispatch_status(self, dispatch_id: int) -> dict: ...
    @abstractmethod
    def get_delivery_confirmation(self, dispatch_id: int) -> dict | None: ...

class MockSignatureProvider(SignatureProvider):
    """Имитация Госключа. Подпись демонстрационная и привязана к хэшу конкретной версии."""
    name = "mock_gosklyuch"

    def __init__(self, conn):
        self.conn = conn

    def create_signing_request(self, version, user):
        ex = self.conn.execute("SELECT * FROM signatures WHERE document_version_id=? AND status IN ('pending','signed_demo')",
                               (version["id"],)).fetchone()
        if ex:
            return dict(ex)
        rid = "DEMO-SIGN-" + secrets.token_hex(4).upper()
        cur = self.conn.execute(
            "INSERT INTO signatures(document_version_id,user_id,provider,request_id,status,is_demo,content_sha256,created_at) "
            "VALUES(?,?,?,?,?,1,?,?)", (version["id"], user["id"], self.name, rid, "pending", sha(version["content"]), now()))
        return dict(self.conn.execute("SELECT * FROM signatures WHERE id=?", (cur.lastrowid,)).fetchone())

    def get_signing_status(self, request_id):
        r = self.conn.execute("SELECT * FROM signatures WHERE request_id=?", (request_id,)).fetchone()
        return dict(r) if r else {}

    def confirm(self, signature_id: int, user: dict) -> dict:
        """Имитация подтверждения пользователем в приложении. Идемпотентно."""
        sig = self.conn.execute("SELECT * FROM signatures WHERE id=? AND user_id=?", (signature_id, user["id"])).fetchone()
        if not sig:
            raise DispatchError("Запрос на подписание не найден")
        if sig["status"] == "signed_demo":
            return dict(sig)
        if sig["status"] != "pending":
            raise DispatchError("Запрос на подписание недействителен")
        ver = dict(self.conn.execute("SELECT * FROM document_versions WHERE id=?", (sig["document_version_id"],)).fetchone())
        if sha(ver["content"]) != sig["content_sha256"]:
            raise DispatchError("Содержимое версии изменилось после создания запроса")
        stamp = (f"{DEMO_SIGN_NOTICE}\nЗапрос: {sig['request_id']}. Версия документа: {ver['version']}. "
                 f"SHA-256: {sig['content_sha256']}. Время: {now()} UTC.")
        try:
            pdf = render.to_pdf(ver["content"], stamp)
        except Exception as e:
            self.conn.execute("UPDATE signatures SET status='failed', error=? WHERE id=?", (f"Ошибка формирования PDF: {e}", signature_id))
            raise DispatchError("Не удалось сформировать PDF-артефакт подписи. Подписание не выполнено.")
        path = settings.storage / "signed" / f"signature_{signature_id}.pdf"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(pdf)
        try:
            self.conn.execute("BEGIN")
            self.conn.execute("UPDATE signatures SET status='signed_demo', signed_at=?, artifact_path=? WHERE id=? AND status='pending'",
                              (now(), str(path), signature_id))
            self.conn.execute("UPDATE document_versions SET is_signed=1 WHERE id=?", (ver["id"],))
            self.conn.execute("COMMIT")
        except Exception:
            self.conn.execute("ROLLBACK")
            raise
        return dict(self.conn.execute("SELECT * FROM signatures WHERE id=?", (signature_id,)).fetchone())

    def get_signed_document(self, signature_id):
        r = self.conn.execute("SELECT artifact_path,status FROM signatures WHERE id=?", (signature_id,)).fetchone()
        if not r or r["status"] != "signed_demo" or not r["artifact_path"] or not Path(r["artifact_path"]).exists():
            raise DispatchError("Подписанный артефакт отсутствует")
        return Path(r["artifact_path"])

    def verify_signature(self, signature_id):
        sig = self.conn.execute("SELECT * FROM signatures WHERE id=?", (signature_id,)).fetchone()
        if not sig or sig["status"] != "signed_demo":
            return {"valid": False, "demo": True, "legal_force": False, "message": "Демо-подпись не поставлена"}
        ver = self.conn.execute("SELECT content FROM document_versions WHERE id=?", (sig["document_version_id"],)).fetchone()
        ok = sha(ver["content"]) == sig["content_sha256"]
        return {"valid": ok, "demo": True, "legal_force": False,
                "message": ("Хэш версии совпадает с зафиксированным при демо-подписании. " if ok else "Содержимое изменено после подписания! ")
                           + "Это не проверка УКЭП/УНЭП."}

def _ts(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)

class MockDeliveryProvider(DeliveryProvider):
    """Имитация Почты России. Статусы продвигаются по времени от момента подтверждения отправки."""
    name = "mock_russian_post"
    NOTES = {"prepared": "Отправление подготовлено", "accepted": "Передано на отправку (симуляция)",
             "sent": "Отправлено (симуляция)", "delivered": "Вручено адресату (симуляция)"}

    def __init__(self, conn):
        self.conn = conn

    def _event(self, did, status, at=None):
        self.conn.execute("INSERT OR IGNORE INTO dispatch_events(dispatch_id,status,note,created_at) VALUES(?,?,?,?)",
                          (did, status, self.NOTES.get(status, status), at or now()))

    def create_dispatch(self, version, signature, user, case_id, recipient_name, recipient_address):
        ex = self.conn.execute("SELECT * FROM dispatches WHERE document_version_id=?", (version["id"],)).fetchone()
        if ex:
            return dict(ex)
        if signature["status"] != "signed_demo":
            raise DispatchError("Отправка возможна только после подписания")
        cur = self.conn.execute(
            "INSERT INTO dispatches(document_version_id,signature_id,case_id,user_id,provider,delivery_method,recipient_name,"
            "recipient_address,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            (version["id"], signature["id"], case_id, user["id"], self.name, "Почта России (симуляция)",
             recipient_name, recipient_address, "prepared", now()))
        self._event(cur.lastrowid, "prepared")
        return dict(self.conn.execute("SELECT * FROM dispatches WHERE id=?", (cur.lastrowid,)).fetchone())

    def submit_dispatch(self, dispatch_id):
        d = dict(self.conn.execute("SELECT * FROM dispatches WHERE id=?", (dispatch_id,)).fetchone())
        mock = MockSignatureProvider(self.conn)
        v = mock.verify_signature(d["signature_id"])
        if not v["valid"]:
            self.conn.execute("UPDATE dispatches SET status='failed', error=? WHERE id=? AND status='prepared'", (v["message"], dispatch_id))
            self._event(dispatch_id, "failed")
            raise DispatchError("Проверка демо-подписи не пройдена: " + v["message"])
        track = "DEMO" + "".join(secrets.choice("0123456789") for _ in range(14))
        cur = self.conn.execute(
            "UPDATE dispatches SET status='accepted', tracking_number=?, submitted_at=? WHERE id=? AND status='prepared'",
            (track, now(), dispatch_id))
        if cur.rowcount == 1:   # повторное нажатие ничего не меняет
            self._event(dispatch_id, "accepted")
        return self.get_dispatch_status(dispatch_id)

    def get_dispatch_status(self, dispatch_id):
        d = dict(self.conn.execute("SELECT * FROM dispatches WHERE id=?", (dispatch_id,)).fetchone())
        if d["status"] in ("accepted", "sent") and d["submitted_at"]:
            t0, step = _ts(d["submitted_at"]), settings.delivery_step
            elapsed = (datetime.now(timezone.utc) - t0).total_seconds()
            fmt = lambda k: (t0 + timedelta(seconds=step * k)).strftime("%Y-%m-%d %H:%M:%S")
            if elapsed >= step:
                self._event(dispatch_id, "sent", fmt(1))
                self.conn.execute("UPDATE dispatches SET status='sent' WHERE id=? AND status='accepted'", (dispatch_id,))
            if elapsed >= 2 * step:
                self._event(dispatch_id, "delivered", fmt(2))
                self.conn.execute("UPDATE dispatches SET status='delivered' WHERE id=? AND status IN ('accepted','sent')", (dispatch_id,))
                self._deadline(d, fmt(2))
        return dict(self.conn.execute("SELECT * FROM dispatches WHERE id=?", (dispatch_id,)).fetchone())

    def _deadline(self, d, delivered_at):
        ver = self.conn.execute("SELECT document_id FROM document_versions WHERE id=?", (d["document_version_id"],)).fetchone()
        due = (_ts(delivered_at) + timedelta(days=10)).strftime("%Y-%m-%d")
        self.conn.execute("INSERT OR IGNORE INTO deadlines(case_id,document_id,title,due_date,created_at) VALUES(?,?,?,?,?)",
                          (d["case_id"], ver["document_id"], "Срок ответа на претензию (10 дней с «вручения», демо)", due, now()))

    def get_delivery_confirmation(self, dispatch_id):
        d = self.get_dispatch_status(dispatch_id)
        if d["status"] != "delivered":
            return None
        ev = self.conn.execute("SELECT created_at FROM dispatch_events WHERE dispatch_id=? AND status='delivered'", (dispatch_id,)).fetchone()
        return {"demo": True, "tracking_number": d["tracking_number"], "delivered_at": ev["created_at"],
                "recipient": d["recipient_name"], "note": DEMO_POST_NOTICE}
