import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import { firebaseConfig, FIREBASE_ENABLED } from './firebase-config.js';

let app = null;
let auth = null;
let db = null;
let storage = null;

if (FIREBASE_ENABLED) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { auth, db, storage, FIREBASE_ENABLED, onAuthStateChanged, signInAnonymously, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, ref, uploadBytes, getDownloadURL };
