from pathlib import Path

import psycopg
from sqlalchemy.engine import make_url

from app.config.settings import get_settings


def main() -> None:
    settings = get_settings()
    url = make_url(settings.database_url)
    conninfo = url.render_as_string(hide_password=False).replace("postgresql+psycopg://", "postgresql://", 1)

    migrations_dir = Path(__file__).resolve().parents[2] / "database" / "migrations"
    migrations = sorted(migrations_dir.glob("*.sql"))

    with psycopg.connect(conninfo) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            for migration in migrations:
                version = migration.name
                cur.execute("SELECT 1 FROM schema_migrations WHERE version = %s", (version,))
                if cur.fetchone():
                    continue
                cur.execute(migration.read_text(encoding="utf-8"))
                cur.execute("INSERT INTO schema_migrations(version) VALUES (%s)", (version,))
        conn.commit()


if __name__ == "__main__":
    main()
