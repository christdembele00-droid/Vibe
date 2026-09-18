from uuid import UUID
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
from app.realtime import manager
from app.notifications import send_push_to_user

router = APIRouter(prefix="/conversations/{conversation_id}/messages", tags=["messages"])

class SendMessageRequest(BaseModel):
    type: str = Field(default="text", pattern="^(text|image|video|audio|file|system)$")
    text: str | None = None
    client_message_id: str | None = Field(default=None, max_length=128)
    reply_to_id: UUID | None = None
    media_ids: list[UUID] = Field(default_factory=list, max_length=8)
    metadata: dict = Field(default_factory=dict)

class MessageStateRequest(BaseModel):
    message_id: UUID

def _member(conn, conversation_id: UUID, user_id) -> bool:
    return conn.execute(text("SELECT 1 FROM conversation_members WHERE conversation_id=:c AND user_id=:u AND left_at IS NULL"), {"c":conversation_id,"u":user_id}).first() is not None

def _message(conn, conversation_id: UUID, message_id: UUID):
    return conn.execute(text("SELECT id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata FROM messages WHERE conversation_id=:c AND id=:m"), {"c":conversation_id,"m":message_id}).mappings().first()

def _can_post(conn, conversation_id: UUID, user_id) -> bool:
    row = conn.execute(text("""
        SELECT c.type, cm.role
        FROM conversations c
        JOIN conversation_members cm ON cm.conversation_id=c.id
        WHERE c.id=:c AND cm.user_id=:u AND cm.left_at IS NULL
    """), {"c":conversation_id,"u":user_id}).mappings().first()
    if not row: return False
    if row["type"] != "channel": return True
    return row["role"] in ("owner","admin")

def _blocked_direct(conn, conversation_id: UUID, user_id) -> bool:
    return conn.execute(text("""
        SELECT 1
        FROM conversations c
        JOIN conversation_members cm ON cm.conversation_id=c.id
        JOIN blocked_users b ON (b.blocker_id=:u AND b.blocked_id=cm.user_id)
          OR (b.blocker_id=cm.user_id AND b.blocked_id=:u)
        WHERE c.id=:c AND c.type='direct' AND cm.user_id<>:u AND cm.left_at IS NULL
        LIMIT 1
    """), {"c":conversation_id,"u":user_id}).first() is not None

@router.get("")
def list_messages(conversation_id: UUID, before: UUID | None = None, after: UUID | None = None, limit: int = 50, current_user: dict = Depends(get_current_user)) -> dict:
    limit=max(1,min(limit,100))
    with get_engine().connect() as conn:
        if not _member(conn,conversation_id,current_user["id"]): raise HTTPException(403,"Accès refusé")
        params={"c":conversation_id,"limit":limit}
        where="conversation_id=:c AND deleted_at IS NULL"
        if before:
            row=conn.execute(text("SELECT created_at FROM messages WHERE id=:m AND conversation_id=:c"),{"m":before,"c":conversation_id}).first()
            if row: where+=" AND created_at<:before"; params["before"]=row[0]
        if after:
            row=conn.execute(text("SELECT created_at FROM messages WHERE id=:m AND conversation_id=:c"),{"m":after,"c":conversation_id}).first()
            if row: where+=" AND created_at>:after"; params["after"]=row[0]
        order="ASC" if after else "DESC"
        rows=conn.execute(text(f"SELECT id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata FROM messages WHERE {where} ORDER BY created_at {order} LIMIT :limit"),params).mappings().all()
    result=[dict(x) for x in rows]
    if result:
        ids=[item["id"] for item in result]
        with get_engine().connect() as attachment_conn:
            attachment_rows=attachment_conn.execute(text("""
                SELECT ma.message_id,m.id,m.url,m.resource_type,m.mime_type,m.size_bytes,m.width,m.height,m.duration_seconds
                FROM message_attachments ma
                JOIN media m ON m.id=ma.media_id
                WHERE ma.message_id = ANY(:message_ids)
                ORDER BY ma.message_id, ma.position
            """),{"message_ids":ids}).mappings().all()
        attachments_by_message={}
        for item in attachment_rows:
            payload=dict(item)
            message_id=payload.pop("message_id")
            attachments_by_message.setdefault(message_id,[]).append(payload)
        for item in result:
            item["attachments"]=attachments_by_message.get(item["id"],[])
    if not after: result.reverse()
    return {"messages":result}

