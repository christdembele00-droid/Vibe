import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
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
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  setPersistence, browserLocalPersistence
};

let persistenceReady = null;
async function prepareAuthPersistence() {
  if (!auth) return;
  if (!persistenceReady) persistenceReady = setPersistence(auth, browserLocalPersistence).catch(error => console.warn('[Vibe] Persistance Firebase Auth:', error));
  await persistenceReady;
}

function isCapacitorMobile() {
  return Boolean(window?.Capacitor?.isNativePlatform?.() || window?.Capacitor?.getPlatform?.() === 'android' || window?.Capacitor?.getPlatform?.() === 'ios');
}

export async function signInWithGoogle() {
  if (!auth) return null;
  await prepareAuthPersistence();

  const currentUser = auth.currentUser;
  const hasGoogleProvider = Boolean(currentUser?.providerData?.some(provider => provider?.providerId === 'google.com'));
  if (currentUser && hasGoogleProvider) return currentUser;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // Dans l'APK Capacitor, le popup OAuth peut être bloqué par le WebView.
  // Le flux redirect ouvre alors l'authentification Google dans le navigateur système.
  if (isCapacitorMobile()) {
    await signInWithRedirect(auth, provider);
    return null;
  }

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
