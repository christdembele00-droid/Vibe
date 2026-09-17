# VIBE — Migration contract

A domain is migrated only when its replacement has automated tests, Web validation, Android validation, failure/retry validation and (where applicable) reconnect/synchronization validation. The legacy flow remains until all applicable checks pass.

## Source of truth
- Firebase Authentication: identity only.
- PostgreSQL: VIBE durable state.
- Cloudinary: binary media.
- WebSocket: realtime transport only.
- FCM: push transport only.

## Forbidden shortcuts
- No client-supplied authorization decisions.
- No message persistence in WebSocket or FCM.
- No Firestore writes from a migrated domain.
- No deletion of legacy code before migration acceptance.
- No fake sent/delivered/read state.

## Domain order
Identity → users → contacts → messages/realtime → offline/reconnect → media → FCM → groups → channels → statuses → security hardening → account deletion → Next.js frontend → Render/Vercel → Android release.

## Rejection criteria
A failing automated test, missing environment secret, unverified Android certificate, untested production integration, authorization bypass, or data-source ambiguity prevents a domain from being marked migrated.
