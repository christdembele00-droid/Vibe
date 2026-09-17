from sqlalchemy import text
from app.database import get_engine
from app.auth.firebase import _initialize
from firebase_admin import auth as firebase_auth
import cloudinary.uploader

def cleanup_expired_statuses():
    with get_engine().begin() as c:
        return c.execute(text("DELETE FROM statuses WHERE expires_at <= now()")).rowcount

def cleanup_orphan_media():
    with get_engine().begin() as c:
        return c.execute(text("""UPDATE media SET status='deleted' WHERE status='active' AND created_at < now() - interval '24 hours' AND public_id IS NOT NULL AND id NOT IN (SELECT media_id FROM message_attachments) AND id NOT IN (SELECT media_id FROM statuses WHERE media_id IS NOT NULL)""")).rowcount

def process_pending_account_deletions(limit=10):
    _initialize(); processed=0
    with get_engine().connect() as c:
        jobs=c.execute(text("""SELECT r.id,r.user_id,u.firebase_uid FROM account_deletion_requests r JOIN users u ON u.id=r.user_id WHERE r.status='pending' ORDER BY r.requested_at LIMIT :n"""),{"n":max(1,min(limit,50))}).mappings().all()
    for job in jobs:
        try:
            with get_engine().begin() as c:
                if not c.execute(text("UPDATE account_deletion_requests SET status='processing',error_message=NULL WHERE id=:id AND status='pending' RETURNING id"),{"id":job["id"]}).first(): continue
                media=c.execute(text("SELECT public_id,resource_type FROM media WHERE created_by=:u AND public_id IS NOT NULL AND status<>'deleted'"),{"u":job["user_id"]}).mappings().all()
                c.execute(text("DELETE FROM devices WHERE user_id=:u"),{"u":job["user_id"]})
            for item in media:
                result = cloudinary.uploader.destroy(item["public_id"], resource_type=item["resource_type"], invalidate=True)
                if result.get("result") not in ("ok", "not found"):
                    raise RuntimeError("Cloudinary deletion failed: " + str(result))
            try: firebase_auth.delete_user(job["firebase_uid"])
            except firebase_auth.UserNotFoundError: pass
            with get_engine().begin() as c:
                c.execute(text("UPDATE media SET status='deleted' WHERE created_by=:u"),{"u":job["user_id"]})
                c.execute(text("DELETE FROM users WHERE id=:u"),{"u":job["user_id"]})
                c.execute(text("UPDATE account_deletion_requests SET status='completed',processed_at=now() WHERE id=:id"),{"id":job["id"]})
            processed+=1
        except Exception as exc:
            with get_engine().begin() as c: c.execute(text("UPDATE account_deletion_requests SET status='pending',error_message=:e WHERE id=:id"),{"e":str(exc)[:1000],"id":job["id"]})
    return processed
