import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, onSnapshot, query, where, limit } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant active-users.js');
const auth = getAuth(app);
const db = getFirestore(app);
const list = () => document.getElementById('activeUsersList');
let stop = null;
let currentUid = null;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => {
  if (c === '&') return '&amp;';
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  if (c === '"') return '&quot;';
  return '&#39;';
});

function render(users) {
  const el = list();
  if (!el) return;
  const rows = users.filter((u) => u.uid !== currentUid);
  const count = rows.length;
  el.dataset.count = String(count);

  if (!count) {
    el.innerHTML = `<div class="conversation-item active-users-empty"><div class="avatar">●</div><div><strong>0 actif</strong><span>Personne d’autre en ligne</span></div></div>`;
    return;
  }

  el.innerHTML = `<div class="conversation-item active-users-head"><div class="avatar">${count}</div><div><strong>${count} actif${count > 1 ? 's' : ''}</strong><span><i class="online-dot"></i> En ligne maintenant</span></div></div>` + rows.map((u) => {
    const name = u.displayName || `Utilisateur ${String(u.uid).slice(0, 8)}`;
    const initial = [...name.trim()][0]?.toUpperCase() || 'V';
    return `<div class="conversation-item"><div class="avatar">${escapeHtml(initial)}</div><div><strong>${escapeHtml(name)}</strong><span><i class="online-dot"></i> En ligne</span></div></div>`;
  }).join('');
}

function watch() {
  stop?.();
  if (!currentUid) { render([]); return; }
  const q = query(collection(db, 'presence'), where('state', '==', 'online'), limit(50));
  stop = onSnapshot(q, (snap) => {
    const users = [];
    snap.forEach((item) => users.push({ uid: item.id, ...item.data() }));
    users.sort((a, b) => String(a.displayName || a.uid).localeCompare(String(b.displayName || b.uid), 'fr'));
    queueMicrotask(() => render(users));
  }, () => render([]));
}

onAuthStateChanged(auth, (user) => {
  currentUid = user?.uid || null;
  watch();
});

document.addEventListener('vibe:auth-changed', (event) => {
  currentUid = event.detail?.user?.uid || auth.currentUser?.uid || null;
  watch();
});
