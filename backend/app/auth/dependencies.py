from fastapi import Header, HTTPException, status
from app.auth.firebase import verify_bearer_token
from app.database import get_local_user_by_firebase_uid


def require_auth(authorization: str | None = Header(default=None)) -> dict:
    return verify_bearer_token(authorization)


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    decoded = verify_bearer_token(authorization)
    user = get_local_user_by_firebase_uid(str(decoded["uid"]))
    if not user or user.get("deleted_at") is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Compte VIBE indisponible")
    return user
