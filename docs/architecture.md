# VIBE — Architecture V1

## Objective
Build VIBE as a maintainable WhatsApp-like messaging application for Web/PWA and Android, with clear separation between presentation, business logic, identity, persistent data, media and real-time transport.

## Target architecture
- Frontend: React / Next.js
- Android: Capacitor
- Backend: Python / FastAPI
- Main database: PostgreSQL
- Identity: Firebase Authentication
- Push notifications: Firebase Cloud Messaging
- Media: Cloudinary
- Real-time transport: WebSocket
- Edge/DNS/TLS/CDN: Cloudflare
- Frontend hosting: Vercel
- Backend hosting: provider-neutral Docker; Railway is the documented target, while the application remains deployable to any compatible Python/Docker host.
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

## Backend boundary
The client sends authenticated requests to FastAPI. FastAPI verifies the Firebase ID token, obtains the Firebase UID, loads the VIBE user from PostgreSQL, then applies authorization and business rules.

The client is not trusted for permissions, membership, roles, moderation, message state or ownership decisions.

## V1 domains
Identity, users/profiles, contacts, direct messages, groups, channels, statuses, media, voice messages, notifications, search, settings/privacy, devices/sessions, moderation/admin, offline/reconnect handling, migrations, monitoring and deployment.

## Deliberately excluded from the first foundation
Firestore as VIBE data storage, Firebase Storage, Redis, Kafka, RabbitMQ, Kubernetes, microservices, a separate API gateway, Elasticsearch, Neo4j, multi-region infrastructure and complex AI/RAG infrastructure.

## Migration rule
The current root static application is treated as the legacy UI during migration. It is not deleted until the replacement frontend has equivalent tested flows. This prevents a foundation refactor from destroying working functionality.

## Open product decisions before affected domains are implemented
1. End-to-end encryption (E2EE): yes/no.
2. Audio/video calls in V1 or a later release.
3. Offline synchronization: minimal queue/retry or advanced multi-device sync.
