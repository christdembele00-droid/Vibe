import json
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status
from app.config.settings import get_settings

def _initialize() -> None:
    if firebase_admin._apps:
        return
    settings = get_settings()
    if settings.firebase_service_account_json:
        service_account = json.loads(settings.firebase_service_account_json)
        firebase_admin.initialize_app(credentials.Certificate(service_account))
    else:
        firebase_admin.initialize_app()

def verify_bearer_token(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton manquant")
    try:
        _initialize()
        return auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton Firebase invalide") from exc
