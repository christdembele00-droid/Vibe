from fastapi import APIRouter,Depends,Query
from sqlalchemy import text
from app.auth.dependencies import get_current_user
from app.database import get_engine
router=APIRouter(prefix="/search",tags=["search"])
@router.get("/users")
def search_users(q:str=Query(min_length=1,max_length=80),current_user=Depends(get_current_user)):
 term=f"%{q.strip()}%"
 with get_engine().connect() as c:
  rows=c.execute(text("SELECT id,username,display_name,photo_url,about FROM users WHERE deleted_at IS NULL AND id<>:me AND (display_name ILIKE :q OR username ILIKE :q) ORDER BY display_name LIMIT 25"),{"me":current_user["id"],"q":term}).mappings().all()
 return {"users":[dict(x) for x in rows]}
