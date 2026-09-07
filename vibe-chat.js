import {
  auth,
  db,
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp
} from './firebase-client.js';
import { enregistrerAppel } from './whatsapp-extra-features.js';

let activeChatId = null;
let stopMessages = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));

function formatTime(value) {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
}

function sortMessages(snapshot) {
  return snapshot.docs.map(item => ({id:item.id, ...item.data()})).sort((a,b) => (a.timestamp?.toMillis?.() ?? 0) - (b.timestamp?.toMillis?.() ?? 0));
}

export function ouvrirDiscussion(chatId, recipientName = 'Discussion Vibe', onClose = null) {
  if (!auth?.currentUser || !db) return;
  activeChatId = chatId;
  const panel = document.getElementById('main-chat-panel');
  if (!panel) return;

  panel.innerHTML = `<section class="chat-view">
    <header class="chat-header">
      <button class="chat-back" id="chat-back" type="button" title="Retour" aria-label="Retour">‹</button>
      <div class="chat-avatar">${escapeHtml(recipientName.slice(0,1).toUpperCase())}</div>
      <div class="chat-title-wrap"><strong>${escapeHtml(recipientName)}</strong><small>Discussion Vibe</small></div>
      <div class="chat-header-actions">
        <button class="chat-call-btn" id="chat-video-call" type="button" title="Appel vidéo" aria-label="Appel vidéo">▣</button>
        <button class="chat-call-btn" id="chat-audio-call" type="button" title="Appel audio" aria-label="Appel audio">☎</button>
      </div>
    </header>
    <div class="messages" id="chat-messages" aria-live="polite"></div>
    <form class="composer" id="chat-form">
      <button class="composer-tool" id="emoji-btn" type="button" title="Emoji" aria-label="Emoji">☺</button>
      <button class="composer-tool" id="attach-btn" type="button" title="Joindre" aria-label="Joindre">＋</button>
      <input id="chat-input" type="text" maxlength="2000" placeholder="Écrire un message" autocomplete="off" required>
      <button type="submit" title="Envoyer" aria-label="Envoyer">➤</button>
    </form>
  </section>`;

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const back = document.getElementById('chat-back');

  back?.addEventListener('click', () => {
    fermerDiscussion();
    onClose?.();
    document.dispatchEvent(new CustomEvent('vibe:close-chat'));
  });

  document.getElementById('chat-video-call')?.addEventListener('click', () => enregistrerAppel('video', recipientName));
  document.getElementById('chat-audio-call')?.addEventListener('click', () => enregistrerAppel('audio', recipientName));
  document.getElementById('emoji-btn')?.addEventListener('click', () => {
    if (input) input.value += '🙂';
    input?.focus();
  });
  document.getElementById('attach-btn')?.addEventListener('click', () => {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.value = 'Les pièces jointes seront ajoutées dans le prochain module.';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2400);
    }
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input?.value.trim();
    const user = auth?.currentUser;
    if (!text || !user || !activeChatId) return;
    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {uid:user.uid, text, timestamp:serverTimestamp()});
      await setDoc(doc(db, 'chats', activeChatId), {name:recipientName, lastMessage:text, lastUpdated:serverTimestamp()}, {merge:true});
      input.value = '';
      input.removeAttribute('aria-invalid');
    } catch (error) {
      console.error('[Vibe] Envoi:', error);
      input?.setAttribute('aria-invalid', 'true');
    }
  });

  stopMessages?.();
  stopMessages = onSnapshot(collection(db, 'chats', activeChatId, 'messages'), snapshot => {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const messages = sortMessages(snapshot);
    if (!messages.length) {
      container.innerHTML = '<div class="empty-state">Aucun message. Écrivez le premier.</div>';
      return;
    }
    container.innerHTML = '';
    for (const data of messages) {
      const bubble = document.createElement('div');
      bubble.className = `message${data.uid === auth?.currentUser?.uid ? ' mine' : ''}`;
      bubble.innerHTML = `<span>${escapeHtml(data.text || '')}</span><time>${formatTime(data.timestamp)}</time>`;
      container.appendChild(bubble);
    }
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
