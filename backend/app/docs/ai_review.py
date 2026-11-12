"""Проверка претензии: детерминированная сверка фактов + (по кнопке) ОДИН запрос к ИИ. Автоматически не вызывается."""
import json, re
from pydantic import BaseModel, Field, ValidationError
from ..config import settings
from ..legal import categories as C, research
from ..ai import runtime
from ..ai.base import LLMError
from . import builder

SYSTEM = (
    "Ты — проверяющий ассистент. Проверь досудебную претензию физического лица в РФ. Сверь текст с блоками ФАКТЫ и НОРМЫ. "
    "Найди: 1) сведения в тексте, которых нет в ФАКТАХ (выдумка); 2) искажённые или пропущенные факты; "
    "3) ссылки на нормы, которых нет в блоке НОРМЫ; 4) отсутствие чёткого требования, срока, приложений; логические противоречия. "
    "Ничего не переписывай и не придумывай. Если замечаний нет — верни пустой список. "
    'Ответ строго JSON: {"verdict":"ok"|"needs_fix","summary":"1-2 предложения","issues":[{"severity":"high"|"medium"|"low","text":"..."}]}'
)

class Issue(BaseModel):
    severity: str = "medium"
    text: str = Field(max_length=400)

class AIReview(BaseModel):
    verdict: str = "needs_fix"
    summary: str = Field(default="", max_length=600)
    issues: list[Issue] = []

def run(conn, case: dict, facts: dict, content: str) -> dict:
    rules = builder.fact_check(facts, content) + [f"Не заполнено: {p[13:-1]}" for p in builder.placeholders(content)]
    out = {"rule_issues": rules, "ai": None, "ai_used": False, "message": ""}
    name, model = runtime.active_config(conn)
    if name == "demo":
        out["message"] = "Внешний ИИ не подключён (режим «demo»): выполнена только проверка правилами. Подключите Gemini в «Настройки ИИ»."
        return out
    if runtime.in_cooldown(name):
        out["message"] = f"Провайдер «{name}» временно отключён после ошибки. Выполнена только проверка правилами."
        return out
    norms = research.for_profile(case["category"], facts.get("requirement"))
    user = ("ФАКТЫ: " + json.dumps({k: v for k, v in facts.items() if v != C.UNKNOWN}, ensure_ascii=False) +
            "\nНОРМЫ:\n" + research.prompt_fragments(norms, 250) + "\nТЕКСТ ПРЕТЕНЗИИ:\n" + content[:6000])
    try:
        raw = runtime.build(name, model).generate(SYSTEM, user, settings.ai_max_tokens)
        raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
        m = re.search(r"\{.*\}", raw, re.S)
        out["ai"] = AIReview.model_validate(json.loads(m.group(0) if m else raw)).model_dump()
        out["ai_used"] = True
        out["message"] = f"Проверено моделью {name}:{model}. Это подсказка, а не юридическое заключение."
    except LLMError as e:
        runtime.mark_failed(name, e)
        out["message"] = f"{e.user_message}. Выполнена только проверка правилами."
    except (ValidationError, ValueError):
        out["message"] = "Модель вернула ответ в неверном формате. Выполнена только проверка правилами."
    return out
