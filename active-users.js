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

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function render(users) {
  const el = list();
  if (!el) return;
  const rows = users.filter((u) => u.uid !== currentUid);
  const count = rows.length + (currentUid ? 1 : 0);
  el.dataset.count = String(count);
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 11px;margin:3px 2px 7px;border:1px solid rgba(255,255,255,.07);border-radius:15px;background:linear-gradient(135deg,rgba(255,122,24,.12),rgba(255,255,255,.025));">
      <div style="width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:rgba(255,122,24,.16);color:#ffb45a;font-weight:800;font-size:14px;box-shadow:0 0 18px rgba(255,122,24,.12)">●</div>
      <div style="min-width:0;flex:1"><strong style="display:block;font-size:12px">${count} en ligne</strong><span style="display:flex;align-items:center;gap:5px;margin-top:3px;color:#7f8795;font-size:10px"><i class="online-dot"></i> Actifs maintenant</span></div>
      <span style="font-size:18px;line-height:1">${count}</span>
    </div>
    ${rows.map((u) => {
      const name = u.displayName || `Utilisateur ${String(u.uid).slice(0, 8)}`;
      const initial = [...name.trim()][0]?.toUpperCase() || 'V';
      return `<div class="conversation-item" style="cursor:default"><div class="avatar">${escapeHtml(initial)}</div><div><strong>${escapeHtml(name)}</strong><span><i class="online-dot"></i> En ligne</span></div></div>`;
    }).join('')}`;
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

onAuthStateChanged(auth, (user) => { currentUid = user?.uid || null; watch(); });
document.addEventListener('vibe:auth-changed', (event) => { currentUid = event.detail?.user?.uid || auth.currentUser?.uid || null; watch(); });
