"""Выбор активного провайдера: настройки в БД > переменные окружения. Защита от повторных запросов при сбоях."""
import time
from ..config import settings
from .base import LLMProvider, LLMError
from .gemini import GeminiProvider
from .groq import GroqProvider
from .ollama import OllamaProvider

PROVIDERS = ["demo", "gemini", "groq", "ollama"]
_cooldown: dict[str, float] = {}
COOLDOWN_SEC = 90

def default_model(name: str) -> str:
    return {"gemini": settings.gemini_model, "groq": settings.groq_model, "ollama": settings.ollama_model}.get(name, "")

def active_config(conn) -> tuple[str, str]:
    r = {x["key"]: x["value"] for x in conn.execute("SELECT key,value FROM app_settings")}
    name = r.get("provider", settings.ai_provider)
    if name not in PROVIDERS:
        name = "demo"
    return name, r.get("model") or default_model(name)

def build(name: str, model: str) -> LLMProvider | None:
    return {"gemini": GeminiProvider, "groq": GroqProvider, "ollama": OllamaProvider}.get(name, lambda m: None)(model)

def available(name: str) -> bool:
    return {"demo": True, "gemini": bool(settings.gemini_key), "groq": bool(settings.groq_key), "ollama": True}.get(name, False)

def in_cooldown(name: str) -> bool:
    return _cooldown.get(name, 0) > time.time()

def mark_failed(name: str, err: LLMError):
    if err.fatal:
        _cooldown[name] = time.time() + COOLDOWN_SEC

def reset(name: str | None = None):
    _cooldown.pop(name, None) if name else _cooldown.clear()
