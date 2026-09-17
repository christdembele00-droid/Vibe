# VIBE Backend

FastAPI modular monolith. This service owns VIBE business logic and authorization.

## Run locally
Install backend/requirements.txt, provide Firebase Admin credentials through environment variables or a platform secret store, then run:

uvicorn app.main:app --reload

Health endpoint:
GET /api/v1/health

## Security
Never commit a Firebase Admin private key, service-account JSON, database password, Cloudinary API secret, or other production secret.
