import {
  auth,
  db,
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  onAuthStateChanged,
  signInAnonymously,
  firebaseConfigured
} from './firebase-client.js';
import { ouvrirDiscussion } from './vibe-chat.js';

const fallbackChats = [
  { id: 'general', name: 'Discussion générale', lastMessage: 'Bienvenue sur Vibe' }
];

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const list = document.getElementById('chats-list-container');
const search = document.getElementById('search-chat');
const status = document.getElementById('connection-status');

let allChats = [...fallbackChats];
let currentUser = null;

function render(items = allChats) {
  if (!list) return;
  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = '<div class="empty-state">Aucune conversation.</div>';
    return;
  }

  for (const item of items) {
    const name = item.name || 'Discussion Vibe';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-item';
    button.dataset.chatId = item.id;
    button.innerHTML = `
      <div class="chat-avatar">${escapeHtml(name.slice(0, 1).toUpperCase())}</div>
      <div class="chat-meta">
        <strong>${escapeHtml(name)}</strong>
        <p>${escapeHtml(item.lastMessage || 'Appuyez pour commencer...')}</p>
      </div>`;
    button.addEventListener('click', () => ouvrirDiscussion(item.id, name));
    list.appendChild(button);
  }
}

function sortChats(items) {
  return [...items].sort((a, b) => {
    const ta = a.lastUpdated?.toMillis?.() ?? 0;
    const tb = b.lastUpdated?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

async function ensureGeneralChat() {
  if (!db || !currentUser) return;
  try {
    await setDoc(doc(db, 'chats', 'general'), {
      name: 'Discussion générale',
      lastMessage: 'Bienvenue sur Vibe',
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('[Vibe] Initialisation conversation:', error);
  }
}

render();

if (!firebaseConfigured || !auth || !db) {
  status && (status.textContent = 'Firebase non configuré');
} else {
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (status) status.textContent = user ? 'connecté' : 'connexion...';
    if (user) await ensureGeneralChat();
  });

  signInAnonymously(auth).catch(error => {
    console.error('[Vibe] Authentification:', error);
    if (status) status.textContent = 'Erreur de connexion';
  });

  onSnapshot(collection(db, 'chats'), snapshot => {
    const remoteChats = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    allChats = remoteChats.length ? sortChats(remoteChats) : [...fallbackChats];
    render(allChats);
  }, error => {
    console.error('[Vibe] Conversations:', error);
    allChats = [...fallbackChats];
    render(allChats);
  });
}

search?.addEventListener('input', event => {
  const term = event.target.value.toLowerCase().trim();
  document.querySelectorAll('.chat-item').forEach(item => {
    item.hidden = !item.textContent.toLowerCase().includes(term);
  });
});
