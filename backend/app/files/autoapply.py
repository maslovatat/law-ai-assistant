"""Автоматический перенос сведений из документа в карточку дела.

Данные из чека/договора записываются как «из документа» (непроверенные): они сразу
участвуют в подготовке претензии, но пользователь может их исправить, а
противоречия с проверенными документами подсвечиваются отдельно.
"""
import re
from .. import cases as CS

PROTECTED = {"user", "manual"}   # сказанное пользователем и ручные правки не перетираем


def _norm(s: str) -> str:
    return re.sub(r"[^а-яёa-z0-9]", "", (s or "").lower())


def _more_complete(old: str, new: str) -> bool:
    a, b = _norm(old), _norm(new)
    return bool(a and b and a in b)


def apply_facts(conn, case_id: int, values: dict[str, str], source: str = "file") -> dict[str, str]:
    applied: dict[str, str] = {}
    for key, value in (values or {}).items():
        if not value:
            continue
        cur = conn.execute("SELECT value,source FROM case_facts WHERE case_id=? AND key=?", (case_id, key)).fetchone()
        if cur and cur["source"] in PROTECTED:
            continue
        if cur and cur["value"] == value:
            continue
        # короткое значение («RTX 5060») заменяем более полным («Видеокарта RTX 5060»)
        if cur and cur["source"] == "file" and not _more_complete(cur["value"], value):
            continue
        if CS.set_fact(conn, case_id, key, value, source):
            applied[key] = value
    return applied
