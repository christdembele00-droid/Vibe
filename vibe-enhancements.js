import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, addDoc, setDoc, query, where, orderBy, limit, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant vibe-enhancements.js');
const auth = getAuth(app);
const db = getFirestore(app);
let user = null;
let stopCalls = null;
let notificationReady = false;
const $ = (id) => document.getElementById(id);
const clean = (value, max = 80) => String(value || '').trim().slice(0, max);
const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const toast = (text) => { const el = $('toast'); if (!el) return; el.textContent = text; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600); };

async function indexUser(next) {
  if (!next?.uid) return;
  const name = next.displayName || next.email?.split('@')[0] || 'Utilisateur';
  try {
    await setDoc(doc(db, 'userSearch', next.uid), {
      uid: next.uid,
      displayName: name,
      displayNameLower: name.toLowerCase(),
      email: next.email || null,
      photoURL: next.photoURL || null,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) { console.warn('Index utilisateur:', error); }
}

function renderSearchResults(rows) {
  const list = $('conversationList');
  if (!list) return;
  list.innerHTML = rows.map((row) => `<button class="conversation-item" data-user-result="${esc(row.uid)}"><div class="avatar">${esc((row.displayName || 'U').charAt(0).toUpperCase())}</div><div><strong>${esc(row.displayName || 'Utilisateur')}</strong><span>Utilisateur Vibe</span></div></button>`).join('');
}

async function openUserResult(targetUid) {
  if (!user || !targetUid || targetUid === user.uid) return;
  try {
    const existing = await getDocs(query(collection(db, 'conversations'), where('participantIds', 'array-contains', user.uid), limit(100)));
    let found = null;
    existing.forEach((item) => {
      const d = item.data();
      if (!found && Array.isArray(d.participantIds) && d.participantIds.includes(targetUid) && d.participantIds.length === 2) found = { id: item.id, ...d };
    });
    if (!found) {
      const peer = await getDocs(query(collection(db, 'userSearch'), where('uid', '==', targetUid), limit(1)));
      const p = peer.docs[0]?.data();
      const ref = await addDoc(collection(db, 'conversations'), {
        name: p?.displayName || 'Discussion', ownerId: user.uid, participantIds: [user.uid, targetUid],
        inviteToken: crypto.randomUUID().replaceAll('-', ''), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), type: 'private'
      });
      await setDoc(doc(db, 'users', user.uid, 'conversations', ref.id), { chatId: ref.id, updatedAt: serverTimestamp() });
      found = { id: ref.id, name: p?.displayName || 'Discussion', participantIds: [user.uid, targetUid] };
    }
    window.VibeApp?.openChat(found.id, found);
    $('searchInput').value = '';
    setTimeout(() => { const list = $('conversationList'); if (list) list.innerHTML = ''; window.VibeApp?.refreshChats?.(); }, 0);
  } catch (error) { toast(`Impossible d'ouvrir la discussion : ${error.message}`); }
}

async function search(value) {
  const term = clean(value, 60).toLowerCase();
  if (!term) { window.VibeApp?.refreshChats?.(); return; }
  const chats = [...(window.VibeApp?.getChats?.() || [])].filter((c) => String(c.name || '').toLowerCase().includes(term));
  try {
    const q = query(collection(db, 'userSearch'), where('displayNameLower', '>=', term), where('displayNameLower', '<=', `${term}\uf8ff`), limit(20));
    const snap = await getDocs(q);
    const users = snap.docs.map((d) => d.data()).filter((u) => u.uid !== user?.uid);
    const merged = [];
    chats.forEach((c) => merged.push({ chat: true, uid: c.id, displayName: c.name, type: 'Discussion' }));
    users.forEach((u) => merged.push({ ...u, type: 'Utilisateur' }));
    renderSearchResults(merged.map((r) => r.chat ? { uid: '', displayName: r.displayName } : r).filter((r) => r.uid));
    if (!users.length && !chats.length) toast('Aucun résultat.');
  } catch (error) { console.warn('Recherche Vibe:', error); toast(`Recherche indisponible : ${error.message}`); }
}

async function enableNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { notificationReady = true; return; }
  if (Notification.permission === 'default') {
    try { notificationReady = (await Notification.requestPermission()) === 'granted'; } catch (_) {}
  }
}

function watchNotifications() {
  if (!user) return;
  stopCalls?.();
  const q = query(collection(db, 'conversations'), where('participantIds', 'array-contains', user.uid), limit(100));
  const stops = [];
  onSnapshot(q, (snap) => {
    stops.forEach((stop) => stop()); stops.length = 0;
    snap.forEach((chatDoc) => {
      const chat = chatDoc.data();
      const mq = query(collection(db, 'conversations', chatDoc.id, 'messages'), orderBy('createdAt', 'desc'), limit(1));
      const stop = onSnapshot(mq, (ms) => {
        if (!notificationReady || document.visibilityState === 'visible') return;
        const m = ms.docs[0]?.data();
        if (!m || m.uid === user.uid) return;
        const key = `${chatDoc.id}:${ms.docs[0].id}`;
        if (sessionStorage.getItem(`vibe-notified:${key}`)) return;
        sessionStorage.setItem(`vibe-notified:${key}`, '1');
        new Notification(chat.name || 'Nouveau message', { body: String(m.text || 'Nouveau message').slice(0, 120) });
      });
      stops.push(stop);
    });
  });
  stopCalls = () => stops.forEach((stop) => stop());
}

function renderCallHistory(rows) {
  const list = $('conversationList');
  if (!list) return;
  list.innerHTML = rows.map((c) => `<div class="conversation-item"><div class="avatar">${c.kind === 'video' ? '▣' : '☎'}</div><div><strong>${esc(c.name || 'Appel')}</strong><span>${c.status === 'missed' ? 'Appel manqué' : c.status === 'rejected' ? 'Refusé' : 'Appel terminé'} · ${c.kind === 'video' ? 'Vidéo' : 'Audio'}</span></div></div>`).join('');
}

async function loadCallHistory() {
  if (!user) return;
  try {
    const snap = await getDocs(query(collection(db, 'callHistory', user.uid, 'items'), orderBy('createdAt', 'desc'), limit(50)));
    renderCallHistory(snap.docs.map((d) => d.data()));
  } catch (error) { console.warn('Historique appels:', error); }
}

function bind() {
  let timer = null;
  $('searchInput')?.addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => void search(e.target.value), 180); });
  $('searchInput')?.addEventListener('focus', () => { void enableNotifications(); });
  $('conversationList')?.addEventListener('click', (event) => { const row = event.target.closest('[data-user-result]'); if (row) void openUserResult(row.dataset.userResult); });
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => { if (tab.dataset.view === 'calls') setTimeout(loadCallHistory, 0); }));
}

onAuthStateChanged(auth, (next) => { user = next; stopCalls?.(); stopCalls = null; if (user) { void indexUser(user); watchNotifications(); } });
bind();
window.VibeEnhancements = { search, loadCallHistory, enableNotifications };
