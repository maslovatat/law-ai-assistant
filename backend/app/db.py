"""SQLite: подключение и простые SQL-миграции (backend/app/migrations/NNN_*.sql)."""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from .config import settings

MIGRATIONS = Path(__file__).parent / "migrations"

def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

def connect() -> sqlite3.Connection:
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.db_path, timeout=15, isolation_level=None, check_same_thread=False)  # autocommit; транзакции явные
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def migrate() -> list[str]:
    conn = connect()
    applied = []
    try:
        conn.execute("CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, applied_at TEXT)")
        done = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations")}
        for f in sorted(MIGRATIONS.glob("*.sql")):
            if f.name in done:
                continue
            conn.executescript(f.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations VALUES(?,?)", (f.name, now()))
            applied.append(f.name)
    finally:
        conn.close()
    return applied

def get_db():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()

def row(r):
    return dict(r) if r is not None else None

def rows(rs):
    return [dict(r) for r in rs]
