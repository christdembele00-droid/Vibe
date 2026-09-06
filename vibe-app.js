import { db, collection, query, orderBy, onSnapshot } from './firebase-client.js';
import { ouvrirDiscussion } from './vibe-chat.js';

const fallbackChats = [{ id: 'general', name: 'Discussion générale', lastMessage: 'Bienvenue sur Vibe' }];
const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

function render(items) {
  const container = document.getElementById('chats-list-container');
  if (!container) return;
  container.innerHTML = '';
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-item';
    button.innerHTML = `<div class="chat-avatar">${escapeHtml((item.name || 'V').slice(0,1).toUpperCase())}</div><div class="chat-meta"><strong>${escapeHtml(item.name || 'Discussion Vibe')}</strong><p>${escapeHtml(item.lastMessage || 'Appuyez pour commencer...')}</p></div>`;
    button.addEventListener('click', () => ouvrirDiscussion(item.id, item.name || 'Discussion Vibe'));
    container.appendChild(button);
  }
}

render(fallbackChats);

if (db) {
  const chatsQuery = query(collection(db, 'chats'), orderBy('lastUpdated', 'desc'));
  onSnapshot(chatsQuery, snapshot => {
    if (snapshot.empty) return;
    render(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, error => {
    console.error('[Vibe] conversations:', error);
  });
}

const search = document.getElementById('search-chat');
search?.addEventListener('input', event => {
  const term = event.target.value.toLowerCase().trim();
  document.querySelectorAll('.chat-item').forEach(item => {
    item.hidden = !item.textContent.toLowerCase().includes(term);
  });
});
