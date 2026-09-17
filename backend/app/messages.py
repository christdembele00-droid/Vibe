from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
from app.realtime import manager

router = APIRouter(prefix="/conversations/{conversation_id}/messages", tags=["messages"])

class SendMessageRequest(BaseModel):
    type: str = Field(default="text", pattern="^(text|image|video|audio|file|system)$")
    text: str | None = None
    client_message_id: str | None = Field(default=None, max_length=128)
    reply_to_id: UUID | None = None
    metadata: dict = Field(default_factory=dict)

def _member(conn, conversation_id: UUID, user_id) -> bool:
    return conn.execute(text("SELECT 1 FROM conversation_members WHERE conversation_id=:c AND user_id=:u AND left_at IS NULL"), {"c":conversation_id,"u":user_id}).first() is not None

def _message(conn, conversation_id: UUID, message_id: UUID):
    return conn.execute(text("SELECT id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata FROM messages WHERE conversation_id=:c AND id=:m"), {"c":conversation_id,"m":message_id}).mappings().first()

@router.get("")
def list_messages(conversation_id: UUID, before: UUID | None = None, limit: int = 50, current_user: dict = Depends(get_current_user)) -> dict:
    limit = max(1, min(limit, 100))
    with get_engine().connect() as conn:
        if not _member(conn, conversation_id, current_user["id"]): raise HTTPException(status_code=403, detail="Accès refusé")
        params={"c":conversation_id,"limit":limit}
        where="conversation_id=:c AND deleted_at IS NULL"
        if before:
            row=conn.execute(text("SELECT created_at FROM messages WHERE id=:m AND conversation_id=:c"), {"m":before,"c":conversation_id}).first()
            if row: where += " AND created_at < :before"; params["before"]=row[0]
        rows=conn.execute(text(f"SELECT id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata FROM messages WHERE {where} ORDER BY created_at DESC LIMIT :limit"), params).mappings().all()
    return {"messages":[dict(row) for row in reversed(rows)]}

@router.post("")
async def send_message(conversation_id: UUID, request: SendMessageRequest, current_user: dict = Depends(get_current_user)) -> dict:
    if request.type == "text" and not (request.text or "").strip(): raise HTTPException(status_code=400, detail="Message texte vide")
    with get_engine().begin() as conn:
        if not _member(conn, conversation_id, current_user["id"]): raise HTTPException(status_code=403, detail="Accès refusé")
        if request.client_message_id:
            existing=conn.execute(text("SELECT id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata FROM messages WHERE sender_id=:u AND client_message_id=:cid"), {"u":current_user["id"],"cid":request.client_message_id}).mappings().first()
            if existing: return {"message":dict(existing),"deduplicated":True}
        row=conn.execute(text("""
            INSERT INTO messages(conversation_id,sender_id,type,text,reply_to_id,client_message_id,metadata)
            VALUES(:c,:u,:type,:text,:reply,:cid,CAST(:metadata AS jsonb))
            RETURNING id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata
        """), {"c":conversation_id,"u":current_user["id"],"type":request.type,"text":request.text,"reply":request.reply_to_id,"cid":request.client_message_id,"metadata":__import__("json").dumps(request.metadata)}).mappings().one()
        conn.execute(text("UPDATE conversations SET updated_at=now() WHERE id=:c"), {"c":conversation_id})
    payload=jsonable_encoder({"type":"message.created","message":dict(row)})
    await manager.broadcast(str(conversation_id), payload)
    return {"message":dict(row),"deduplicated":False}

@router.patch("/{message_id}")
async def edit_message(conversation_id: UUID, message_id: UUID, request: SendMessageRequest, current_user: dict = Depends(get_current_user)) -> dict:
    with get_engine().begin() as conn:
        if not _member(conn, conversation_id, current_user["id"]): raise HTTPException(status_code=403, detail="Accès refusé")
        existing=_message(conn,conversation_id,message_id)
        if not existing: raise HTTPException(status_code=404, detail="Message introuvable")
        if str(existing["sender_id"]) != str(current_user["id"]): raise HTTPException(status_code=403, detail="Modification non autorisée")
        row=conn.execute(text("UPDATE messages SET text=:text,updated_at=now() WHERE id=:m RETURNING id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata"), {"text":request.text,"m":message_id}).mappings().one()
    await manager.broadcast(str(conversation_id), jsonable_encoder({"type":"message.updated","message":dict(row)}))
    return {"message":dict(row)}

@router.delete("/{message_id}")
async def delete_message(conversation_id: UUID, message_id: UUID, current_user: dict = Depends(get_current_user)) -> dict:
    with get_engine().begin() as conn:
        if not _member(conn, conversation_id, current_user["id"]): raise HTTPException(status_code=403, detail="Accès refusé")
        existing=_message(conn,conversation_id,message_id)
        if not existing: raise HTTPException(status_code=404, detail="Message introuvable")
        if str(existing["sender_id"]) != str(current_user["id"]): raise HTTPException(status_code=403, detail="Suppression non autorisée")
        conn.execute(text("UPDATE messages SET deleted_at=now(),updated_at=now(),text=NULL WHERE id=:m"), {"m":message_id})
    await manager.broadcast(str(conversation_id), {"type":"message.deleted","message_id":str(message_id)})
    return {"deleted":True,"message_id":str(message_id)}
