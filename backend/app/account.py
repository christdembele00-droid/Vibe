from fastapi import APIRouter,Depends
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/account",tags=["account"])
@router.post("/deletion")
def request_deletion(current_user=Depends(get_current_user)):
 with get_engine().begin() as c:
  c.execute(text("INSERT INTO account_deletion_requests(user_id) VALUES(:u) ON CONFLICT(user_id) DO UPDATE SET status='pending',requested_at=now(),processed_at=NULL,error_message=NULL"),{"u":current_user["id"]})
  c.execute(text("UPDATE users SET deleted_at=now(),updated_at=now() WHERE id=:u"),{"u":current_user["id"]})
  c.execute(text("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(:u,'account.deletion_requested','user',:u)"),{"u":current_user["id"]})
 return {"status":"pending","message":"Suppression planifiée; le traitement Firebase et médias doit être exécuté par le worker de cycle de vie."}
