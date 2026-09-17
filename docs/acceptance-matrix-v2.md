# VIBE Architecture and UI Acceptance Matrix

## Non-negotiable foundation
Next.js/React -> FastAPI -> PostgreSQL.
Firebase Auth = identity.
FCM = push.
Cloudinary = media storage.
WebSocket = realtime transport.
Capacitor = Android.
Legacy frontend is retained until feature parity is tested.

## UI
- spatial surfaces instead of rigid separators
- floating composer
- glass header/drawers
- smart message radius
- edge-to-edge media
- channel Bento Grid
- animated segmented control
- AI drawer
- expandable search
- avatar presence
- Inter/Plus Jakarta Sans
- slate text
- 200ms micro-interactions
- reduced-motion support
- responsive web/mobile

## Runtime acceptance still required
- Firebase Google Android SHA-1 and real APK build
- real FCM delivery and invalid-token cleanup
- WebSocket multi-client/reconnect synchronization
- Cloudinary upload/delete/orphan lifecycle
- contact request reject/cancel/list
- group membership/removal/permissions
- channel publish and moderation
- status privacy/views/expiry worker
- account deletion worker execution and retry
- Firestore data migration
- Next.js feature parity with legacy
- Render/Vercel/HTTPS/CORS/WebSocket
- production backup/restore
- E2EE and calls remain product decisions
