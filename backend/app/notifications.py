from fastapi import APIRouter,Depends
from sqlalchemy import text
from firebase_admin import messaging
from app.auth.firebase import _initialize
from app.auth.dependencies import get_current_user
from app.database import get_engine

router=APIRouter(prefix="/notifications",tags=["notifications"])

def send_push_to_user(user_id, title, body, data=None):
    _initialize()
    with get_engine().connect() as c:
        rows=c.execute(text("SELECT id,push_token FROM devices WHERE user_id=:u"),{"u":user_id}).mappings().all()
    sent=0; removed=0
    for row in rows:
        try:
            messaging.send(messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={str(k):str(v) for k,v in (data or {}).items()},
                token=row["push_token"],
            ))
            sent+=1
        except messaging.UnregisteredError:
            with get_engine().begin() as c: c.execute(text("DELETE FROM devices WHERE id=:d"),{"d":row["id"]})
            removed+=1
        except messaging.InvalidArgumentError:
            with get_engine().begin() as c: c.execute(text("DELETE FROM devices WHERE id=:d"),{"d":row["id"]})
            removed+=1
        except Exception:
            continue
    return {"sent":sent,"removed":removed}

@router.get("/devices")
def notification_devices(current_user=Depends(get_current_user)):
    with get_engine().connect() as c:
        rows=c.execute(text("SELECT id,platform,device_name,last_seen_at,created_at FROM devices WHERE user_id=:u ORDER BY last_seen_at DESC NULLS LAST"),{"u":current_user["id"]}).mappings().all()
    return {"devices":[dict(x) for x in rows]}
