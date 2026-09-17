from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine

router=APIRouter(prefix="/settings",tags=["settings"])

class SettingsUpdate(BaseModel):
    theme:str|None=None
    notifications_enabled:bool|None=None
    read_receipts_enabled:bool|None=None
    last_seen_visibility:str|None=None
    status_visibility:str|None=None

    @field_validator("status_visibility")
    @classmethod
    def validate_status_visibility(cls,v):
        if v is not None and v not in ("contacts","everyone"):
            raise ValueError("Visibilité de statut invalide")
        return v

    @field_validator("last_seen_visibility")
    @classmethod
    def validate_last_seen_visibility(cls,v):
        if v is not None and v not in ("contacts","everyone"):
            raise ValueError("Visibilité de dernière connexion invalide")
        return v

@router.get("")
def get_settings(current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        row=c.execute(text("SELECT user_id,theme,notifications_enabled,read_receipts_enabled,last_seen_visibility,status_visibility,updated_at FROM user_settings WHERE user_id=:u"),{"u":current_user["id"]}).mappings().one()
    return {"settings":dict(row)}

@router.patch("")
def update_settings(body:SettingsUpdate,current_user=Depends(get_current_user)):
    values=body.model_dump(exclude_unset=True)
    if "theme" in values and values["theme"] not in ("light","dark","system"):
        raise HTTPException(400,"Thème invalide")
    if not values:
        return get_settings(current_user)
    sets=[]; params={"u":current_user["id"]}
    for k,v in values.items():
        sets.append(f"{k}=:{k}"); params[k]=v
    sets.append("updated_at=now()")
    with get_engine().begin() as c:
        row=c.execute(text(f"UPDATE user_settings SET {', '.join(sets)} WHERE user_id=:u RETURNING user_id,theme,notifications_enabled,read_receipts_enabled,last_seen_visibility,status_visibility,updated_at"),params).mappings().one()
    return {"settings":dict(row)}
