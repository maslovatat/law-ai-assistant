"""Legal Research: локальный поиск по демо-базе норм. В LLM передаются только найденные фрагменты."""
import json, re
from functools import lru_cache
from pathlib import Path

KB_PATH = Path(__file__).parent / "kb.json"
DISCLAIMER = ("Демонстрационная правовая база содержит ограниченный набор положений в пересказе и НЕ охватывает "
              "всё действующее законодательство РФ. Актуальность не сверена с официальными публикациями.")

@lru_cache(maxsize=1)
def load_kb() -> list[dict]:
    return json.loads(KB_PATH.read_text(encoding="utf-8"))

def _stems(text: str) -> set[str]:
    return {w[:5] for w in re.findall(r"[а-яёa-z0-9]+", text.lower()) if len(w) > 3}

def for_profile(profile: str | None, requirement: str | None = None) -> list[dict]:
    """Нормы, применимые к профилю дела (и требованию, если указано)."""
    if not profile:
        return []
    out = []
    for e in load_kb():
        if profile not in e["tags"]:
            continue
        req_tags = [t for t in e["tags"] if t.startswith("req:")]
        if req_tags and requirement and f"req:{requirement}" not in req_tags:
            continue
        out.append(e)
    return out

def search(query: str, profile: str | None = None, requirement: str | None = None, limit: int = 3) -> list[dict]:
    """Простой поиск по пересечению основ слов внутри применимых норм (или по всей базе без профиля)."""
    pool = for_profile(profile, requirement) if profile else load_kb()
    q = _stems(query)
    scored = []
    for e in pool:
        s = len(q & _stems(e["title"] + " " + " ".join(e["keywords"]))) * 2 + len(q & _stems(e["text"]))
        scored.append((s, e))
    scored.sort(key=lambda x: -x[0])
    return [e for s, e in scored[:limit] if s > 0 or profile]

def cite(e: dict) -> str:
    return f"{e['article']} — {e['act']}"

def prompt_fragments(entries: list[dict], max_chars: int = 450) -> str:
    return "\n".join(f"[{e['id']}] {cite(e)}: {e['text'][:max_chars]}" for e in entries)
