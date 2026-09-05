import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const counter = document.getElementById('onlineCount');
const label = document.getElementById('onlineUsersLabel');
let unsubscribeUsers = null;
let heartbeat = null;

function render(count) {
  if (!counter) return;
  counter.textContent = String(count);
  counter.title = `${count} utilisateur${count > 1 ? 's' : ''} en ligne`;
  counter.setAttribute('aria-label', counter.title);
  if (label) label.textContent = `utilisateur${count > 1 ? 's' : ''} en ligne`;
}

function isRecentlyOnline(user) {
  if (!user?.online) return false;
  const ts = user.lastSeen?.toMillis?.();
  if (!ts) return false;
  return Date.now() - ts <= 90_000;
}

function startCounter() {
  unsubscribeUsers?.();
  unsubscribeUsers = onSnapshot(collection(db, 'users'), snap => {
    let count = 0;
    snap.forEach(d => { if (isRecentlyOnline(d.data())) count++; });
    render(count);
  }, () => render(0));
}

async function setPresence(user, online) {
  if (!user) return;
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      online,
      lastSeen: serverTimestamp()
    });
  } catch (_) {}
}

function startHeartbeat(user) {
  clearInterval(heartbeat);
  if (!user) return;
  setPresence(user, true);
  heartbeat = setInterval(() => setPresence(user, true), 30_000);
  window.addEventListener('pagehide', () => { setPresence(user, false); }, { once: true });
}

onAuthStateChanged(auth, user => {
  if (user) startHeartbeat(user);
  else {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  startCounter();
});

render(0);
