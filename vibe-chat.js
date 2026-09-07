import {
  auth,
  db,
  collection,
  doc,
  setDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from './firebase-client.js';

let activeChatId = null;
let stopMessages = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function formatTime(value) {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
}

export function ouvrirDiscussion(chatId, recipientName = 'Discussion Vibe') {
  activeChatId = chatId;
  const panel = document.getElementById('main-chat-panel');
  if (!panel) return;

  panel.innerHTML = `
    <section class="chat-view">
      <header class="chat-header">
        <div class="chat-avatar">${escapeHtml(recipientName.slice(0, 1).toUpperCase())}</div>
        <div class="chat-title-wrap">
          <strong>${escapeHtml(recipientName)}</strong>
          <small>Discussion Vibe</small>
        </div>
      </header>
      <div class="messages" id="chat-messages" aria-live="polite"></div>
      <form class="composer" id="chat-form">
        <input id="chat-input" type="text" maxlength="2000" placeholder="Écrire un message" autocomplete="off" required>
        <button type="submit" title="Envoyer" aria-label="Envoyer">➤</button>
      </form>
    </section>`;

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input?.value.trim();
    const user = auth?.currentUser;
    if (!text || !user || !db || !activeChatId) return;

    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        uid: user.uid,
        text,
        timestamp: serverTimestamp()
      });

      await setDoc(doc(db, 'chats', activeChatId), {
        name: recipientName,
        lastMessage: text,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      input.value = '';
    } catch (error) {
      console.error('[Vibe] Envoi:', error);
      input?.setAttribute('aria-invalid', 'true');
    }
  });

  stopMessages?.();
  stopMessages = null;

  if (!db) return;

  const messagesQuery = query(
    collection(db, 'chats', activeChatId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  stopMessages = onSnapshot(messagesQuery, snapshot => {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">Aucun message. Écrivez le premier.</div>';
      return;
    }

    container.innerHTML = '';
    snapshot.forEach(messageDoc => {
      const data = messageDoc.data();
      const bubble = document.createElement('div');
      bubble.className = `message${data.uid === auth?.currentUser?.uid ? ' mine' : ''}`;
      bubble.innerHTML = `<span>${escapeHtml(data.text || '')}</span><time>${formatTime(data.timestamp)}</time>`;
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  }, error => {
    console.error('[Vibe] Messages:', error);
    const container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '<div class="empty-state">Impossible de charger les messages.</div>';
  });

  input?.focus();
}

export function fermerDiscussion() {
  stopMessages?.();
  stopMessages = null;
  activeChatId = null;
}
