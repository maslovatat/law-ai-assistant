from fastapi import APIRouter, Depends
from ..db import get_db
from ..deps import current_user
from ..demo import scenarios

router = APIRouter(prefix="/api/demo", tags=["demo"])

@router.post("/load")
def load(user=Depends(current_user), conn=Depends(get_db)):
    created = scenarios.load(conn, user)
    return {"created": created, "message": f"Загружено сценариев: {len(created)}" if created else "Демо-сценарии уже загружены"}
