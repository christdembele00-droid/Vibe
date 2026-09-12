import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const configured = Boolean(firebaseConfig?.apiKey && firebaseConfig?.authDomain && firebaseConfig?.projectId && firebaseConfig?.appId);
const app = getApps().length ? getApp() : (configured ? initializeApp(firebaseConfig) : null);

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const firebaseConfigured = configured;

export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, deleteField,
  query, where, orderBy, onSnapshot, serverTimestamp, onAuthStateChanged,
  GoogleAuthProvider, GithubAuthProvider, RecaptchaVerifier,
  signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInAnonymously, signInWithPhoneNumber, signOut,
  setPersistence, browserLocalPersistence
};

let persistenceReady = null;
let phoneConfirmation = null;
let phoneRecaptcha = null;

async function prepareAuthPersistence() {
  if (!auth) return;
  if (!persistenceReady) persistenceReady = setPersistence(auth, browserLocalPersistence).catch(error => console.warn('[Vibe] Persistance Firebase Auth:', error));
  await persistenceReady;
}

function isCapacitorMobile() {
  return Boolean(window?.Capacitor?.isNativePlatform?.() || window?.Capacitor?.getPlatform?.() === 'android' || window?.Capacitor?.getPlatform?.() === 'ios');
}

function getNativeFirebaseAuthentication() {
  return window?.Capacitor?.Plugins?.FirebaseAuthentication || null;
}

export function getAuthErrorMessage(error) {
  const code = String(error?.code || '').replace(/^auth\//, '');
  const messages = {
    'invalid-credential': 'Les identifiants sont invalides.',
    'invalid-email': 'Adresse e-mail invalide.',
    'missing-password': 'Mot de passe requis.',
    'weak-password': 'Le mot de passe est trop faible.',
    'email-already-in-use': 'Cette adresse e-mail est déjà utilisée.',
    'user-not-found': 'Aucun compte ne correspond à cette adresse.',
    'wrong-password': 'Mot de passe incorrect.',
    'user-disabled': 'Ce compte a été désactivé.',
    'too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    'popup-closed-by-user': 'Connexion annulée.',
    'popup-blocked': 'La fenêtre de connexion a été bloquée.',
    'account-exists-with-different-credential': 'Ce compte existe déjà avec une autre méthode de connexion.',
    'operation-not-allowed': 'Cette méthode de connexion n’est pas activée dans Firebase.',
    'provider-already-linked': 'Cette méthode est déjà liée au compte.',
    'invalid-phone-number': 'Numéro de téléphone invalide.',
    'missing-phone-number': 'Numéro de téléphone requis.',
    'invalid-verification-code': 'Code de vérification incorrect.',
    'code-expired': 'Le code de vérification a expiré.',
    'captcha-check-failed': 'La vérification anti-robot a échoué.',
    'quota-exceeded': 'Le quota de connexion a été dépassé. Réessayez plus tard.'
  };
  return messages[code] || error?.message || 'Connexion impossible.';
}

async function signInWithNativeGoogle() {
  const nativeAuth = getNativeFirebaseAuthentication();
  if (!nativeAuth?.signInWithGoogle) {
    throw new Error('Le module Firebase Authentication natif n’est pas disponible dans cette APK.');
  }
  const result = await nativeAuth.signInWithGoogle({ useCredentialManager: true });
  if (!result?.user) return null;
  const idToken = result?.credential?.idToken;
  if (!idToken) throw new Error('Google a authentifié le compte, mais aucun ID token Firebase n’a été retourné.');
  const credential = GoogleAuthProvider.credential(idToken, result?.credential?.accessToken || undefined);
  const webResult = await signInWithCredential(auth, credential);
  return webResult.user;
}

export async function signInWithGoogle() {
  if (!auth) return null;
  await prepareAuthPersistence();
  const currentUser = auth.currentUser;
  const hasGoogleProvider = Boolean(currentUser?.providerData?.some(provider => provider?.providerId === 'google.com'));
  if (currentUser && hasGoogleProvider) return currentUser;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  if (isCapacitorMobile()) return signInWithNativeGoogle();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInWithEmail(email, password) {
  if (!auth) return null;
  await prepareAuthPersistence();
  const result = await signInWithEmailAndPassword(auth, String(email).trim(), password);
  return result.user;
}

export async function createEmailAccount(email, password) {
  if (!auth) return null;
  await prepareAuthPersistence();
  const result = await createUserWithEmailAndPassword(auth, String(email).trim(), password);
  return result.user;
}

export async function signInAsAnonymous() {
  if (!auth) return null;
  await prepareAuthPersistence();
  const result = await signInAnonymously(auth);
  return result.user;
}

function ensurePhoneRecaptcha(containerId = 'vibe-phone-recaptcha') {
  if (!auth) throw new Error('Firebase Authentication n’est pas configuré.');
  if (phoneRecaptcha) return phoneRecaptcha;
  const container = document.getElementById(containerId);
  if (!container) throw new Error('Conteneur reCAPTCHA introuvable.');
  phoneRecaptcha = new RecaptchaVerifier(auth, container, { size: 'invisible' });
  return phoneRecaptcha;
}

export async function startPhoneSignIn(phoneNumber, recaptchaContainerId = 'vibe-phone-recaptcha') {
  if (!auth) return null;
  await prepareAuthPersistence();
  const verifier = ensurePhoneRecaptcha(recaptchaContainerId);
  phoneConfirmation = await signInWithPhoneNumber(auth, String(phoneNumber).trim(), verifier);
  return true;
}

export async function confirmPhoneSignIn(code) {
  if (!phoneConfirmation) throw new Error('Aucune vérification de téléphone en attente.');
  const result = await phoneConfirmation.confirm(String(code).trim());
  phoneConfirmation = null;
  if (phoneRecaptcha) {
    try { phoneRecaptcha.clear(); } catch (_) {}
    phoneRecaptcha = null;
  }
  return result.user;
}

export async function signInWithGithub() {
  if (!auth) return null;
  await prepareAuthPersistence();
  const provider = new GithubAuthProvider();
  provider.setCustomParameters({ allow_signup: 'true' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function completeGoogleRedirect() {
  if (!auth) return null;
  await prepareAuthPersistence();
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error('[Vibe] Retour connexion Google:', error);
    throw error;
  }
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}
