from fastapi import APIRouter,Depends
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/notifications",tags=["notifications"])
@router.get("/devices")
def notification_devices(current_user=Depends(get_current_user)):
 with get_engine().connect() as c:
  rows=c.execute(text("SELECT id,platform,device_name,last_seen_at,created_at FROM devices WHERE user_id=:u ORDER BY last_seen_at DESC NULLS LAST"),{"u":current_user["id"]}).mappings().all()
 return {"devices":[dict(x) for x in rows]}
