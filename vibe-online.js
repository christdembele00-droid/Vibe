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
  unsubscribePresence = onSnapshot(collection(db, 'presence'), snap => {
    let count = 0;
    snap.forEach(d => { if (isRecentlyOnline(d.data())) count++; });
    render(count);
  }, error => {
    console.error('[VIBE] Presence listener error:', error);
    render(0);
  });
}

async function setPresence(user, online) {
  if (!user) return;
  const now = Date.now();
  const name = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
  const avatar = user.photoURL || fallback;
  try {
    const payload = {
      uid: user.uid,
      name,
      avatar,
      online,
      lastSeenMs: online ? now : 0,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    // La présence alimente le compteur et le document users alimente la liste des contacts.
    await Promise.all([
      setDoc(doc(db, 'presence', user.uid), payload, { merge: true }),
      setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email: user.email || '',
        avatar,
        online,
        lastSeenMs: online ? now : 0,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    ]);
  } catch (error) {
    console.error('[VIBE] Presence/users update error:', error);
  }
}

function stopHeartbeat(user) {
  clearInterval(heartbeat);
  heartbeat = null;
  if (user) setPresence(user, false);
}

function startHeartbeat(user) {
  stopHeartbeat();
  if (!user) return;
  currentUser = user;
  setPresence(user, true);
  heartbeat = setInterval(() => setPresence(user, true), 20_000);
  window.addEventListener('pagehide', () => setPresence(user, false), { once: true });
}

onAuthStateChanged(auth, user => {
  if (currentUser && (!user || user.uid !== currentUser.uid)) stopHeartbeat(currentUser);
  currentUser = user || null;
  if (user) startHeartbeat(user);
  else {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  startCounter();
});

render(0);
