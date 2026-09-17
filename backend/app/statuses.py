from uuid import UUID
from datetime import datetime,timedelta,timezone
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/statuses",tags=["statuses"])

class StatusCreate(BaseModel):
    text:str|None=None
    media_id:UUID|None=None

def _is_contact(conn,user_id,other_id):
    return conn.execute(text("SELECT 1 FROM contacts WHERE user_id=:u AND contact_user_id=:o"),{"u":user_id,"o":other_id}).first() is not None

@router.post("")
def create_status(body:StatusCreate,current_user=Depends(get_current_user)):
    if not (body.text and body.text.strip()) and not body.media_id: raise HTTPException(400,"Statut vide")
    with get_engine().begin() as c:
        if body.media_id and not c.execute(text("SELECT 1 FROM media WHERE id=:m AND created_by=:u AND status='active'"),{"m":body.media_id,"u":current_user["id"]}).first():
            raise HTTPException(403,"Média non autorisé")
        row=c.execute(text("INSERT INTO statuses(user_id,text,media_id,expires_at) VALUES(:u,:t,:m,:e) RETURNING id,user_id,text,media_id,created_at,expires_at"),{"u":current_user["id"],"t":body.text.strip() if body.text else None,"m":body.media_id,"e":datetime.now(timezone.utc)+timedelta(hours=24)}).mappings().one()
    return {"status":dict(row)}

@router.get("")
def list_statuses(current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        rows=c.execute(text("""
            SELECT s.id,s.user_id,s.text,s.media_id,s.created_at,s.expires_at
            FROM statuses s
            JOIN user_settings us ON us.user_id=s.user_id
            WHERE s.expires_at>now()
              AND (s.user_id=:u OR (us.status_visibility='contacts' AND EXISTS(
                    SELECT 1 FROM contacts x WHERE x.user_id=:u AND x.contact_user_id=s.user_id
              )))
            ORDER BY s.created_at DESC
        """),{"u":current_user["id"]}).mappings().all()
    return {"statuses":[dict(x) for x in rows]}

@router.post("/{status_id}/view")
def view_status(status_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        row=c.execute(text("SELECT user_id FROM statuses WHERE id=:s AND expires_at>now()"),{"s":status_id}).first()
        if not row: raise HTTPException(404,"Statut introuvable ou expiré")
        owner_id=row[0]
        if str(owner_id)!=str(current_user["id"]) and not _is_contact(c,current_user["id"],owner_id):
            raise HTTPException(403,"Statut non accessible")
        c.execute(text("INSERT INTO status_views(status_id,user_id) VALUES(:s,:u) ON CONFLICT(status_id,user_id) DO UPDATE SET viewed_at=now()"),{"s":status_id,"u":current_user["id"]})
    return {"viewed":True}

@router.get("/{status_id}/views")
def status_views(status_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        owner=c.execute(text("SELECT user_id FROM statuses WHERE id=:s"),{"s":status_id}).scalar()
        if owner is None: raise HTTPException(404,"Statut introuvable")
        if str(owner)!=str(current_user["id"]): raise HTTPException(403,"Accès refusé")
        rows=c.execute(text("SELECT user_id,viewed_at FROM status_views WHERE status_id=:s ORDER BY viewed_at DESC"),{"s":status_id}).mappings().all()
    return {"views":[dict(x) for x in rows]}

@router.delete("/{status_id}")
def delete_status(status_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        result=c.execute(text("DELETE FROM statuses WHERE id=:s AND user_id=:u"),{"s":status_id,"u":current_user["id"]})
        if not result.rowcount: raise HTTPException(404,"Statut introuvable")
    return {"deleted":True}
