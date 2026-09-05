import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, onSnapshot, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const counter = document.getElementById('onlineCount');
const label = document.getElementById('onlineUsersLabel');
let unsubscribePresence = null;
let heartbeat = null;
let currentUser = null;
let pagehideBound = false;
const ONLINE_WINDOW = 90_000;
const fallback = 'https://i.pravatar.cc/150?img=12';

function render(count) {
  if (!counter) return;
  counter.textContent = String(count);
  counter.title = `${count} utilisateur${count > 1 ? 's' : ''} en ligne`;
  counter.setAttribute('aria-label', counter.title);
  if (label) label.textContent = `utilisateur${count > 1 ? 's' : ''} en ligne`;
}

function isRecentlyOnline(user) {
  if (!user?.uid || user.online !== true) return false;
  const lastSeenMs = Number(user.lastSeenMs || 0);
  if (lastSeenMs > 0) return Date.now() - lastSeenMs <= ONLINE_WINDOW;
  const serverMs = user.lastSeen?.toMillis?.();
  return !!serverMs && Date.now() - serverMs <= ONLINE_WINDOW;
}

function startCounter() {
  unsubscribePresence?.();
  unsubscribePresence = onSnapshot(
    collection(db, 'presence'),
    snap => {
      let count = 0;
      snap.forEach(d => { if (isRecentlyOnline(d.data())) count++; });
      render(count);
    },
    error => {
      console.error('[VIBE] Firestore presence listener error:', error);
      render(0);
    }
  );
}

async function writeUser(user, online) {
  const now = Date.now();
  const name = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
  const avatar = user.photoURL || fallback;
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name,
    email: user.email || '',
    avatar,
    online,
    lastSeenMs: online ? now : 0,
    lastSeen: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function writePresence(user, online) {
  const now = Date.now();
  const name = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
  const avatar = user.photoURL || fallback;
  await setDoc(doc(db, 'presence', user.uid), {
    uid: user.uid,
    name,
    avatar,
    online,
    lastSeenMs: online ? now : 0,
    lastSeen: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function setPresence(user, online, syncUser = false) {
  if (!user?.uid) return;
  if (syncUser) {
    try {
      await writeUser(user, online);
    } catch (error) {
      console.error('[VIBE] users write failed:', error?.code || error?.message || error);
    }
  }
  try {
    await writePresence(user, online);
  } catch (error) {
    console.error('[VIBE] presence write failed:', error?.code || error?.message || error);
  }
}

function stopHeartbeat(user, syncUser = false) {
  clearInterval(heartbeat);
  heartbeat = null;
  if (user) void setPresence(user, false, syncUser);
}

function startHeartbeat(user) {
  clearInterval(heartbeat);
  heartbeat = null;
  if (!user) return;
  currentUser = user;
  // Synchronise le document utilisateur une seule fois à la connexion.
  void setPresence(user, true, true);
  // Le heartbeat ne touche plus users/{uid}; il met uniquement à jour presence/{uid}.
  heartbeat = setInterval(() => {
    if (auth.currentUser?.uid === user.uid) void setPresence(user, true, false);
  }, 20_000);

  if (!pagehideBound) {
    pagehideBound = true;
    window.addEventListener('pagehide', () => {
      if (auth.currentUser) void setPresence(auth.currentUser, false, true);
    });
  }
}

onAuthStateChanged(auth, user => {
  console.info('[VIBE] Auth state for Firestore sync:', user ? user.uid : 'signed-out');
  if (currentUser && (!user || user.uid !== currentUser.uid)) stopHeartbeat(currentUser, true);
  currentUser = user || null;
  if (user) startHeartbeat(user);
  else {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  startCounter();
});

render(0);