@router.post("")
async def send_message(conversation_id: UUID, request: SendMessageRequest, current_user: dict = Depends(get_current_user)) -> dict:
    if request.type=="text" and not (request.text or "").strip(): raise HTTPException(400,"Message texte vide")
    with get_engine().begin() as conn:
        if not _member(conn,conversation_id,current_user["id"]): raise HTTPException(403,"Accès refusé")
        if not _can_post(conn,conversation_id,current_user["id"]): raise HTTPException(403,"Droit de publication requis")
        if request.reply_to_id and not _message(conn,conversation_id,request.reply_to_id): raise HTTPException(400,"Message de réponse introuvable dans cette conversation")
        if _blocked_direct(conn,conversation_id,current_user["id"]): raise HTTPException(403,"Conversation indisponible")
        if request.client_message_id:
            existing=conn.execute(text("SELECT id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata FROM messages WHERE sender_id=:u AND client_message_id=:cid"),{"u":current_user["id"],"cid":request.client_message_id}).mappings().first()
            if existing: return {"message":dict(existing),"deduplicated":True}
        if request.media_ids:
            owned = conn.execute(
                text("""
                    SELECT id
                    FROM media
                    WHERE id = ANY(:media_ids)
                      AND created_by = :u
                      AND status = 'active'
                """),
                {"media_ids": request.media_ids, "u": current_user["id"]},
            ).scalars().all()
            if len(owned) != len(set(request.media_ids)):
                raise HTTPException(403, "Un des médias n’est pas autorisé")
            if request.type == "text":
                raise HTTPException(
                    400,
                    "Un message avec média doit utiliser image, video, audio ou file",
                )

        insert_sql="""
            INSERT INTO messages(conversation_id,sender_id,type,text,reply_to_id,client_message_id,metadata)
            VALUES(:c,:u,:type,:text,:reply,:cid,CAST(:metadata AS jsonb))
            ON CONFLICT (sender_id,client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING
            RETURNING id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata
        """
        row=conn.execute(text(insert_sql),{"c":conversation_id,"u":current_user["id"],"type":request.type,"text":request.text,"reply":request.reply_to_id,"cid":request.client_message_id,"metadata":json.dumps(request.metadata)}).mappings().first()
        if row is None and request.client_message_id:
            row=conn.execute(text("""
                SELECT id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata
                FROM messages WHERE sender_id=:u AND client_message_id=:cid
            """),{"u":current_user["id"],"cid":request.client_message_id}).mappings().one()
            deduplicated=True
        else:
            deduplicated=False
        if request.media_ids:
            for position, media_id in enumerate(dict.fromkeys(request.media_ids)):
                conn.execute(
                    text("""
                        INSERT INTO message_attachments(message_id,media_id,position)
                        VALUES(:message_id,:media_id,:position)
                        ON CONFLICT (message_id,media_id) DO NOTHING
                    """),
                    {
                        "message_id": row["id"],
                        "media_id": media_id,
                        "position": position,
                    },
                )
        conn.execute(text("UPDATE conversations SET updated_at=now() WHERE id=:c"),{"c":conversation_id})

    with get_engine().connect() as conn:
        attachment_rows = conn.execute(text("""
            SELECT m.id,m.url,m.resource_type,m.mime_type,m.size_bytes,m.width,m.height,m.duration_seconds
            FROM message_attachments ma
            JOIN media m ON m.id=ma.media_id
            WHERE ma.message_id=:m
            ORDER BY ma.position
        """), {"m": row["id"]}).mappings().all()
    message_payload = dict(row)
    message_payload["attachments"] = [dict(x) for x in attachment_rows]
    payload=jsonable_encoder({"type":"message.created","message":message_payload})
    await manager.broadcast(str(conversation_id),payload)
    with get_engine().connect() as conn:
        recipients=conn.execute(text("SELECT user_id FROM conversation_members WHERE conversation_id=:c AND user_id<>:u AND left_at IS NULL"),{"c":conversation_id,"u":current_user["id"]}).scalars().all()
    preview=(request.text or "").strip() or f"VIBE {request.type}"
    for recipient_id in recipients:
        try:
            send_push_to_user(recipient_id,"Nouveau message",preview[:160],{"conversation_id":str(conversation_id),"message_id":str(row["id"])})
        except Exception:
            pass
    return {"message":message_payload,"deduplicated":deduplicated}

