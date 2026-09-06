import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, GithubAuthProvider, linkWithPopup, linkWithRedirect } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const FIREBASE_ENABLED = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId && firebaseConfig?.databaseURL);
const app = getApps()[0] ?? initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app, firebaseConfig.databaseURL);
const rtdb = db;
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Compatibilité avec l'ancien code : aucune connexion anonyme automatique.
// L'utilisateur doit ouvrir une vraie session depuis l'interface d'authentification.
async function signInAnonymously() {
  return auth.currentUser ?? null;
}

export {
  FIREBASE_ENABLED,
  app,
  auth,
  db,
  rtdb,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  githubProvider,
  linkWithPopup,
  linkWithRedirect
};
