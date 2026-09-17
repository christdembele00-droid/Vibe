import time

import cloudinary
import cloudinary.utils
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.auth.firebase import verify_bearer_token
from app.config.settings import get_settings
from app.users import router as users_router
from app.conversations import router as conversations_router
from app.messages import router as messages_router
from app.realtime import router as realtime_router
from app.contacts import router as contacts_router
from app.devices import router as devices_router
from app.groups import router as groups_router
from app.channels import router as channels_router
from app.statuses import router as statuses_router
from app.media import router as media_router
from app.security import router as security_router
from app.search import router as search_router
from app.account import router as account_router


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")
app.include_router(users_router, prefix=settings.api_prefix)
app.include_router(conversations_router, prefix=settings.api_prefix)
app.include_router(messages_router, prefix=settings.api_prefix)
app.include_router(realtime_router, prefix=settings.api_prefix)
app.include_router(contacts_router, prefix=settings.api_prefix)
app.include_router(devices_router, prefix=settings.api_prefix)
app.include_router(groups_router, prefix=settings.api_prefix)
app.include_router(channels_router, prefix=settings.api_prefix)
app.include_router(statuses_router, prefix=settings.api_prefix)
app.include_router(media_router, prefix=settings.api_prefix)
app.include_router(security_router, prefix=settings.api_prefix)
app.include_router(search_router, prefix=settings.api_prefix)
app.include_router(account_router, prefix=settings.api_prefix)

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


@app.post(f"{settings.api_prefix}/media/upload-signature")
def media_upload_signature(authorization: str | None = Header(default=None)) -> dict[str, str | int]:
    verify_bearer_token(authorization)
    if not all(
        [
            settings.cloudinary_cloud_name,
            settings.cloudinary_api_key,
            settings.cloudinary_api_secret,
        ]
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary backend non configuré",
        )

    timestamp = int(time.time())
    params_to_sign = {"timestamp": timestamp}
    signature = cloudinary.utils.api_sign_request(
        params_to_sign,
        settings.cloudinary_api_secret,
    )
    return {
        "cloud_name": settings.cloudinary_cloud_name,
        "api_key": settings.cloudinary_api_key,
        "timestamp": timestamp,
        "signature": signature,
    }
