# VIBE — Target architecture acceptance checklist

## Implemented foundation
- FastAPI API boundary with Firebase ID-token verification.
- PostgreSQL migrations and durable domain schema.
- User/profile/settings boundaries.
- Contacts and blocking boundaries.
- Direct/group/channel conversation model.
- Message persistence, edit/delete, idempotency key and delivery schema.
- WebSocket authentication and conversation transport.
- Cloudinary signature + media persistence boundary.
- Status expiration model.
- Device/FCM token storage boundary.
- Security reports, audit log and account-deletion request lifecycle.
- Next.js frontend skeleton kept separate from legacy UI.
- Render/Vercel deployment configuration foundation.

## Still requires runtime acceptance before migration is declared complete
- Real Firebase Google Android sign-in with debug and release/Play SHA-1.
- Successful GitHub Actions Android build with the real Firebase secret.
- PostgreSQL user migration from the legacy Firestore path.
- Real Web and Android message/reconnect/offline tests.
- Cloudinary upload/delete/orphan tests with real credentials.
- FCM delivery tests with multiple devices and invalid-token cleanup.
- Group/channel/status end-to-end tests.
- Production Render/Vercel/HTTPS/CORS/WebSocket validation.
- Account deletion worker executing Firebase + PostgreSQL + media cleanup.
- Next.js feature parity before legacy UI removal.
- E2EE, calls and offline sophistication remain explicit product decisions.

A green code foundation is not a green product domain. Each domain must pass the migration contract before legacy removal.
