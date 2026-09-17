from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine

router=APIRouter(prefix="/groups",tags=["groups"])
class GroupCreate(BaseModel):
    name:str=Field(min_length=1,max_length=100)
    description:str|None=None

def _role(c,conversation_id,user_id):
    return c.execute(text("SELECT role FROM conversation_members WHERE conversation_id=:c AND user_id=:u AND left_at IS NULL"),{"c":conversation_id,"u":user_id}).scalar()

def _group(c,conversation_id):
    return c.execute(text("SELECT conversation_id FROM groups WHERE conversation_id=:c"),{"c":conversation_id}).scalar()

@router.get("")
def list_groups(current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        rows=c.execute(text("SELECT g.conversation_id,g.name,g.description,g.owner_id,g.photo_url FROM groups g JOIN conversation_members cm ON cm.conversation_id=g.conversation_id WHERE cm.user_id=:u AND cm.left_at IS NULL ORDER BY g.name"),{"u":current_user["id"]}).mappings().all()
    return {"groups":[dict(x) for x in rows]}

@router.post("")
def create_group(body:GroupCreate,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        conv=c.execute(text("INSERT INTO conversations(type,created_by) VALUES('group',:u) RETURNING id"),{"u":current_user["id"]}).scalar_one()
        c.execute(text("INSERT INTO groups(conversation_id,name,description,owner_id) VALUES(:c,:n,:d,:u)"),{"c":conv,"n":body.name,"d":body.description,"u":current_user["id"]})
        c.execute(text("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES(:c,:u,'owner')"),{"c":conv,"u":current_user["id"]})
    return {"conversation_id":str(conv)}

@router.get("/{conversation_id}")
def get_group(conversation_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        if not _group(c,conversation_id) or not _role(c,conversation_id,current_user["id"]): raise HTTPException(404,"Groupe introuvable")
        group=c.execute(text("SELECT conversation_id,name,description,owner_id,photo_url FROM groups WHERE conversation_id=:c"),{"c":conversation_id}).mappings().one()
        members=c.execute(text("SELECT u.id,u.display_name,u.username,u.photo_url,cm.role,cm.joined_at FROM conversation_members cm JOIN users u ON u.id=cm.user_id WHERE cm.conversation_id=:c AND cm.left_at IS NULL ORDER BY cm.joined_at"),{"c":conversation_id}).mappings().all()
    return {"group":dict(group),"members":[dict(x) for x in members]}

@router.post("/{conversation_id}/members/{user_id}")
def add_member(conversation_id:UUID,user_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        if _role(c,conversation_id,current_user["id"]) not in ("owner","admin"): raise HTTPException(403,"Droit administrateur requis")
        if not _group(c,conversation_id): raise HTTPException(404,"Groupe introuvable")
        if not c.execute(text("SELECT 1 FROM users WHERE id=:u AND deleted_at IS NULL"),{"u":user_id}).first(): raise HTTPException(404,"Utilisateur introuvable")
        c.execute(text("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES(:c,:u,'member') ON CONFLICT(conversation_id,user_id) DO UPDATE SET left_at=NULL"),{"c":conversation_id,"u":user_id})
    return {"added":True}

@router.delete("/{conversation_id}/members/{user_id}")
def remove_member(conversation_id:UUID,user_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        role=_role(c,conversation_id,current_user["id"]); target=_role(c,conversation_id,user_id)
        if role not in ("owner","admin"): raise HTTPException(403,"Droit administrateur requis")
        if target=="owner": raise HTTPException(409,"Le propriétaire doit transférer la propriété avant de partir")
        if target is None: raise HTTPException(404,"Membre introuvable")
        if role=="admin" and target=="admin": raise HTTPException(403,"Un administrateur ne peut pas retirer un autre administrateur")
        c.execute(text("UPDATE conversation_members SET left_at=now() WHERE conversation_id=:c AND user_id=:u"),{"c":conversation_id,"u":user_id})
    return {"removed":True}

@router.post("/{conversation_id}/leave")
def leave_group(conversation_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        role=_role(c,conversation_id,current_user["id"])
        if role is None: raise HTTPException(404,"Groupe introuvable ou membre absent")
        if role=="owner": raise HTTPException(409,"Transférez la propriété avant de quitter le groupe")
        c.execute(text("UPDATE conversation_members SET left_at=now() WHERE conversation_id=:c AND user_id=:u"),{"c":conversation_id,"u":current_user["id"]})
    return {"left":True}

@router.patch("/{conversation_id}/members/{user_id}/role")
def change_role(conversation_id:UUID,user_id:UUID,role:str,current_user=Depends(get_current_user)):
    if role not in ("member","admin"): raise HTTPException(400,"Rôle invalide")
    with get_engine().begin() as c:
        if _role(c,conversation_id,current_user["id"])!="owner": raise HTTPException(403,"Propriétaire requis")
        if not _role(c,conversation_id,user_id): raise HTTPException(404,"Membre introuvable")
        c.execute(text("UPDATE conversation_members SET role=:r WHERE conversation_id=:c AND user_id=:u"),{"r":role,"c":conversation_id,"u":user_id})
    return {"role":role}

@router.post("/{conversation_id}/transfer/{user_id}")
def transfer_owner(conversation_id:UUID,user_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        if _role(c,conversation_id,current_user["id"])!="owner": raise HTTPException(403,"Propriétaire requis")
        if not _role(c,conversation_id,user_id): raise HTTPException(400,"Nouveau propriétaire absent du groupe")
        c.execute(text("UPDATE conversation_members SET role='admin' WHERE conversation_id=:c AND user_id=:u"),{"c":conversation_id,"u":current_user["id"]})
        c.execute(text("UPDATE conversation_members SET role='owner' WHERE conversation_id=:c AND user_id=:u"),{"c":conversation_id,"u":user_id})
        c.execute(text("UPDATE groups SET owner_id=:u WHERE conversation_id=:c"),{"u":user_id,"c":conversation_id})
    return {"transferred":True}
