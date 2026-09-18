import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyC6g40Uc9hq9Ij5DU1nwbO-zwpHqk9L9aQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "vibe-749e5.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "vibe-749e5",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:17097166235:web:c39c5c082b3cf6a01ee53e",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

let persistencePromise: Promise<void> | undefined;

function ensurePersistence() {
  persistencePromise ??= setPersistence(auth, browserLocalPersistence);
  return persistencePromise;
}

export async function signInWithGoogle(): Promise<User | null> {
  await ensurePersistence();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
  if (isMobile) {
    await signInWithRedirect(auth, provider);
    return null;
  }
  return (await signInWithPopup(auth, provider)).user;
}

export async function completeGoogleRedirect(): Promise<User | null> {
  await ensurePersistence();
  return (await getRedirectResult(auth))?.user ?? null;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(listener: (user: User | null) => void) {
  return onAuthStateChanged(auth, listener);
}

export async function getIdToken(): Promise<string | null> {
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

export function firebaseErrorMessage(error: unknown): string {
  const code = String((error as { code?: string } | null)?.code ?? "").replace(/^auth\//, "");
  const messages: Record<string, string> = {
    "popup-closed-by-user": "Connexion annulée.",
    "popup-blocked": "Le navigateur a bloqué la fenêtre de connexion.",
    "unauthorized-domain": "Le domaine VIBE n'est pas encore autorisé dans Firebase Authentication.",
    "operation-not-allowed": "La connexion Google n'est pas activée dans Firebase Authentication.",
    "account-exists-with-different-credential": "Ce compte existe déjà avec une autre méthode de connexion.",
    "network-request-failed": "Connexion réseau impossible.",
  };
  return messages[code] ?? "Connexion Google impossible.";
}
