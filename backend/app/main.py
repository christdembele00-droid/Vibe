from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from app.auth.firebase import verify_bearer_token
from app.config.settings import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get(f"{settings.api_prefix}/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "vibe-api"}

@app.get(f"{settings.api_prefix}/auth/me")
def auth_me(authorization: str | None = Header(default=None)) -> dict[str, str]:
    decoded = verify_bearer_token(authorization)
    return {"firebase_uid": str(decoded["uid"])}
