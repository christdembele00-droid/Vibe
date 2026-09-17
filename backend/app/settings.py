from fastapi import APIRouter,Depends
from pydantic import BaseModel
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/settings",tags=["settings"])
class SettingsUpdate(BaseModel):
 theme:str|None=None; notifications_enabled:bool|None=None; read_receipts_enabled:bool|None=None; last_seen_visibility:str|None=None; status_visibility:str|None=None
@router.get("")
def get_settings(current_user=Depends(get_current_user)):
 with get_engine().connect() as c: row=c.execute(text("SELECT user_id,theme,notifications_enabled,read_receipts_enabled,last_seen_visibility,status_visibility,updated_at FROM user_settings WHERE user_id=:u"),{"u":current_user["id"]}).mappings().one()
 return {"settings":dict(row)}
@router.patch("")
def update_settings(body:SettingsUpdate,current_user=Depends(get_current_user)):
 values=body.model_dump(exclude_unset=True); allowed={"theme","notifications_enabled","read_receipts_enabled","last_seen_visibility","status_visibility"}; values={k:v for k,v in values.items() if k in allowed}
 if not values: return get_settings(current_user)
 sets=[]; params={"u":current_user["id"]}
 for k,v in values.items(): sets.append(f"{k}=:{k}"); params[k]=v
 sets.append("updated_at=now()")
 with get_engine().begin() as c: row=c.execute(text(f"UPDATE user_settings SET {', '.join(sets)} WHERE user_id=:u RETURNING user_id,theme,notifications_enabled,read_receipts_enabled,last_seen_visibility,status_visibility,updated_at"),params).mappings().one()
 return {"settings":dict(row)}
