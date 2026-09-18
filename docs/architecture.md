# VIBE — Architecture V1

## Objective
Build VIBE as a maintainable WhatsApp-like messaging application for Web/PWA and Android, with a clear separation between presentation, business logic, identity, persistent data, media and real-time transport.

## Public application
- Web/PWA frontend: React / Next.js
- Public static deployment: GitHub Pages
- Optional full Next.js frontend hosting: Vercel
- Android: Capacitor
- Render is not part of VIBE and must not be required at runtime.

The frontend must be able to load its interface without waiting for the backend. Backend requests are used only by features that require server-side persistence or authorization.

## Core services
- Backend: Python / FastAPI
- Main database: PostgreSQL
- Identity: Firebase Authentication
- Push notifications: Firebase Cloud Messaging
- Media: Cloudinary
- Real-time transport: WebSocket
- Edge/DNS/TLS/CDN: Cloudflare
- Source control/CI: GitHub + GitHub Actions
- Monitoring: Sentry, introduced when production is stable
- Web search: provider behind a SearchService abstraction

## Single source of truth
- Identity: Firebase Authentication
- VIBE users, chats, messages, groups, channels, statuses: PostgreSQL
- Binary media: Cloudinary
- Push delivery: FCM
- Real-time transport: WebSocket

WebSocket and FCM are transport mechanisms, never durable message storage.

## Security boundary
The browser is not a trusted authority. It must never contain database credentials, Firebase service-account credentials, Cloudinary API secrets or authorization logic that can grant permissions.

The client sends authenticated requests to FastAPI. FastAPI verifies the Firebase ID token, obtains the Firebase UID, loads the VIBE user from PostgreSQL, then applies authorization and business rules.

## Deployment rule
No Render configuration, URL or runtime dependency is permitted in the VIBE repository.

The backend Docker image remains provider-neutral so another host can be selected later without changing application logic.

## V1 domains
Identity, users/profiles, contacts, direct messages, groups, channels, statuses, media, voice messages, notifications, search, settings/privacy, devices/sessions, moderation/admin, offline/reconnect handling, migrations, monitoring and deployment.

## Migration rule
The replacement Next.js frontend is the public interface. Legacy frontend files are not deleted until their important flows have equivalent tested replacements.
