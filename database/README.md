# VIBE Database

PostgreSQL is the durable source of truth for VIBE application data.

Schema changes must be delivered through versioned SQL migrations. Do not edit production tables manually.

## Migration runner

The backend migration runner applies files from `database/migrations/*.sql` in lexical order and records applied versions in `schema_migrations`.

Local execution:

```bash
cd backend
python -m app.migrate
```

Docker Compose runs migrations before starting the backend.

CI also applies the migrations against PostgreSQL before the backend tests.

The initial schema is `database/migrations/0001_initial.sql`.
