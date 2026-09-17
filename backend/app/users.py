from fastapi import APIRouter, Depends

from app.auth.dependencies import require_auth
from app.database import upsert_user_from_firebase

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/me/sync")
def sync_current_user(decoded: dict = Depends(require_auth)) -> dict:
    return {"user": upsert_user_from_firebase(decoded)}
