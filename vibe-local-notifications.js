import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const roomUnsubs = new Map();
let roomsUnsub = null;
let permissionRequested = false;

function showLocalNotification(title, body, data = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: './icons/icon.svg',
      badge: './icons/icon.svg',
      tag: data.roomId ? `vibe-room-${data.roomId}` : 'vibe-message',
      data
    });
    n.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent('vibe:notification-click', { detail: data }));
      n.close();
    };
  } catch (_) {}
}

async function ensurePermission() {
  if (!('Notification' in window) || permissionRequested) return;
  permissionRequested = true;
  if (Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch (_) {}
  }
}

function watchRoom(roomId, userId) {
  if (roomUnsubs.has(roomId)) return;
  const q = query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  let initialized = false;
  const unsub = onSnapshot(q, snap => {
    if (!initialized) {
      initialized = true;
      return;
    }
    snap.docChanges().filter(change => change.type === 'added').forEach(change => {
      const message = change.doc.data();
      if (!message?.sender || message.sender === userId) return;
      const text = message.text ? String(message.text).slice(0, 180) : 'Nouveau message';
      showLocalNotification('VIBE', text, { roomId, messageId: change.doc.id, senderId: message.sender });
    });
  }, () => {});
  roomUnsubs.set(roomId, unsub);
}

function stopAll() {
  roomsUnsub?.();
  roomsUnsub = null;
  roomUnsubs.forEach(unsub => unsub());
  roomUnsubs.clear();
}

onAuthStateChanged(auth, async user => {
  stopAll();
  if (!user) return;
  await ensurePermission();
  const q = query(collection(db, 'rooms'), where('participants', 'array-contains', user.uid));
  roomsUnsub = onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'removed') {
        roomUnsubs.get(change.doc.id)?.();
        roomUnsubs.delete(change.doc.id);
        return;
      }
      watchRoom(change.doc.id, user.uid);
    });
  }, () => {});
});

window.VIBE_LOCAL_NOTIFICATIONS = { stop: stopAll };
