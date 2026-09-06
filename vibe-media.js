import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, deleteDoc, getDocs } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant vibe-media.js');
const auth = getAuth(app); const db = getFirestore(app);
let stopStories = null, cleanupTimer = null, cleanupRunning = false;

async function cleanupExpiredStories() {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || cleanupRunning) return;
  cleanupRunning = true;
  try {
    const q = query(collection(db, 'stories'), where('uid', '==', currentUid), where('expiresAt', '<=', new Date()), limit(100));
    const snap = await getDocs(q);
    for (const item of snap.docs) {
      if (auth.currentUser?.uid !== currentUid) break;
      await deleteDoc(item.ref).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  } finally { cleanupRunning = false; }
}
function watchStories() {
  stopStories?.(); stopStories = null; const currentUid = auth.currentUser?.uid; if (!currentUid) return;
  const q = query(collection(db, 'stories'), where('uid', '==', currentUid), orderBy('createdAt', 'desc'), limit(50));
  stopStories = onSnapshot(q, (snap) => {
    const now = Date.now();
    snap.docs.forEach((item, index) => {
      const expires = item.data()?.expiresAt?.toMillis?.() || 0;
      if (expires && expires <= now) setTimeout(() => deleteDoc(item.ref).catch(() => {}), Math.min(index * 25, 500));
    });
  }, () => {});
}
onAuthStateChanged(auth, (user) => { stopStories?.(); stopStories = null; if (cleanupTimer) clearInterval(cleanupTimer); cleanupTimer = null; cleanupRunning = false; if (!user) return; watchStories(); void cleanupExpiredStories(); cleanupTimer = setInterval(() => void cleanupExpiredStories(), 60000); });