@router.post("/delivered")
async def mark_delivered(conversation_id: UUID, body: MessageStateRequest, current_user: dict = Depends(get_current_user)) -> dict:
    with get_engine().begin() as conn:
        if not _member(conn,conversation_id,current_user["id"]): raise HTTPException(403,"Accès refusé")
        message=_message(conn,conversation_id,body.message_id)
        if not message: raise HTTPException(404,"Message introuvable")
        if str(message["sender_id"])==str(current_user["id"]): raise HTTPException(400,"Le destinataire confirme la livraison")
        conn.execute(text("INSERT INTO message_deliveries(message_id,user_id) VALUES(:m,:u) ON CONFLICT(message_id,user_id) DO UPDATE SET delivered_at=EXCLUDED.delivered_at"),{"m":body.message_id,"u":current_user["id"]})
    await manager.broadcast(str(conversation_id),{"type":"message.delivered","message_id":str(body.message_id),"user_id":str(current_user["id"])})
    return {"delivered":True}

@router.post("/read")
async def mark_read(conversation_id: UUID, body: MessageStateRequest, current_user: dict = Depends(get_current_user)) -> dict:
    with get_engine().begin() as conn:
        if not _member(conn,conversation_id,current_user["id"]): raise HTTPException(403,"Accès refusé")
        message=_message(conn,conversation_id,body.message_id)
        if not message: raise HTTPException(404,"Message introuvable")
        if str(message["sender_id"])==str(current_user["id"]): raise HTTPException(400,"Le destinataire confirme la lecture")
        conn.execute(text("INSERT INTO message_reads(message_id,user_id) VALUES(:m,:u) ON CONFLICT(message_id,user_id) DO UPDATE SET read_at=EXCLUDED.read_at"),{"m":body.message_id,"u":current_user["id"]})
    await manager.broadcast(str(conversation_id),{"type":"message.read","message_id":str(body.message_id),"user_id":str(current_user["id"])})
    return {"read":True}

@router.patch("/{message_id}")
async def edit_message(conversation_id: UUID,message_id: UUID,request: SendMessageRequest,current_user: dict=Depends(get_current_user))->dict:
    if request.type!="text": raise HTTPException(400,"Seuls les messages texte peuvent être modifiés")
    with get_engine().begin() as conn:
        if not _member(conn,conversation_id,current_user["id"]): raise HTTPException(403,"Accès refusé")
        existing=_message(conn,conversation_id,message_id)
        if not existing: raise HTTPException(404,"Message introuvable")
        if str(existing["sender_id"])!=str(current_user["id"]): raise HTTPException(403,"Modification non autorisée")
        if existing["deleted_at"]: raise HTTPException(409,"Message déjà supprimé")
        if not (request.text or "").strip(): raise HTTPException(400,"Message texte vide")
        row=conn.execute(text("UPDATE messages SET text=:text,updated_at=now() WHERE id=:m RETURNING id,conversation_id,sender_id,type,text,reply_to_id,client_message_id,created_at,updated_at,deleted_at,metadata"),{"text":request.text.strip(),"m":message_id}).mappings().one()
    await manager.broadcast(str(conversation_id),jsonable_encoder({"type":"message.updated","message":dict(row)}))
    return {"message":dict(row)}

@router.delete("/{message_id}")
async def delete_message(conversation_id: UUID,message_id: UUID,current_user: dict=Depends(get_current_user))->dict:
    with get_engine().begin() as conn:
        if not _member(conn,conversation_id,current_user["id"]): raise HTTPException(403,"Accès refusé")
        existing=_message(conn,conversation_id,message_id)
        if not existing: raise HTTPException(404,"Message introuvable")
        if str(existing["sender_id"])!=str(current_user["id"]): raise HTTPException(403,"Suppression non autorisée")
        conn.execute(text("UPDATE messages SET deleted_at=now(),updated_at=now(),text=NULL WHERE id=:m"),{"m":message_id})
    await manager.broadcast(str(conversation_id),{"type":"message.deleted","message_id":str(message_id)})
    return {"deleted":True,"message_id":str(message_id)}
