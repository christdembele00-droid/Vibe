from sqlalchemy import text
from app.database import get_engine

def cleanup_expired_statuses() -> int:
 with get_engine().begin() as c:
  result=c.execute(text("DELETE FROM statuses WHERE expires_at <= now()"))
  return result.rowcount

def cleanup_orphan_media() -> int:
 with get_engine().begin() as c:
  result=c.execute(text("UPDATE media SET status='deleted' WHERE status='active' AND created_at < now() - interval '24 hours' AND id NOT IN (SELECT media_id FROM message_attachments) AND id NOT IN (SELECT media_id FROM statuses WHERE media_id IS NOT NULL)"))
  return result.rowcount
