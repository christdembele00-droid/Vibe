from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.config.settings import get_settings


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True)


def upsert_user_from_firebase(decoded: dict) -> dict:
    uid = str(decoded["uid"])
    email = decoded.get("email")
    display_name = decoded.get("name") or (email.split("@", 1)[0] if email else "Vibe user")
    photo_url = decoded.get("picture")

    sql = text("""
        INSERT INTO users (firebase_uid, display_name, email, photo_url)
        VALUES (:firebase_uid, :display_name, :email, :photo_url)
        ON CONFLICT (firebase_uid) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            email = EXCLUDED.email,
            photo_url = EXCLUDED.photo_url,
            updated_at = now()
        RETURNING id, firebase_uid, username, display_name, email, photo_url, about, role, created_at, updated_at, deleted_at
    """)
    with get_engine().begin() as connection:
        row = connection.execute(sql, {
            "firebase_uid": uid,
            "display_name": display_name,
            "email": email,
            "photo_url": photo_url,
        }).mappings().one()
        connection.execute(
            text("INSERT INTO user_settings (user_id) VALUES (:user_id) ON CONFLICT (user_id) DO NOTHING"),
            {"user_id": row["id"]},
        )
    return dict(row)
