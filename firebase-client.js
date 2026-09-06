import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
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
let db = null;
let storage = null;
let rtdb = null;

if (FIREBASE_ENABLED) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  rtdb = getDatabase(app, 'https://vibe-749e5-default-rtdb.firebaseio.com');
}

export {
  auth,
  db,
  storage,
  rtdb,
  FIREBASE_ENABLED,
  onAuthStateChanged,
  signInAnonymously,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  ref,
  uploadBytes,
  getDownloadURL,
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
