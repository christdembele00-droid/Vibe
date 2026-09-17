from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.auth.firebase import verify_bearer_token
from app.database import get_local_user_by_firebase_uid
from app.database import get_engine
from sqlalchemy import text

router = APIRouter(tags=["realtime"])

class ConnectionManager:
    def __init__(self): self.connections: dict[str,set[WebSocket]] = {}
    async def connect(self, key, ws): await ws.accept(); self.connections.setdefault(key,set()).add(ws)
    def disconnect(self,key,ws):
        peers=self.connections.get(key,set()); peers.discard(ws)
        if not peers: self.connections.pop(key,None)
    async def broadcast(self,key,payload):
        for ws in list(self.connections.get(key,set())):
            try: await ws.send_json(payload)
            except Exception: self.disconnect(key,ws)

manager=ConnectionManager()

@router.websocket("/ws/conversations/{conversation_id}")
async def conversation_socket(websocket: WebSocket, conversation_id: UUID):
    token=websocket.query_params.get("token")
    try: decoded=verify_bearer_token(f"Bearer {token}" if token else None)
    except Exception: await websocket.close(code=1008); return
    user=get_local_user_by_firebase_uid(str(decoded["uid"]))
    if not user: await websocket.close(code=1008); return
    with get_engine().connect() as conn:
        allowed=conn.execute(text("SELECT 1 FROM conversation_members WHERE conversation_id=:c AND user_id=:u AND left_at IS NULL"), {"c":conversation_id,"u":user["id"]}).first()
    if not allowed: await websocket.close(code=1008); return
    key=str(conversation_id); await manager.connect(key,websocket)
    try:
        await websocket.send_json({"type":"connected","conversation_id":key})
        while True:
            message=await websocket.receive_json()
            if message.get("type") == "ping": await websocket.send_json({"type":"pong"})
    except WebSocketDisconnect: manager.disconnect(key,websocket)
    except Exception: manager.disconnect(key,websocket)
