import { auth, db, onAuthStateChanged, collection, doc, getDoc, getDocs, addDoc, setDoc, query, where, orderBy, limit, serverTimestamp, onSnapshot } from './firebase-client.js';

const $ = id => document.getElementById(id);
let user = null;
let stopNotifications = null;
let notificationReady = false;
let searchTimer = 0;
let searchGeneration = 0;

const clean = (value, max = 80) => String(value || '').trim().slice(0, max);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const toast = message => {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
};

async function indexUser(next) {
  if (!next?.uid) return;
  const name = next.displayName || next.email?.split('@')[0] || 'Utilisateur';
  try {
    await setDoc(doc(db, 'userSearch', next.uid), {
      uid: next.uid,
      displayName: name,
      displayNameLower: name.toLocaleLowerCase('fr-FR'),
      photoURL: next.photoURL || null,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('Index utilisateur:', error);
  }
}

function restoreChats() {
  if (window.VibeApp?.getChats) renderResults([...window.VibeApp.getChats()]);
}

function renderResults(chats, users = []) {
  const list = $('conversationList');
  if (!list) return;
  const chatHtml = chats.map(chat => `<button type="button" class="conversation-item" data-chat-id="${esc(chat.id)}"><div class="avatar">${esc((chat.name || 'V').charAt(0).toUpperCase())}</div><div><strong>${esc(chat.name || 'Discussion')}</strong><span>Discussion Vibe</span></div></button>`).join('');
  const userHtml = users.map(item => `<button type="button" class="conversation-item" data-user-result="${esc(item.uid)}"><div class="avatar">${esc((item.displayName || 'U').charAt(0).toUpperCase())}</div><div><strong>${esc(item.displayName || 'Utilisateur')}</strong><span>Utilisateur Vibe</span></div></button>`).join('');
  list.innerHTML = chatHtml + userHtml;
  if (!chatHtml && !userHtml) list.innerHTML = '<div class="conversation-item vibe-search-empty"><div><strong>Aucun résultat</strong><span>Essayez un autre nom ou une autre discussion.</span></div></div>';
}

async function search(value) {
  const term = clean(value, 60).toLocaleLowerCase('fr-FR');
  const generation = ++searchGeneration;
  const list = $('conversationList');
  if (!list) return;
  if (!term) { restoreChats(); return; }
  const chats = (window.VibeApp?.getChats?.() || []).filter(chat => String(chat.name || '').toLocaleLowerCase('fr-FR').includes(term));
  try {
    const q = query(collection(db, 'userSearch'), where('displayNameLower', '>=', term), where('displayNameLower', '<=', term + '\uf8ff'), limit(20));
    const snap = await getDocs(q);
    if (generation !== searchGeneration || $('searchInput')?.value.trim().toLocaleLowerCase('fr-FR') !== term) return;
    const users = snap.docs.map(item => item.data()).filter(item => item.uid !== user?.uid);
    renderResults(chats, users);
  } catch (error) {
    if (generation !== searchGeneration) return;
    console.warn('Recherche Vibe:', error);
    renderResults(chats);
    if (!chats.length) toast('Recherche indisponible pour les utilisateurs.');
  }
}

function scheduleSearch(value) { clearTimeout(searchTimer); searchTimer = setTimeout(() => void search(value), 180); }

async function openUserResult(targetUid) {
  if (!user || !targetUid || targetUid === user.uid) return;
  try {
    const snap = await getDocs(query(collection(db, 'conversations'), where('participantIds', 'array-contains', user.uid), limit(100)));
    let found = null;
    snap.forEach(item => {
      const data = item.data();
      if (!found && Array.isArray(data.participantIds) && data.participantIds.length === 2 && data.participantIds.includes(targetUid)) found = { id: item.id, ...data };
    });
    if (!found) {
      const peer = await getDocs(query(collection(db, 'userSearch'), where('uid', '==', targetUid), limit(1)));
      const profile = peer.docs[0]?.data();
      if (!profile) return toast('Utilisateur introuvable.');
      const chatId = `private_${[user.uid, targetUid].sort().join('_')}`;
      const ref = doc(db, 'conversations', chatId);
      const existing = await getDoc(ref);
      if (existing.exists()) found = { id: existing.id, ...existing.data() };
      else {
        const inviteToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
        const chatData = { name: `Discussion avec ${profile.displayName || 'Utilisateur'}`, ownerId: user.uid, participantIds: [user.uid, targetUid], inviteToken, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), type: 'private' };
        await setDoc(ref, chatData, { merge: true });
        await setDoc(doc(db, 'users', user.uid, 'conversations', chatId), { chatId, updatedAt: serverTimestamp() }, { merge: true });
        found = { id: chatId, ...chatData };
      }
    }
    window.VibeApp?.openChat(found.id, found);
    if ($('searchInput')) $('searchInput').value = '';
  } catch (error) {
    console.error('Ouverture résultat recherche:', error);
    toast(`Impossible d'ouvrir la discussion : ${error.message}`);
  }
}

async function enableNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { notificationReady = true; return; }
  if (Notification.permission === 'default') {
    try { notificationReady = (await Notification.requestPermission()) === 'granted'; } catch {}
  }
}

