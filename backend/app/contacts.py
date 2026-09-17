from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/contacts",tags=["contacts"])
class ContactRequest(BaseModel): user_id: UUID
@router.get("")
def list_contacts(current_user=Depends(get_current_user)):
 with get_engine().connect() as c:
  rows=c.execute(text("""
   SELECT u.id,u.username,u.display_name,u.email,u.photo_url
   FROM contacts x
   JOIN users u ON u.id=x.contact_user_id
   WHERE x.user_id=:u
     AND x.contact_user_id<>:u
     AND u.deleted_at IS NULL
   ORDER BY u.display_name
  """),{"u":current_user["id"]}).mappings().all()
 return {"contacts":[dict(x) for x in rows]}
@router.post("/requests")
def request_contact(body:ContactRequest,current_user=Depends(get_current_user)):
 if body.user_id==current_user["id"]: raise HTTPException(400,"Contact invalide")
 with get_engine().begin() as c:
  if not c.execute(text("SELECT 1 FROM users WHERE id=:id AND deleted_at IS NULL"),{"id":body.user_id}).first(): raise HTTPException(404,"Utilisateur introuvable")
  if c.execute(text("SELECT 1 FROM blocked_users WHERE (blocker_id=:a AND blocked_id=:b) OR (blocker_id=:b AND blocked_id=:a)"),{"a":current_user["id"],"b":body.user_id}).first(): raise HTTPException(403,"Contact indisponible")
  row=c.execute(text("INSERT INTO contact_requests(sender_id,receiver_id) VALUES(:a,:b) ON CONFLICT DO NOTHING RETURNING id,sender_id,receiver_id,status,created_at"),{"a":current_user["id"],"b":body.user_id}).mappings().first()
 return {"request":dict(row) if row else {"status":"pending"}}
@router.get("/requests")
def list_contact_requests(current_user=Depends(get_current_user)):
 with get_engine().connect() as c:
  rows=c.execute(text("SELECT id,sender_id,receiver_id,status,created_at,updated_at FROM contact_requests WHERE sender_id=:u OR receiver_id=:u ORDER BY created_at DESC"),{"u":current_user["id"]}).mappings().all()
 return {"requests":[dict(x) for x in rows]}

@router.post("/requests/{request_id}/reject")
def reject_contact_request(request_id:UUID,current_user=Depends(get_current_user)):
 with get_engine().begin() as c:
  r=c.execute(text("UPDATE contact_requests SET status='rejected',updated_at=now() WHERE id=:id AND receiver_id=:u AND status='pending' RETURNING id"),{"id":request_id,"u":current_user["id"]}).first()
  if not r: raise HTTPException(404,"Demande introuvable")
 return {"rejected":True}

@router.post("/requests/{request_id}/cancel")
def cancel_contact_request(request_id:UUID,current_user=Depends(get_current_user)):
 with get_engine().begin() as c:
  r=c.execute(text("UPDATE contact_requests SET status='cancelled',updated_at=now() WHERE id=:id AND sender_id=:u AND status='pending' RETURNING id"),{"id":request_id,"u":current_user["id"]}).first()
  if not r: raise HTTPException(404,"Demande introuvable")
 return {"cancelled":True}

@router.post("/{user_id}")
def add_contact(user_id:UUID,current_user=Depends(get_current_user)):
 with get_engine().begin() as c:
  req=c.execute(text("SELECT id FROM contact_requests WHERE sender_id=:s AND receiver_id=:r AND status='pending'"),{"s":user_id,"r":current_user["id"]}).first()
  if not req: raise HTTPException(404,"Demande introuvable")
  c.execute(text("UPDATE contact_requests SET status='accepted',updated_at=now() WHERE id=:id"),{"id":req[0]})
  c.execute(text("INSERT INTO contacts(user_id,contact_user_id) VALUES(:a,:b),(:b,:a) ON CONFLICT DO NOTHING"),{"a":current_user["id"],"b":user_id})
 return {"accepted":True}
