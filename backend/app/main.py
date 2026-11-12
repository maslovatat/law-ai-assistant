from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from .config import settings
from . import db
from .demo import scenarios
from .routers import auth, chats, cases, documents, dispatches, settings as settings_router, demo, api_keys, api_v1

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.migrate()
    conn = db.connect()
    try:
        scenarios.ensure_demo_user(conn)
    finally:
        conn.close()
    yield

app = FastAPI(
    title="AI Legal Assistant (демо)", version="1.0.0", lifespan=lifespan,
    description=(
        "Демонстрационный ИИ-помощник по бытовым юридическим спорам.\n\n"
        "**Публичный API** — `/api/v1/*`: ключ в заголовке `X-API-Key` (создаётся в интерфейсе: "
        "Настройки → API-доступ), не более 120 запросов в минуту на ключ.\n\n"
        "Остальные `/api/*` — внутренний API веб-интерфейса (Bearer-токен сессии)."
    ),
)

@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    return JSONResponse({"detail": f"Внутренняя ошибка: {type(exc).__name__}"}, status_code=500)

@app.exception_handler(db.sqlite3.IntegrityError)
async def integrity(request: Request, exc):
    return JSONResponse({"detail": f"Операция отклонена базой данных: {exc}"}, status_code=409)

for r in (auth, chats, cases, documents, dispatches, settings_router, api_keys, api_v1, demo):
    app.include_router(r.router)

@app.get("/api/health")
def health():
    return {"ok": True}

dist = settings.frontend_dist
if dist.exists():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        if path.startswith("api/"):
            return JSONResponse({"detail": "Не найдено"}, status_code=404)
        f = (dist / path).resolve()
        if path and f.is_file() and dist.resolve() in f.parents:
            return FileResponse(f)
        return FileResponse(dist / "index.html")