function watchNotifications() {
  stopNotifications?.();
  stopNotifications = null;
  if (!user) return;

  const stops = [];
  let lastSignature = '';
  stopNotifications = () => { stops.splice(0).forEach(stop => stop()); };

  const refresh = () => {
    const chats = window.VibeApp?.getChats?.() || [];
    const signature = chats.map(chat => chat.id).sort().join('|');
    if (signature === lastSignature) return;
    lastSignature = signature;
    stops.splice(0).forEach(stop => stop());
    chats.forEach(chat => {
      const mq = query(collection(db, 'conversations', chat.id, 'messages'), orderBy('createdAt', 'desc'), limit(1));
      stops.push(onSnapshot(mq, ms => {
        if (!notificationReady || document.visibilityState === 'visible') return;
        const item = ms.docs[0];
        const message = item?.data();
        if (!message || message.uid === user.uid) return;
        const key = `vibe-notified:${chat.id}:${item.id}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        new Notification(chat.name || 'Vibe', { body: String(message.text || 'Nouveau message').slice(0, 120) });
      }, error => console.warn('Notification messages:', error)));
    });
  };

  refresh();
  const timer = setInterval(refresh, 1500);
  const previousStop = stopNotifications;
  stopNotifications = () => {
    clearInterval(timer);
    previousStop();
  };
}

async function loadCallHistory() {
  if (!user) return;
  const list = $('conversationList');
  if (!list) return;
  try {
    const snap = await getDocs(query(collection(db, 'callHistory', user.uid, 'items'), limit(50)));
    const rows = snap.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    list.innerHTML = rows.map(call => `<div class="conversation-item"><div class="avatar">${call.kind === 'video' ? '▣' : '☎'}</div><div><strong>${esc(call.peerName || 'Appel')}</strong><span>${call.status === 'missed' ? 'Appel manqué' : call.status === 'rejected' ? 'Refusé' : 'Appel terminé'} · ${call.kind === 'video' ? 'Vidéo' : 'Audio'}</span></div></div>`).join('') || '<div class="conversation-item"><div><strong>Aucun appel</strong><span>Votre historique apparaîtra ici</span></div></div>';
  } catch (error) { console.warn('Historique appels:', error); toast(`Historique indisponible : ${error.message}`); }
}

function bind() {
  const input = $('searchInput');
  input?.addEventListener('input', event => scheduleSearch(event.target.value));
  input?.addEventListener('focus', () => void enableNotifications());
  $('conversationList')?.addEventListener('click', event => { const userRow = event.target.closest('[data-user-result]'); if (userRow) void openUserResult(userRow.dataset.userResult); });
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => { if (tab.dataset.view === 'calls') setTimeout(() => void loadCallHistory(), 0); }));
}

onAuthStateChanged(auth, next => {
  user = next;
  stopNotifications?.();
  stopNotifications = null;
  if (user) { void indexUser(user); watchNotifications(); }
});

bind();
window.VibeEnhancements = { search, loadCallHistory, enableNotifications };
