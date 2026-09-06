import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAnalytics, isSupported as analyticsIsSupported } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, GithubAuthProvider, EmailAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, linkWithPopup, linkWithRedirect } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const FIREBASE_ENABLED = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);
const app = getApps()[0] ?? initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const firestore = db;

// Analytics is optional on unsupported browsers/privacy environments.
// Firebase recommends getAnalytics(app) for Web Analytics initialization.
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
  FIREBASE_ENABLED, app, auth, db, firestore, analytics, analyticsReady,
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, query, where, orderBy, limit, serverTimestamp, writeBatch,
  onAuthStateChanged, signInAnonymously, signInWithPopup, signInWithRedirect,
  getRedirectResult, googleProvider, githubProvider, emailProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, linkWithPopup, linkWithRedirect
};
