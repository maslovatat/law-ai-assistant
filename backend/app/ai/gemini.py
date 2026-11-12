import httpx
from ..config import settings
from .base import LLMProvider, LLMError

class GeminiProvider(LLMProvider):
    name = "gemini"
    def configured(self): return bool(settings.gemini_key)

    def generate(self, system, user, max_tokens, json_mode=True):
        if not self.configured():
            raise LLMError("Не задан GEMINI_API_KEY в файле .env", fatal=True)
        body = {"systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.2,
                                     **({"responseMimeType": "application/json"} if json_mode else {})}}
        try:
            r = httpx.post(f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
                           headers={"x-goog-api-key": settings.gemini_key, "Content-Type": "application/json"},
                           json=body, timeout=40)
        except httpx.HTTPError as e:
            raise LLMError(f"Нет связи с Gemini ({type(e).__name__})")
        if r.status_code in (400, 401, 403):
            raise LLMError("Gemini отклонил запрос: проверьте ключ API и название модели", fatal=True)
        if r.status_code == 429:
            raise LLMError("Превышен лимит бесплатных запросов Gemini", fatal=True)
        if r.status_code >= 400:
            raise LLMError(f"Gemini вернул ошибку {r.status_code}")
        try:
            return "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])
        except Exception:
            raise LLMError("Gemini вернул пустой или неожиданный ответ")
