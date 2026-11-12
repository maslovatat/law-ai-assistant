"""ИИ-редактор претензии: подробнее и официальнее, без добавления фактов.

Модель НЕ может изменить суммы, даты и реквизиты: в промпт передаются факты,
готовый текст и нормы, а результат проверяется кодом перед сохранением версии.
"""
import json, re
from ..config import settings
from ..legal import categories as C, research
from ..ai import runtime
from ..ai.base import LLMError

SYSTEM = (
    "Ты — редактор юридических документов в РФ. Переработай досудебную претензию: официальный деловой стиль, "
    "подробное и связное изложение обстоятельств, уважительный тон без эмоций. "
    "Сохрани ВСЕ сведения из блока ФАКТЫ: имена, адреса, даты, суммы, названия товара и организаций, требование и срок. "
    "Не добавляй фактов, которых нет в ФАКТАХ, не меняй суммы и даты, не придумывай статьи — бери их только из блока НОРМЫ. "
    "Сохрани разметку: строка '> ' — правый блок, '# ' — заголовок, '## ' — подзаголовок. "
    "Верни ТОЛЬКО текст документа, без пояснений и markdown-обёрток."
)
MAX_TOKENS = 1600


def _clean(raw: str) -> str:
    t = (raw or "").strip()
    t = re.sub(r"^```(?:markdown|text|md)?\s*", "", t, flags=re.I)
    t = re.sub(r"\s*```$", "", t)
    t = t.replace("\r\n", "\n")
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    return t + "\n" if t else ""


def _validate(text: str, facts: dict) -> str:
    if len(text) < 200:
        return "Модель вернула слишком короткий текст — версия не создана, попробуйте ещё раз."
    if "# Претензия" not in text:
        return "Модель вернула не документ (нет заголовка «Претензия») — версия не создана."
    name = facts.get("applicant_name")
    if name and name not in text:
        return "Модель потеряла ФИО заявителя — версия не создана, попробуйте ещё раз."
    for key in ("price", "damage_amount", "amount"):
        v = facts.get(key)
        if v and v not in (C.UNKNOWN, "0"):
            digits = re.sub(r"\D", "", v)
            if digits and digits not in re.sub(r"\D", "", text):
                return f"Модель потеряла сумму «{C.fmt_value(key, v)}» — версия не создана, попробуйте ещё раз."
    return ""


def run(conn, case: dict, facts: dict, content: str, instruction: str | None = None) -> dict:
    provider_name, model = runtime.active_config(conn)
    if provider_name == "demo":
        return {"ok": False, "used": "demo",
                "message": "Внешний ИИ не подключён (режим «demo»). Подключите Groq или Gemini в «Настройки ИИ», "
                           "и текст можно будет улучшать автоматически."}
    if runtime.in_cooldown(provider_name):
        return {"ok": False, "used": "demo",
                "message": f"Провайдер «{provider_name}» временно отключён после ошибки. Попробуйте через минуту."}
    norms = research.for_profile(case["category"], facts.get("requirement"))
    task = (instruction or "").strip() or "Перепиши документ подробнее и официальнее, сохранив все данные."
    body = ("ФАКТЫ: " + json.dumps({k: v for k, v in facts.items() if v != C.UNKNOWN}, ensure_ascii=False) +
            "\nНОРМЫ:\n" + research.prompt_fragments(norms, 300) +
            "\nЗАДАЧА: " + task +
            "\nТЕКУЩИЙ ТЕКСТ:\n" + (content or "")[:7000])
    try:
        raw = runtime.build(provider_name, model).generate(SYSTEM, body, MAX_TOKENS, json_mode=False)
    except LLMError as e:
        runtime.mark_failed(provider_name, e)
        return {"ok": False, "used": "demo", "message": e.user_message}
    text = _clean(raw)
    problem = _validate(text, facts)
    if problem:
        return {"ok": False, "used": "demo", "message": problem}
    return {"ok": True, "used": f"{provider_name}:{model}", "content": text,
            "message": f"Текст переработан моделью {provider_name}:{model}."}
