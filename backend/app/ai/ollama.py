import httpx
from ..config import settings
from .base import LLMProvider, LLMError

class OllamaProvider(LLMProvider):
    name = "ollama"
    def configured(self): return True

    def generate(self, system, user, max_tokens, json_mode=True):
        body = {"model": self.model, "stream": False, "options": {"num_predict": max_tokens, "temperature": 0.2},
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if json_mode:
            body["format"] = "json"
        try:
            r = httpx.post(settings.ollama_url.rstrip("/") + "/api/chat", json=body, timeout=120)
        except httpx.HTTPError:
            raise LLMError("Ollama недоступна: запустите её и загрузите модель (ollama pull " + self.model + ")", fatal=True)
        if r.status_code >= 400:
            raise LLMError(f"Ollama вернула ошибку {r.status_code} (модель загружена?)", fatal=True)
        try:
            return r.json()["message"]["content"]
        except Exception:
            raise LLMError("Ollama вернула неожиданный ответ")
