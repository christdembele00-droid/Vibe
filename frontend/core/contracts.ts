/**
 * VIBE CORE — contrats fondamentaux.
 *
 * Ce module ne contient aucune logique UI. Il définit les frontières entre
 * messagerie, social, média, IA, permissions et synchronisation.
 */

export type VibeInputKind = "text" | "voice" | "image" | "video" | "file";

export type AiCapability =
  | "conversation"
  | "search"
  | "analysis"
  | "creation"
  | "agent"
  | "voice";

export type AiActionRisk = "none" | "low" | "publish" | "sensitive";

export type AiActionState =
  | "proposed"
  | "awaiting_confirmation"
  | "approved"
  | "executing"
  | "completed"
  | "rejected"
  | "failed";

export type PermissionDecision = "allow" | "confirm" | "deny";

export type MessageDeliveryState =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type SyncState = "online" | "offline" | "syncing";

export interface VibeAiIntent {
  domain: string;
  action: string;
  target?: string;
  capability: AiCapability;
  risk: AiActionRisk;
  confidence: number;
}

export interface VibeAiAction<TPayload = unknown> {
  actionId: string;
  intent: VibeAiIntent;
  payload: TPayload;
  state: AiActionState;
  requiresConfirmation: boolean;
}

export interface VibePermissionRequest {
  actionId: string;
  risk: AiActionRisk;
  reason: string;
  decision: PermissionDecision;
}

export interface VibeMessageEnvelope {
  id: string;
  conversationId: string;
  senderId: string;
  kind: VibeInputKind;
  text?: string | null;
  mediaIds?: string[];
  delivery: MessageDeliveryState;
  clientMessageId?: string;
  createdAt?: string;
}

export interface VibeSystemState {
  sync: SyncState;
  aiAvailable: boolean;
  realtime: "connecting" | "connected" | "closed";
}

/**
 * Règle fondamentale :
 * l'IA propose une intention/action ; les services VIBE valident et exécutent.
 * Une capacité IA ne doit jamais contourner les permissions métier.
 */
export const VIBE_CORE_BOUNDARIES = Object.freeze({
  identity: "account-and-auth",
  messaging: "messenger-core",
  social: "social-core",
  media: "media-core",
  ai: "ai-core",
  actions: "ai-action-layer",
  permissions: "permission-layer",
  realtime: "realtime-layer",
  sync: "offline-sync-layer",
  settings: "settings-and-privacy",
} as const);
