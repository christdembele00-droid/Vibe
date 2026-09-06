import { firebaseConfig, FIREBASE_ENABLED } from './firebase-config.js';

const demoChats = [
  { id: 'amina', name: 'Amina', initials: 'A', presence: 'en ligne', time: '21:42', unread: 2, messages: [
    { text: 'Salut 👋 Bienvenue sur Vibe !', direction: 'in', time: '21:39' },
    { text: 'Merci ! On construit une vraie messagerie ici.', direction: 'out', time: '21:40' },
    { text: 'Exactement 😄', direction: 'in', time: '21:42' }
  ]},
  { id: 'groupe', name: 'Groupe Vibe', initials: 'V', presence: '5 participants', time: '20:18', unread: 1, messages: [
    { text: 'Le nouveau design est prêt.', direction: 'in', time: '20:16' },
    { text: 'Parfait, on continue !', direction: 'out', time: '20:18' }
  ]},
  { id: 'moussa', name: 'Moussa', initials: 'M', presence: 'vu récemment', time: '18:03', unread: 0, messages: [
    { text: 'À demain 👍', direction: 'in', time: '18:03' }
  ]}
];

let chats = structuredClone(demoChats);
let selectedId = null;

const $ = (selector) => document.querySelector(selector);
const list = $('#conversationList');
const messages = $('#messages');
const chatPanel = $('#chatPanel');
const emptyState = $('#emptyState');
const chatView = $('#chatView');
const messageInput = $('#messageInput');
const toast = $('#toast');

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function renderChats(filter = '') {
  const query = filter.trim().toLowerCase();
  const visible = chats.filter(chat => chat.name.toLowerCase().includes(query));
  list.innerHTML = visible.length ? visible.map(chat => {
    const last = chat.messages.at(-1);
    return `<article class="conversation ${selectedId === chat.id ? 'active' : ''}" data-chat="${chat.id}">
      <div class="avatar">${escapeHtml(chat.initials)}</div>
      <div class="conv-body">
        <div class="conv-row"><strong>${escapeHtml(chat.name)}</strong><span class="conv-time">${escapeHtml(chat.time)}</span></div>
        <div class="conv-row"><div class="conv-preview">${escapeHtml(last?.text ?? '')}</div>${chat.unread ? `<span class="unread">${chat.unread}</span>` : ''}</div>
      </div>
    </article>`;
  }).join('') : '<div class="status-card"><p>Aucune discussion trouvée.</p></div>';
}

function openChat(id) {
  const chat = chats.find(item => item.id === id);
  if (!chat) return;
  selectedId = id;
  chat.unread = 0;
  $('#chatName').textContent = chat.name;
  $('#chatPresence').textContent = chat.presence;
  $('#chatAvatar').textContent = chat.initials;
  messages.innerHTML = chat.messages.map(message => `<div class="message ${message.direction}">${escapeHtml(message.text)}<span class="message-time">${escapeHtml(message.time)} ${message.direction === 'out' ? '✓✓' : ''}</span></div>`).join('');
  emptyState.classList.add('hidden');
  chatView.classList.remove('hidden');
  chatPanel.classList.add('open');
  renderChats($('#searchInput').value);
  messages.scrollTop = messages.scrollHeight;
  messageInput.focus();
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

$('#messageForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !selectedId) return;
  const chat = chats.find(item => item.id === selectedId);
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  chat.messages.push({ text, direction: 'out', time: now });
  chat.time = now;
  messageInput.value = '';
  openChat(selectedId);
});

list.addEventListener('click', (event) => {
  const item = event.target.closest('[data-chat]');
  if (item) openChat(item.dataset.chat);
});

$('#searchInput').addEventListener('input', (event) => renderChats(event.target.value));
$('#backBtn').addEventListener('click', () => chatPanel.classList.remove('open'));
$('#emojiBtn').addEventListener('click', () => { messageInput.value += ' 😊'; messageInput.focus(); });
$('#attachBtn').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) showToast(`Fichier sélectionné : ${file.name}`);
  event.target.value = '';
});
$('#newChatBtn').addEventListener('click', () => showToast('Ajout de contacts : branchez Firebase Auth/Firestore pour les contacts réels.'));
$('#menuBtn').addEventListener('click', () => showToast('Menu Vibe'));
$('#chatMenuBtn').addEventListener('click', () => showToast('Options de discussion'));

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
  tab.classList.add('active');
  const view = tab.dataset.view;
  if (view === 'chats') { renderChats(); return; }
  list.innerHTML = view === 'status'
    ? '<div class="status-card"><h2>Actus</h2><div class="status-item"><strong>Votre actu</strong><span>Publiez une photo, une vidéo ou un texte.</span></div><div class="status-item"><strong>Amina</strong><span>Nouvelle actu il y a 12 min.</span></div></div>'
    : '<div class="calls-card"><h2>Appels</h2><p>Vos appels récents apparaîtront ici.</p></div>';
}));

renderChats();
if (FIREBASE_ENABLED) {
  // Firebase can be enabled without changing the UI: import the modular SDK here
  // and connect Auth, Firestore, Storage and FCM in the production phase.
  console.info('Vibe: Firebase configuration detected.', firebaseConfig.projectId);
} else {
  console.info('Vibe: running in local demo mode. Add Firebase config to enable cloud data.');
}
