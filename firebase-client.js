import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAnalytics, isSupported as analyticsIsSupported } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, GithubAuthProvider, EmailAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, linkWithPopup, linkWithRedirect } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';

const FIREBASE_ENABLED = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);
const app = getApps()[0] ?? initializeApp(firebaseConfig);

let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (error) {
  console.warn('[Firebase Firestore] persistence unavailable, fallback to default cache:', error);
  db = getFirestore(app);
}
const firestore = db;
const storage = getStorage(app);
const auth = getAuth(app);

let analytics = null;
const analyticsReady = FIREBASE_ENABLED
  ? analyticsIsSupported()
      .then((supported) => {
        if (!supported) return null;
        try {
          analytics = getAnalytics(app);
          return analytics;
        } catch (error) {
          console.warn('[Firebase Analytics] initialization unavailable:', error);
          return null;
        }
      })
      .catch((error) => {
        console.warn('[Firebase Analytics] support check failed:', error);
        return null;
      })
  : Promise.resolve(null);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
const emailProvider = new EmailAuthProvider();
async function signInAnonymously(){ return auth.currentUser ?? null; }

export {
  FIREBASE_ENABLED, app, auth, db, firestore, storage, analytics, analyticsReady,
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, query, where, orderBy, limit, serverTimestamp, writeBatch,
  ref, uploadBytes, getDownloadURL,
  onAuthStateChanged, signInAnonymously, signInWithPopup, signInWithRedirect,
  getRedirectResult, googleProvider, githubProvider, emailProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, linkWithPopup, linkWithRedirect
};
