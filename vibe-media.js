import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant vibe-media.js');
const auth = getAuth(app); const db = getFirestore(app);
let stopStories = null, cleanupTimer = null;

async function cleanupExpiredStories() {
  const currentUid = auth.currentUser?.uid; if (!currentUid) return;
  const q = query(collection(db, 'stories'), where('uid', '==', currentUid), where('expiresAt', '<=', new Date()), limit(100));
  const snap = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js').then(({getDocs}) => getDocs(q));
  await Promise.all(snap.docs.map((item) => deleteDoc(item.ref).catch(() => {})));
}
function watchStories() {
  stopStories?.(); stopStories = null; const currentUid = auth.currentUser?.uid; if (!currentUid) return;
  const q = query(collection(db, 'stories'), where('uid', '==', currentUid), orderBy('createdAt', 'desc'), limit(50));
  stopStories = onSnapshot(q, (snap) => { const now = Date.now(); snap.docs.forEach((item) => { const expires = item.data()?.expiresAt?.toMillis?.() || 0; if (expires && expires <= now) deleteDoc(item.ref).catch(() => {}); }); }, () => {});
}
onAuthStateChanged(auth, (user) => { stopStories?.(); stopStories = null; if (cleanupTimer) clearInterval(cleanupTimer); cleanupTimer = null; if (!user) return; watchStories(); cleanupExpiredStories().catch(() => {}); cleanupTimer = setInterval(() => cleanupExpiredStories().catch(() => {}), 60000); });
