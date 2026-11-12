from fastapi import APIRouter, Depends, HTTPException
from ..db import get_db
from ..deps import current_user
from ..schemas import SettingsIn
from ..ai import runtime
from ..ai.base import LLMError

router = APIRouter(prefix="/api/settings", tags=["settings"])

def _state(conn):
    name, model = runtime.active_config(conn)
    return {"provider": name, "model": model,
            "providers": [{"id": p, "available": runtime.available(p), "default_model": runtime.default_model(p),
                           "hint": {"demo": "Без внешнего ИИ: правила и шаблоны", "gemini": "Нужен GEMINI_API_KEY в .env",
                                    "groq": "Нужен GROQ_API_KEY в .env", "ollama": "Нужна локально запущенная Ollama"}[p]}
                          for p in runtime.PROVIDERS],
            "privacy": "Тексты диалога и распознанный текст загруженных документов отправляются выбранному внешнему провайдеру, "
                       "чтобы помощник мог извлечь сведения. Используйте только вымышленные данные."}

@router.get("")
def get(user=Depends(current_user), conn=Depends(get_db)):
    return _state(conn)

@router.put("")
def put(body: SettingsIn, user=Depends(current_user), conn=Depends(get_db)):
    if body.provider not in runtime.PROVIDERS:
        raise HTTPException(400, "Неизвестный провайдер")
    for k, v in (("provider", body.provider), ("model", (body.model or "").strip())):
        conn.execute("INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, v))
    runtime.reset()
    return _state(conn)

@router.post("/test")
def test(user=Depends(current_user), conn=Depends(get_db)):
    name, model = runtime.active_config(conn)
    if name == "demo":
        return {"ok": True, "message": "Демонстрационный режим: внешний ИИ не используется."}
    try:
        runtime.build(name, model).generate("Отвечай одним словом.", "Скажи: готов", 20, json_mode=False)
        runtime.reset(name)
        return {"ok": True, "message": f"Провайдер {name} ({model}) отвечает."}
    except LLMError as e:
        runtime.mark_failed(name, e)
        return {"ok": False, "message": e.user_message}
