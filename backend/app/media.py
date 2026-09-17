from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/media",tags=["media"])
class MediaCreate(BaseModel): public_id:str|None=None; url:str=Field(min_length=1,max_length=4096); resource_type:str; mime_type:str|None=None; size_bytes:int|None=None; width:int|None=None; height:int|None=None; duration_seconds:float|None=None
@router.post("/complete")
def complete_media(body:MediaCreate,current_user=Depends(get_current_user)):
 if body.resource_type not in ("image","video","raw"): raise HTTPException(400,"Type média invalide")
 with get_engine().begin() as c:
  row=c.execute(text("INSERT INTO media(public_id,url,resource_type,mime_type,size_bytes,width,height,duration_seconds,status,created_by) VALUES(:p,:url,:r,:m,:s,:w,:h,:d,'active',:u) RETURNING id,url,resource_type,mime_type,size_bytes,width,height,duration_seconds,status,created_at"),body.model_dump()|{"u":current_user["id"]}).mappings().one()
 return {"media":dict(row)}
@router.delete("/{media_id}")
def delete_media(media_id:UUID,current_user=Depends(get_current_user)):
 with get_engine().begin() as c:
  result=c.execute(text("UPDATE media SET status='deleted' WHERE id=:m AND created_by=:u AND status<>'deleted'"),{"m":media_id,"u":current_user["id"]})
 return {"deleted":result.rowcount>0}
