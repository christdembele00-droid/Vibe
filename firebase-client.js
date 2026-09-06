import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithPopup,
  linkWithRedirect
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  getDatabase,
  ref as databaseRef,
  push,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  serverTimestamp as databaseServerTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';
import { firebaseConfig, FIREBASE_ENABLED } from './firebase-config.js';

let app = null;
let auth = null;
let rtdb = null;

if (FIREBASE_ENABLED) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  rtdb = getDatabase(app, 'https://vibe-749e5-default-rtdb.firebaseio.com');
}

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Compatibilité avec l'ancien app.js : Vibe ne crée plus de comptes anonymes.
// L'accès réel passe par Google/GitHub (ou e-mail/mot de passe configuré dans Firebase).
async function signInAnonymously() {
  return auth?.currentUser ?? null;
}

export {
  auth,
  rtdb,
  FIREBASE_ENABLED,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  googleProvider,
  githubProvider,
  linkWithPopup,
  linkWithRedirect,
  databaseRef,
  push,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  databaseServerTimestamp
};
