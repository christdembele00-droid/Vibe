from uuid import UUID
from datetime import datetime,timedelta,timezone
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/statuses",tags=["statuses"])
class StatusCreate(BaseModel): text:str|None=None; media_id:UUID|None=None
@router.post("")
def create_status(body:StatusCreate,current_user=Depends(get_current_user)):
 if not body.text and not body.media_id: raise HTTPException(400,"Statut vide")
 with get_engine().begin() as c:
  row=c.execute(text("INSERT INTO statuses(user_id,text,media_id,expires_at) VALUES(:u,:t,:m,:e) RETURNING id,user_id,text,media_id,created_at,expires_at"),{"u":current_user["id"],"t":body.text,"m":body.media_id,"e":datetime.now(timezone.utc)+timedelta(hours=24)}).mappings().one()
 return {"status":dict(row)}
@router.get("")
def list_statuses(current_user=Depends(get_current_user)):
 with get_engine().connect() as c:
  rows=c.execute(text("SELECT id,user_id,text,media_id,created_at,expires_at FROM statuses WHERE expires_at>now() AND user_id=:u ORDER BY created_at DESC"),{"u":current_user["id"]}).mappings().all()
 return {"statuses":[dict(x) for x in rows]}
@router.delete("/{status_id}")
def delete_status(status_id:UUID,current_user=Depends(get_current_user)):
 with get_engine().begin() as c: result=c.execute(text("DELETE FROM statuses WHERE id=:s AND user_id=:u"),{"s":status_id,"u":current_user["id"]})
 return {"deleted":result.rowcount>0}
