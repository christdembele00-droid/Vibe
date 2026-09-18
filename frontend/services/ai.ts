import { api } from "./api";
import type {
  AiActionRisk,
  VibeAiAction,
  VibeAiIntent,
} from "../core/contracts";

export type AiCommandRequest = {
  input: string;
  inputKind?: "text" | "voice";
  conversationId?: string;
};

export type AiCommandResponse = {
  message?: string;
  intent?: VibeAiIntent | null;
  action?: VibeAiAction | null;
};

/**
 * Point d'entrée unique de l'IA dans VIBE.
 *
 * La couche UI ne doit pas appeler directement un fournisseur IA.
 * Elle passe par ce service, puis par l'Action Layer pour toute opération
 * qui modifie des données ou publie du contenu.
 */
export async function runAiCommand(
  request: AiCommandRequest,
  token: string,
): Promise<AiCommandResponse> {
  return api<AiCommandResponse>("/ai/commands", {
    method: "POST",
    token,
    body: JSON.stringify(request),
  });
}

export function requiresAiConfirmation(risk?: AiActionRisk | null): boolean {
  return risk === "publish" || risk === "sensitive";
}
