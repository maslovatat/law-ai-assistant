import httpx
from ..config import settings
from .base import LLMProvider, LLMError

class GroqProvider(LLMProvider):
    name = "groq"
    def configured(self): return bool(settings.groq_key)

    def generate(self, system, user, max_tokens, json_mode=True):
        if not self.configured():
            raise LLMError("Не задан GROQ_API_KEY в файле .env", fatal=True)
        body = {"model": self.model, "max_tokens": max_tokens, "temperature": 0.2,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        try:
            r = httpx.post("https://api.groq.com/openai/v1/chat/completions",
                           headers={"Authorization": f"Bearer {settings.groq_key}"}, json=body, timeout=40)
        except httpx.HTTPError as e:
            raise LLMError(f"Нет связи с Groq ({type(e).__name__})")
        if r.status_code in (401, 403):
            raise LLMError("Groq отклонил ключ API", fatal=True)
        if r.status_code == 429:
            raise LLMError("Превышен лимит запросов Groq", fatal=True)
        if r.status_code >= 400:
            raise LLMError(f"Groq вернул ошибку {r.status_code}")
        try:
            return r.json()["choices"][0]["message"]["content"]
        except Exception:
            raise LLMError("Groq вернул неожиданный ответ")
