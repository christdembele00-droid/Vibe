import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  onAuthStateChanged,
  ensureAnonymousAuth,
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
const shell = document.getElementById('app-shell');
const toastElement = document.getElementById('toast');

let allChats = [...fallbackChats];
let currentUser = null;
let toastTimer = null;

function showToast(message) {
  if (!toastElement) return;
  toastElement.value = message;
  toastElement.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove('show'), 2400);
}

function chatTime(value) {
  return value?.toMillis?.() ?? 0;
}

function sortChats(items) {
  return [...items].sort((a, b) => chatTime(b.lastUpdated) - chatTime(a.lastUpdated));
}

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

    button.addEventListener('click', () => {
      document.querySelectorAll('.chat-item.active').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      shell?.classList.add('chat-open');
      ouvrirDiscussion(item.id, name, () => shell?.classList.remove('chat-open'));
    });

    list.appendChild(button);
  }
}

async function ensureGeneralChat() {
  if (!db || !currentUser) return;
  try {
    const reference = doc(db, 'chats', 'general');
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      await setDoc(reference, {
        name: 'Discussion générale',
        lastMessage: 'Bienvenue sur Vibe',
        lastUpdated: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('[Vibe] Initialisation conversation:', error);
  }
}

render();

if (!firebaseConfigured || !auth || !db) {
  if (status) status.textContent = 'Firebase non configuré';
} else {
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (status) status.textContent = user ? 'connecté' : 'connexion...';
    if (user) await ensureGeneralChat();
  });

  ensureAnonymousAuth().catch(error => {
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

document.getElementById('btn-status')?.addEventListener('click', () => showToast('Les statuts Vibe arrivent dans le module suivant.'));
document.getElementById('btn-calls')?.addEventListener('click', () => showToast('Les appels seront ajoutés après la messagerie.'));
document.getElementById('btn-settings')?.addEventListener('click', () => showToast('Paramètres Vibe : module en préparation.'));

document.addEventListener('vibe:close-chat', () => shell?.classList.remove('chat-open'));
