from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/security",tags=["security"])
class Report(BaseModel): target_type:str=Field(min_length=1,max_length=32); target_id:UUID; reason:str=Field(min_length=1,max_length=500)
@router.post("/blocks/{user_id}")
def block_user(user_id:UUID,current_user=Depends(get_current_user)):
 if user_id==current_user["id"]: raise HTTPException(400,"Blocage invalide")
 with get_engine().begin() as c:
  c.execute(text("INSERT INTO blocked_users(blocker_id,blocked_id) VALUES(:a,:b) ON CONFLICT DO NOTHING"),{"a":current_user["id"],"b":user_id})
  c.execute(text("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(:a,'user.blocked','user',:b)"),{"a":current_user["id"],"b":user_id})
 return {"blocked":True}
@router.delete("/blocks/{user_id}")
def unblock_user(user_id:UUID,current_user=Depends(get_current_user)):
 with get_engine().begin() as c: result=c.execute(text("DELETE FROM blocked_users WHERE blocker_id=:a AND blocked_id=:b"),{"a":current_user["id"],"b":user_id})
 return {"blocked":False,"changed":result.rowcount>0}
@router.post("/reports")
def report(body:Report,current_user=Depends(get_current_user)):
 with get_engine().begin() as c:
  row=c.execute(text("INSERT INTO reports(reporter_id,target_type,target_id,reason) VALUES(:r,:t,:id,:reason) RETURNING id,status,created_at"),{"r":current_user["id"],"t":body.target_type,"id":body.target_id,"reason":body.reason}).mappings().one()
 return {"report":dict(row)}
