import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApps()[0] : null;
if (!app) throw new Error('[VIBE] Firebase app not initialized');

const auth = getAuth(app);
const db = getFirestore(app);
const fallback = 'https://i.pravatar.cc/150?img=12';
let stopUsers = null;
let stopPresence = null;
let me = null;
let users = new Map();
let presence = new Map();

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;'
}[c]));

function isOnline(data) {
  if (!data || data.online !== true) return false;
  const lastSeenMs = Number(data.lastSeenMs || 0);
  if (lastSeenMs) return Date.now() - lastSeenMs <= 90000;
  const ts = data.lastSeen?.toMillis?.();
  return !!ts && Date.now() - ts <= 90000;
}

function userIsOnline(uid) {
  return isOnline(presence.get(uid)) || isOnline(users.get(uid));
}

function updateCurrentUser(user) {
  if (!user) return;
  const data = users.get(user.uid) || {};
  const name = data.name || user.displayName || user.email?.split('@')[0] || 'Utilisateur';
  const avatar = data.avatar || user.photoURL || fallback;
  if ($('meName')) $('meName').textContent = name;
  if ($('meAvatar')) $('meAvatar').src = avatar;
  if ($('railAvatar')) $('railAvatar').src = avatar;
  if ($('meStatus')) $('meStatus').textContent = userIsOnline(user.uid) ? '● En ligne' : '○ Hors ligne';
}

function updateExistingContact(uid, data) {
  const item = document.querySelector(`.contact[data-id="${CSS.escape(uid)}"]`);
  if (!item || item.dataset.vibeUserSync !== '1') return false;
  const avatar = item.querySelector('img');
  const name = item.querySelector('b');
  const status = item.querySelector('small');
  if (avatar) avatar.src = data.avatar || fallback;
  if (name) name.textContent = data.name || data.email || 'Utilisateur';
  if (status) status.textContent = userIsOnline(uid) ? '🟢 En ligne' : '⚪ Hors ligne';
  return true;
}

function createContact(uid, data) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'contact';
  button.dataset.id = uid;
  button.dataset.vibeUserSync = '1';
  button.innerHTML = `<img src="${esc(data.avatar || fallback)}" alt=""><span><b>${esc(data.name || data.email || 'Utilisateur')}</b><small>${userIsOnline(uid) ? '🟢 En ligne' : '⚪ Hors ligne'}</small></span>`;
  return button;
}

function syncContacts() {
  const box = $('contacts');
  if (!box || !me) return;

  for (const [uid, data] of users) {
    if (!uid || uid === me.uid) continue;
    if (!updateExistingContact(uid, data)) {
      box.appendChild(createContact(uid, data));
    }
  }

  document.querySelectorAll('.contact[data-vibe-user-sync="1"]').forEach(item => {
    const uid = item.dataset.id;
    if (!users.has(uid) || uid === me.uid) item.remove();
  });

  if (box.children.length === 0 && users.size > (me ? 1 : 0)) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = '<b>Aucun résultat</b><small>Aucun autre utilisateur disponible.</small>';
    box.appendChild(empty);
  }
}

function startUsersListener() {
  stopUsers?.();
  stopPresence?.();

  stopUsers = onSnapshot(collection(db, 'users'), snapshot => {
    users = new Map();
    snapshot.forEach(item => {
      const data = item.data() || {};
      const uid = data.uid || item.id;
      if (uid) users.set(uid, { ...data, uid });
    });
    updateCurrentUser(me);
    syncContacts();
    console.info(`[VIBE] Utilisateurs Firestore synchronisés: ${users.size}`);
  }, error => {
    console.error('[VIBE] Erreur de lecture users:', error);
  });

  stopPresence = onSnapshot(collection(db, 'presence'), snapshot => {
    presence = new Map();
    snapshot.forEach(item => presence.set(item.id, item.data() || {}));
    updateCurrentUser(me);
    syncContacts();
  }, error => {
    console.error('[VIBE] Erreur de lecture presence:', error);
  });
}

onAuthStateChanged(auth, user => {
  me = user || null;
  if (!user) {
    stopUsers?.();
    stopPresence?.();
    stopUsers = null;
    stopPresence = null;
    users.clear();
    presence.clear();
    document.querySelectorAll('.contact[data-vibe-user-sync="1"]').forEach(item => item.remove());
    return;
  }
  startUsersListener();
  updateCurrentUser(user);
});

console.info('[VIBE] Synchronisation temps réel des utilisateurs activée.');
