import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const configured = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId && firebaseConfig?.appId);
const app = getApps()[0] ?? (configured ? initializeApp(firebaseConfig) : null);
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const status = document.getElementById('connection-status');
const chats = document.getElementById('chats-list-container');
const search = document.getElementById('search-chat');
const shell = document.getElementById('app-shell');
const welcome = document.getElementById('welcome-screen');
const chatView = document.getElementById('chat-view');
const messages = document.getElementById('messages');
const title = document.getElementById('chat-title');
const presence = document.getElementById('chat-presence');
const avatar = document.getElementById('chat-avatar');
const form = document.getElementById('message-form');
const input = document.getElementById('message-input');
const toast = document.getElementById('toast');

let currentUser = null;
let unsubscribeMessages = null;
let selectedChat = null;
let allMessages = [];

const defaultChats = [{
  id: 'general',
  name: 'Discussion générale',
  lastMessage: 'Bienvenue sur Vibe'
}];

function notify(text) {
  if (!toast) return;
  toast.value = text;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
}

function formatTime(timestamp) {
  const date = timestamp?.toDate?.() ?? (timestamp ? new Date(timestamp) : new Date());
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function renderMessages() {
  if (!messages) return;
  messages.innerHTML = '';
  if (!allMessages.length) {
    messages.innerHTML = '<div class="empty-state">Aucun message. Écrivez le premier.</div>';
    return;
  }
  for (const message of allMessages) {
    const node = document.createElement('div');
    node.className = `message${message.uid === currentUser?.uid ? ' mine' : ''}`;
    node.innerHTML = `<span>${escapeHtml(message.text)}</span><time>${formatTime(message.timestamp)}</time>`;
    messages.appendChild(node);
  }
  messages.scrollTop = messages.scrollHeight;
}

function renderChats(items = defaultChats) {
  if (!chats) return;
  chats.innerHTML = '';
  for (const item of items) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `chat-item${selectedChat === item.id ? ' active' : ''}`;
    node.dataset.chatId = item.id;
    node.innerHTML = `<div class="chat-avatar">${escapeHtml((item.name || 'V').slice(0,1).toUpperCase())}</div><div class="chat-meta"><strong>${escapeHtml(item.name || 'Discussion')}</strong><p>${escapeHtml(item.lastMessage || 'Aucun message')}</p></div>`;
    node.addEventListener('click', () => openChat(item.id, item.name || 'Discussion'));
    chats.appendChild(node);
  }
}

async function ensureAuth() {
  if (!configured || !auth) {
    status.textContent = 'Firebase non configuré';
    notify('Vibe attend firebase-config.js.');
    return;
  }
  try {
    if (!auth.currentUser) await signInAnonymously(auth);
  } catch (error) {
    console.error('[Vibe] Authentification:', error);
    status.textContent = 'Erreur de connexion';
    notify('Active l’authentification anonyme dans Firebase.');
  }
}

function listenToChat(chatId) {
  unsubscribeMessages?.();
  if (!db) return;
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
  unsubscribeMessages = onSnapshot(q, snapshot => {
    allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMessages();
  }, error => {
    console.error('[Vibe] Messages:', error);
    notify('Impossible de charger les messages.');
  });
}

function openChat(chatId, chatName) {
  selectedChat = chatId;
  title.textContent = chatName;
  presence.textContent = currentUser ? 'connecté à Vibe' : 'Firebase requis';
  avatar.textContent = chatName.slice(0, 1).toUpperCase();
  welcome?.classList.add('hidden');
  chatView?.classList.remove('hidden');
  shell?.classList.add('chat-open');
  listenToChat(chatId);
  input?.focus();
  renderChats(defaultChats);
}

async function sendMessage(event) {
  event.preventDefault();
  const text = input?.value.trim();
  if (!text || !selectedChat || !currentUser || !db) {
    if (!currentUser) notify('Connecte Firebase pour envoyer un message.');
    return;
  }
  try {
    await addDoc(collection(db, 'chats', selectedChat, 'messages'), {
      uid: currentUser.uid,
      text,
      timestamp: serverTimestamp()
    });
    input.value = '';
  } catch (error) {
    console.error('[Vibe] Envoi:', error);
    notify('Message non envoyé.');
  }
}

search?.addEventListener('input', event => {
  const term = event.target.value.toLowerCase().trim();
  chats?.querySelectorAll('.chat-item').forEach(button => {
    button.hidden = !button.textContent.toLowerCase().includes(term);
  });
});

renderChats(defaultChats);

if (configured && auth) {
  onAuthStateChanged(auth, user => {
    currentUser = user;
    status.textContent = user ? 'connecté' : 'déconnecté';
    if (selectedChat) presence.textContent = user ? 'connecté à Vibe' : 'Firebase requis';
  });
  ensureAuth();
} else {
  status.textContent = 'Firebase non configuré';
}

form?.addEventListener('submit', sendMessage);
window.VibeFirebase = { auth, db, openChat, sendMessage };
