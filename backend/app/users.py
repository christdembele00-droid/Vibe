from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from app.auth.dependencies import get_current_user, require_auth
from app.database import get_engine, upsert_user_from_firebase
router = APIRouter(prefix="/users", tags=["users"])
class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_.-]+$")
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    about: str | None = Field(default=None, max_length=500)
    photo_url: str | None = Field(default=None, max_length=4096)
@router.post("/me/sync")
def sync_current_user(decoded: dict = Depends(require_auth)) -> dict:
    return {"user": upsert_user_from_firebase(decoded)}
@router.get("/me")
def me(current_user=Depends(get_current_user)): return {"user":current_user}
@router.patch("/me")
def update_profile(body:ProfileUpdate,current_user=Depends(get_current_user)):
    values=body.model_dump(exclude_unset=True)
    if not values: return {"user":current_user}
    sets=[]; params={"u":current_user["id"]}
    for key,value in values.items(): sets.append(f"{key}=:{key}"); params[key]=value
    sets.append("updated_at=now()")
    with get_engine().begin() as c:
        if "username" in values and c.execute(text("SELECT 1 FROM users WHERE username=:v AND id<>:u"),{"v":values["username"],"u":current_user["id"]}).first(): raise HTTPException(409,"Nom d'utilisateur déjà utilisé")
        row=c.execute(text(f"UPDATE users SET {', '.join(sets)} WHERE id=:u AND deleted_at IS NULL RETURNING id,firebase_uid,username,display_name,email,photo_url,about,role,created_at,updated_at,deleted_at"),params).mappings().one()
    return {"user":dict(row)}
