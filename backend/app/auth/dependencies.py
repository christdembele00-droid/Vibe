from fastapi import Header
from app.auth.firebase import verify_bearer_token

def require_auth(authorization: str | None = Header(default=None)) -> dict:
    return verify_bearer_token(authorization)
