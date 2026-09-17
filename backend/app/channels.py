from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine

router=APIRouter(prefix="/channels",tags=["channels"])
class ChannelCreate(BaseModel):
    name:str=Field(min_length=1,max_length=100)
    description:str|None=None
    is_public:bool=True

@router.post("")
def create_channel(body:ChannelCreate,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        conv=c.execute(text("INSERT INTO conversations(type,created_by) VALUES('channel',:u) RETURNING id"),{"u":current_user["id"]}).scalar_one()
        c.execute(text("INSERT INTO channels(conversation_id,name,description,owner_id,is_public) VALUES(:c,:n,:d,:u,:p)"),{"c":conv,"n":body.name,"d":body.description,"u":current_user["id"],"p":body.is_public})
        c.execute(text("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES(:c,:u,'owner')"),{"c":conv,"u":current_user["id"]})
    return {"conversation_id":str(conv)}

@router.get("")
def list_channels(current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        rows=c.execute(text("""SELECT ch.conversation_id,ch.name,ch.description,ch.owner_id,ch.photo_url,ch.is_public,
            EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=ch.conversation_id AND cm.user_id=:u AND cm.left_at IS NULL) AS subscribed
            FROM channels ch WHERE ch.is_public OR EXISTS(
                SELECT 1 FROM conversation_members cm2 WHERE cm2.conversation_id=ch.conversation_id AND cm2.user_id=:u AND cm2.left_at IS NULL)
            ORDER BY ch.name"""),{"u":current_user["id"]}).mappings().all()
    return {"channels":[dict(x) for x in rows]}

@router.get("/{conversation_id}")
def get_channel(conversation_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        row=c.execute(text("SELECT conversation_id,name,description,owner_id,photo_url,is_public FROM channels WHERE conversation_id=:c"),{"c":conversation_id}).mappings().first()
        if not row: raise HTTPException(404,"Chaîne introuvable")
        member=c.execute(text("SELECT role FROM conversation_members WHERE conversation_id=:c AND user_id=:u AND left_at IS NULL"),{"c":conversation_id,"u":current_user["id"]}).scalar()
        if not row["is_public"] and member is None: raise HTTPException(403,"Chaîne privée")
    return {"channel":dict(row),"role":member}

@router.post("/{conversation_id}/subscribe")
def subscribe(conversation_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        if not c.execute(text("SELECT 1 FROM channels WHERE conversation_id=:c AND is_public"),{"c":conversation_id}).first(): raise HTTPException(404,"Chaîne publique introuvable")
        c.execute(text("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES(:c,:u,'member') ON CONFLICT(conversation_id,user_id) DO UPDATE SET left_at=NULL"),{"c":conversation_id,"u":current_user["id"]})
    return {"subscribed":True}

@router.delete("/{conversation_id}/subscribe")
def unsubscribe(conversation_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().begin() as c:
        c.execute(text("UPDATE conversation_members SET left_at=now() WHERE conversation_id=:c AND user_id=:u AND role<>'owner'"),{"c":conversation_id,"u":current_user["id"]})
    return {"subscribed":False}

@router.post("/{conversation_id}/publish")
def publish(conversation_id:UUID,current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        role=c.execute(text("SELECT role FROM conversation_members WHERE conversation_id=:c AND user_id=:u AND left_at IS NULL"),{"c":conversation_id,"u":current_user["id"]}).scalar()
    if role not in ("owner","admin"): raise HTTPException(403,"Droit de publication requis")
    return {"can_publish":True}
