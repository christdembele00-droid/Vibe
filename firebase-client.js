import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const configured = Boolean(
  firebaseConfig?.apiKey &&
  firebaseConfig?.authDomain &&
  firebaseConfig?.projectId &&
  firebaseConfig?.appId
);

const app = getApps().length ? getApp() : (configured ? initializeApp(firebaseConfig) : null);

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const firebaseConfigured = configured;

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  onAuthStateChanged,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence
};

let persistenceReady = null;

async function prepareAuthPersistence() {
  if (!auth) return;
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch(error => {
      console.warn('[Vibe] Persistance Firebase Auth:', error);
    });
  }
  await persistenceReady;
}

export async function ensureAnonymousAuth() {
  if (!auth) return null;
  await prepareAuthPersistence();
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}
