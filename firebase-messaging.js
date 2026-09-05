import { getMessaging, getToken, onMessage, deleteToken } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js';
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { firebaseConfig, VIBE_FCM_VAPID_KEY } from './firebase-config.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);
let currentToken = null;
let foregroundUnsubscribe = null;

function notify(title, body, data = {}) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = `${title}${body ? ` — ${body}` : ''}`;
    toast.style.display = 'block';
    clearTimeout(window.__vibeFcmToast);
    window.__vibeFcmToast = setTimeout(() => { toast.style.display = 'none'; }, 5000);
  }
  window.dispatchEvent(new CustomEvent('vibe:notification', { detail: { title, body, data } }));
}

function tokenDocId(token) { return encodeURIComponent(token).slice(0, 1500); }

async function saveToken(user, token) {
  await setDoc(doc(db, 'users', user.uid, 'fcmTokens', tokenDocId(token)), {
    token,
    uid: user.uid,
    platform: 'web',
    updatedAt: serverTimestamp()
  }, { merge: true });
  currentToken = token;
}

export async function initVibeNotifications(user) {
  if (!user || !('Notification' in window) || !('serviceWorker' in navigator)) return { ok: false, reason: 'unsupported' };
  if (!VIBE_FCM_VAPID_KEY) return { ok: false, reason: 'missing-vapid-key' };
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'permission-denied' };
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey: VIBE_FCM_VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return { ok: false, reason: 'token-unavailable' };
    await saveToken(user, token);
    foregroundUnsubscribe?.();
    foregroundUnsubscribe = onMessage(messaging, payload => {
      notify(payload.notification?.title || 'VIBE', payload.notification?.body || 'Nouveau message', payload.data || {});
    });
    return { ok: true, token };
  } catch (error) {
    console.error('VIBE FCM:', error);
    return { ok: false, reason: error?.code || error?.message || 'fcm-error' };
  }
}

export async function disableVibeNotifications(user) {
  foregroundUnsubscribe?.();
  foregroundUnsubscribe = null;
  if (!user || !currentToken) return;
  const token = currentToken;
  currentToken = null;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'fcmTokens', tokenDocId(token)));
    await deleteToken(messaging);
  } catch (_) {}
}

window.VIBE_NOTIFICATIONS = { initVibeNotifications, disableVibeNotifications };

onAuthStateChanged(auth, async user => {
  if (!user) return;
  const result = await initVibeNotifications(user);
  if (!result.ok && result.reason !== 'missing-vapid-key') console.warn('VIBE notifications:', result.reason);
});
