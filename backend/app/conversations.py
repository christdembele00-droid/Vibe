from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine

router = APIRouter(prefix="/conversations", tags=["conversations"])

class DirectConversationRequest(BaseModel):
    user_id: UUID

@router.post("/direct")
def create_direct(request: DirectConversationRequest, current_user: dict = Depends(get_current_user)) -> dict:
    if str(request.user_id) == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="Une conversation directe nécessite un autre utilisateur")
    key = ":".join(sorted([str(current_user["id"]), str(request.user_id)]))
    with get_engine().begin() as conn:
        target = conn.execute(text("SELECT id FROM users WHERE id=:id AND deleted_at IS NULL"), {"id": request.user_id}).first()
        if not target:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        row = conn.execute(text("""
            INSERT INTO conversations(type, direct_key, created_by) VALUES ('direct', :key, :creator)
            ON CONFLICT (direct_key) DO UPDATE SET updated_at = conversations.updated_at
            RETURNING id, type, direct_key, created_at, updated_at
        """), {"key": key, "creator": current_user["id"]}).mappings().one()
        conn.execute(text("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES (:c,:u,'member') ON CONFLICT DO NOTHING"), {"c":row["id"],"u":current_user["id"]})
        conn.execute(text("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES (:c,:u,'member') ON CONFLICT DO NOTHING"), {"c":row["id"],"u":request.user_id})
    return {"conversation": dict(row)}

@router.get("")
def list_conversations(current_user: dict = Depends(get_current_user)) -> dict:
    with get_engine().connect() as conn:
        rows = conn.execute(text("""
            SELECT c.id,c.type,c.created_at,c.updated_at
            FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id
            WHERE m.user_id=:u AND m.left_at IS NULL
            ORDER BY c.updated_at DESC
        """), {"u":current_user["id"]}).mappings().all()
    return {"conversations":[dict(row) for row in rows]}
