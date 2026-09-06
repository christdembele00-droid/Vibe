import { auth, db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from './firebase-client.js';

let activeChatId = null;
let stopMessages = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const timeOf = value => (value?.toDate?.() ?? new Date()).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});

export function ouvrirDiscussion(chatId, recipientName = 'Discussion Vibe') {
  activeChatId = chatId;
  const panel = document.getElementById('main-chat-panel');
  if (!panel) return;

  panel.innerHTML = `
    <section class="chat-view">
      <header class="chat-header">
        <div class="chat-avatar">${escapeHtml(recipientName.slice(0,1).toUpperCase())}</div>
        <div class="chat-title-wrap"><strong>${escapeHtml(recipientName)}</strong><small>Discussion Vibe</small></div>
      </header>
      <div class="messages" id="chat-messages" aria-live="polite"></div>
      <form class="composer" id="chat-form">
        <input id="chat-input" type="text" maxlength="2000" placeholder="Écrire un message" autocomplete="off">
        <button type="submit" title="Envoyer">➤</button>
      </form>
    </section>`;

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input?.value.trim();
    if (!text || !auth?.currentUser || !db) return;
    await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
      uid: auth.currentUser.uid,
      text,
      timestamp: serverTimestamp()
    });
    input.value = '';
  });

  stopMessages?.();
  if (!db) return;
  const messagesQuery = query(collection(db, 'chats', activeChatId, 'messages'), orderBy('timestamp', 'asc'));
  stopMessages = onSnapshot(messagesQuery, snapshot => {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = snapshot.empty ? '<div class="empty-state">Aucun message. Écrivez le premier.</div>' : '';
    snapshot.forEach(messageDoc => {
      const data = messageDoc.data();
      const bubble = document.createElement('div');
      bubble.className = `message ${data.uid === auth?.currentUser?.uid ? 'mine' : ''}`;
      bubble.innerHTML = `<span>${escapeHtml(data.text || '')}</span><time>${timeOf(data.timestamp)}</time>`;
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  }, error => console.error('[Vibe] messages:', error));

  input?.focus();
}

export function fermerDiscussion() {
  stopMessages?.();
  stopMessages = null;
  activeChatId = null;
}
