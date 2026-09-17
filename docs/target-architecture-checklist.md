# VIBE — Re-audit architecture 1 → 7

## 1. Architecture
Target remains: Next.js → FastAPI → PostgreSQL; Firebase Auth/FCM; Cloudinary; WebSocket; Capacitor.
Legacy frontend remains until measured feature parity.

## 2. Problems found
- WebSocket disconnect cleanup was incomplete.
- Status visibility was enforced inconsistently between listing and viewing.
- Media deletion only changed PostgreSQL state and did not remove the Cloudinary asset.
- Account deletion needs an explicit retry path for failed jobs.
- FCM is implemented as a side effect but real credentials/device delivery remain runtime acceptance items.
- Offline queue exists but must be integrated into all mutations before declaring offline acceptance.
- Real Android SHA-1, CI execution, deployment, migration and E2E cannot be verified from repository code alone.

## 3. Responsibilities
Firebase = identity/push; PostgreSQL = durable application state; FastAPI = authorization/business rules; Cloudinary = binary media; WebSocket = transport; frontend = presentation/state; Capacitor = Android shell.

## 4. Flows
Authentication, messaging, delivery/read state, realtime auth, media completion, status expiry, group/channel permissions and account deletion are represented in backend flows. External side effects remain after durable state changes.

## 5. Database
Core entities and lifecycle tables exist. Message idempotency/delivery migration exists. Foreign keys and unique constraints cover the main ownership relationships. Runtime migration execution still required.

## 6. Technical verification
Static repository review found concrete lifecycle issues and they are being corrected. CI currently has no recorded workflow result for the latest branch state, so no green-build claim is made.

## 7. Implementation/tests
Foundation tests exist for health and authentication boundaries. Runtime multi-client, Android, Cloudinary, FCM, migration and E2E tests remain required.

## Stabilization rule
Repeat 1 → 7 after every corrective batch. A domain is only considered migrated when its runtime acceptance test passes. No legacy feature is removed before replacement parity is demonstrated.
