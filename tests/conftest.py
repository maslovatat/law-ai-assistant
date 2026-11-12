import os, sys, tempfile
from pathlib import Path
tmp = tempfile.mkdtemp()
os.environ["STORAGE_DIR"] = tmp
os.environ["DB_PATH"] = str(Path(tmp) / "test.db")
os.environ["AI_PROVIDER"] = "demo"
os.environ["DEMO_DELIVERY_STEP_SECONDS"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import pytest
from fastapi.testclient import TestClient

@pytest.fixture(scope="session")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c

@pytest.fixture()
def user(client):
    import secrets
    email = f"u{secrets.token_hex(3)}@example.com"
    r = client.post("/api/auth/register", json={"email": email, "name": "Тест", "password": "secret123"})
    assert r.status_code == 200, r.text
    h = {"Authorization": "Bearer " + r.json()["token"]}
    return h
