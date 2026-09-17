from uuid import UUID
from fastapi import APIRouter,Depends
from pydantic import BaseModel,Field
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/devices",tags=["devices"])
class Device(BaseModel): platform:str=Field(min_length=1,max_length=32); push_token:str=Field(min_length=1,max_length=4096); device_name:str|None=None
@router.get("")
def devices(current_user=Depends(get_current_user)):
 with get_engine().connect() as c: rows=c.execute(text("SELECT id,platform,push_token,device_name,last_seen_at,created_at FROM devices WHERE user_id=:u ORDER BY last_seen_at DESC NULLS LAST"),{"u":current_user["id"]}).mappings().all()
 return {"devices":[dict(x) for x in rows]}
@router.post("")
def register_device(body:Device,current_user=Depends(get_current_user)):
 with get_engine().begin() as c:
  row=c.execute(text("INSERT INTO devices(user_id,platform,push_token,device_name,last_seen_at) VALUES(:u,:p,:t,:n,now()) ON CONFLICT(user_id,push_token) DO UPDATE SET platform=EXCLUDED.platform,device_name=EXCLUDED.device_name,last_seen_at=now() RETURNING id,platform,push_token,device_name,last_seen_at,created_at"),{"u":current_user["id"],"p":body.platform,"t":body.push_token,"n":body.device_name}).mappings().one()
 return {"device":dict(row)}
@router.delete("/{device_id}")
def delete_device(device_id:UUID,current_user=Depends(get_current_user)):
 with get_engine().begin() as c: result=c.execute(text("DELETE FROM devices WHERE id=:d AND user_id=:u"),{"d":device_id,"u":current_user["id"]})
 return {"deleted":result.rowcount>0}
