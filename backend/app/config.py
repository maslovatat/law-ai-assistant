import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default

class Settings:
    root = ROOT
    storage = Path(os.getenv("STORAGE_DIR", ROOT / "storage"))
    db_path = Path(os.getenv("DB_PATH", ROOT / "storage" / "app.db"))
    templates_dir = ROOT / "templates"
    frontend_dist = ROOT / "frontend" / "dist"
    fonts_dir = ROOT / "backend" / "assets" / "fonts"

    ai_provider = os.getenv("AI_PROVIDER", "demo").lower()
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    groq_key = os.getenv("GROQ_API_KEY", "")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
    ai_max_tokens = _int("AI_MAX_OUTPUT_TOKENS", 700)
    ai_history = _int("AI_HISTORY_MESSAGES", 6)

    max_upload_bytes = _int("MAX_UPLOAD_MB", 10) * 1024 * 1024
    session_days = _int("SESSION_DAYS", 7)
    delivery_step = _int("DEMO_DELIVERY_STEP_SECONDS", 6)
    tesseract_cmd = os.getenv("TESSERACT_CMD", "")

settings = Settings()
