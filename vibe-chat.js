import {
  auth,
  db,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from './firebase-client.js';
import { enregistrerAppel } from './whatsapp-extra-features.js';

let activeChatId = null;
let stopMessages = null;
let stopChatMeta = null;
let typingTimeout = null;
let typingHeartbeat = null;
const localMessageCache = new Map();

const MAX_ATTACHMENT_BYTES = 450 * 1024;
const MAX_IMAGE_SIDE = 1280;
const MESSAGE_CACHE_PREFIX = 'vibe-messages:';
const MESSAGE_CACHE_LIMIT = 80;

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));

function formatTime(value) {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.value = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function sortMessages(snapshot) {
  return snapshot.docs.map(item => ({id:item.id, ...item.data()})).sort((a,b) => (a.timestamp?.toMillis?.() ?? 0) - (b.timestamp?.toMillis?.() ?? 0));
}

function cacheKey(chatId) {
  return `${MESSAGE_CACHE_PREFIX}${chatId}`;
}

function saveMessagesToCache(chatId, messages) {
  if (!chatId) return;
  const compact = messages.slice(-MESSAGE_CACHE_LIMIT).map(message => ({
    id: message.id,
    uid: message.uid || '',
    text: message.text || '',
    read: Boolean(message.read),
    reactions: message.reactions || {},
    attachment: message.attachment || null,
    timestamp: message.timestamp?.toDate?.()?.toISOString?.() || message.timestamp || null
  }));
  localMessageCache.set(chatId, compact);
  try { localStorage.setItem(cacheKey(chatId), JSON.stringify(compact)); } catch (error) { console.warn('[Vibe] Cache messages:', error); }
}

function loadMessagesFromCache(chatId) {
  if (!chatId) return [];
  if (localMessageCache.has(chatId)) return localMessageCache.get(chatId) || [];
  try {
    const parsed = JSON.parse(localStorage.getItem(cacheKey(chatId)) || '[]');
    const messages = Array.isArray(parsed) ? parsed : [];
    localMessageCache.set(chatId, messages);
    return messages;
  } catch { return []; }
}

function renderCachedMessages(container, messages) {
  if (!container || !messages.length) return;
  container.innerHTML = '';
  for (const data of messages) appendMessageBubble(container, data);
  container.scrollTop = container.scrollHeight;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function imageToCompressedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) { reject(new Error('Compression d’image indisponible.')); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > MAX_ATTACHMENT_BYTES * 1.33 && quality > 0.45) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image invalide.')); };
    image.src = objectUrl;
  });
}

async function prepareAttachment(file) {
  if (!file) return null;
  if (file.size > MAX_ATTACHMENT_BYTES && !file.type.startsWith('image/')) {
    showToast('Fichier trop volumineux. Limite : 450 Ko.');
    return null;
  }
  try {
    const dataUrl = file.type.startsWith('image/') ? await imageToCompressedDataUrl(file) : await fileToDataUrl(file);
    const payloadBytes = Math.ceil(dataUrl.length * 0.75);
    if (payloadBytes > MAX_ATTACHMENT_BYTES) { showToast('Pièce jointe trop volumineuse après compression.'); return null; }
    return {name:file.name.slice(0,180),type:file.type || 'application/octet-stream',size:payloadBytes,dataUrl};
  } catch (error) {
    console.error('[Vibe] Pièce jointe:', error);
    showToast('Impossible de préparer la pièce jointe.');
    return null;
  }
}

async function sendAttachment(file, recipientName) {
  const user = auth?.currentUser;
  if (!user || !db || !activeChatId || !file) return;
  const attachment = await prepareAttachment(file);
  if (!attachment) return;
  try {
    await addDoc(collection(db, 'chats', activeChatId, 'messages'), {uid:user.uid,text:'',attachment,read:false,timestamp:serverTimestamp()});
    await setDoc(doc(db, 'chats', activeChatId), {name:recipientName,lastMessage:`📎 ${attachment.name}`,lastUpdated:serverTimestamp()},{merge:true});
    showToast('Pièce jointe envoyée.');
  } catch (error) {
    console.error('[Vibe] Envoi pièce jointe:', error);
    showToast('Envoi impossible. Vérifiez les règles Firestore.');
  }
}

function renderAttachment(attachment) {
  if (!attachment?.dataUrl) return '';
  const name = escapeHtml(attachment.name || 'Pièce jointe');
  const type = String(attachment.type || '');
  if (type.startsWith('image/')) return `<div class="message-attachment"><img src="${escapeHtml(attachment.dataUrl)}" alt="${name}" loading="lazy"><a href="${escapeHtml(attachment.dataUrl)}" download="${name}">${name}</a></div>`;
  return `<div class="message-attachment"><a href="${escapeHtml(attachment.dataUrl)}" download="${name}">📎 ${name}</a></div>`;
}

function renderReactions(reactions = {}) {
  const entries = Object.entries(reactions).filter(([, emoji]) => emoji);
  if (!entries.length) return '';
  const counts = new Map();
  for (const [, emoji] of entries) counts.set(emoji, (counts.get(emoji) || 0) + 1);
  return `<div class="message-reactions">${[...counts.entries()].map(([emoji,count]) => `<span>${escapeHtml(emoji)}${count > 1 ? `<b>${count}</b>` : ''}</span>`).join('')}</div>`;
}

function appendMessageBubble(container, data) {
  const user = auth?.currentUser;
  const isMe = data.uid === user?.uid;
  const bubble = document.createElement('div');
  bubble.className = `message message-bubble${isMe ? ' mine' : ''}`;
  const attachmentHtml = renderAttachment(data.attachment);
  const textHtml = data.text ? `<span class="message-text">${escapeHtml(data.text)}</span>` : '';
  const statusIcon = isMe
    ? (data.read ? '<span class="message-status read" aria-label="Lu">✓✓</span>' : '<span class="message-status" aria-label="Envoyé">✓</span>')
    : '';
  bubble.innerHTML = `
    ${attachmentHtml}${textHtml}
    <time>${formatTime(data.timestamp)}${statusIcon}</time>
    <button class="reaction-trigger" type="button" title="Réagir" aria-label="Réagir">☺</button>
    <div class="reaction-picker" role="menu" aria-label="Réactions">
      ${['👍','❤️','😂','😮','😢','🙏'].map(emoji => `<button type="button" data-reaction="${emoji}" role="menuitem">${emoji}</button>`).join('')}
    </div>
    ${renderReactions(data.reactions)}
  `;
  const picker = bubble.querySelector('.reaction-picker');
  bubble.querySelector('.reaction-trigger')?.addEventListener('click', event => {
    event.stopPropagation();
    picker?.classList.toggle('show');
  });
  bubble.querySelectorAll('[data-reaction]').forEach(button => {
    button.addEventListener('click', async event => {
      event.stopPropagation();
      await reactToMessage(data.id, button.dataset.reaction || '👍');
      picker?.classList.remove('show');
    });
  });
  container.appendChild(bubble);
}

async function reactToMessage(messageId, emoji) {
  const user = auth?.currentUser;
  if (!user || !db || !activeChatId || !messageId) return;
  try {
    await updateDoc(doc(db, 'chats', activeChatId, 'messages', messageId), {
      [`reactions.${user.uid}`]: emoji
    });
  } catch (error) {
    console.error('[Vibe] Réaction:', error);
    showToast('Réaction impossible.');
  }
}

async function markMessagesAsRead(messages) {
  const user = auth?.currentUser;
  if (!user || !db || !activeChatId) return;
  const unread = messages.filter(message => message.uid && message.uid !== user.uid && !message.read).slice(0, 30);
  await Promise.all(unread.map(message => updateDoc(doc(db, 'chats', activeChatId, 'messages', message.id), {read:true}).catch(error => console.warn('[Vibe] Lecture:', error))));
}

async function setTypingState(isTyping) {
  const user = auth?.currentUser;
  if (!user || !db || !activeChatId) return;
  try {
    await updateDoc(doc(db, 'chats', activeChatId), {
      [`typing_${user.uid}`]: Boolean(isTyping)
    });
  } catch (error) {
    console.warn('[Vibe] Indicateur de frappe:', error);
  }
}

function startTyping(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    if (!activeChatId || !auth?.currentUser) return;
    setTypingState(true);
    clearTimeout(typingTimeout);
    clearInterval(typingHeartbeat);
    typingHeartbeat = setInterval(() => setTypingState(true), 1200);
    typingTimeout = setTimeout(() => {
      clearInterval(typingHeartbeat);
      typingHeartbeat = null;
      setTypingState(false);
    }, 2000);
  });
}

function stopTyping() {
  clearTimeout(typingTimeout);
  clearInterval(typingHeartbeat);
  typingTimeout = null;
  typingHeartbeat = null;
  if (auth?.currentUser && activeChatId) setTypingState(false);
}

function updateTypingIndicator(data) {
  const user = auth?.currentUser;
  const title = document.querySelector('.chat-title-wrap small');
  if (!title || !data || !user) return;
  const someoneTyping = Object.entries(data).some(([key,value]) => key.startsWith('typing_') && key !== `typing_${user.uid}` && value === true);
  title.textContent = someoneTyping ? 'est en train d’écrire…' : 'Discussion Vibe';
  title.classList.toggle('typing-indicator', someoneTyping);
}

export function ouvrirDiscussion(chatId, recipientName = 'Discussion Vibe', onClose = null) {
  if (!auth?.currentUser || !db) return;
  stopTyping();
  stopMessages?.();
  stopChatMeta?.();
  activeChatId = chatId;
  const panel = document.getElementById('main-chat-panel');
  if (!panel) return;

  panel.innerHTML = `<section class="chat-view">
    <header class="chat-header">
      <button class="chat-back" id="chat-back" type="button" title="Retour" aria-label="Retour">‹</button>
      <div class="chat-avatar">${escapeHtml(recipientName.slice(0,1).toUpperCase())}</div>
      <div class="chat-title-wrap"><strong>${escapeHtml(recipientName)}</strong><small>Discussion Vibe</small></div>
      <div class="chat-header-actions"><button class="chat-call-btn" id="chat-video-call" type="button" title="Appel vidéo" aria-label="Appel vidéo">▣</button><button class="chat-call-btn" id="chat-audio-call" type="button" title="Appel audio" aria-label="Appel audio">☎</button></div>
    </header>
    <div class="messages" id="chat-messages" aria-live="polite"></div>
    <form class="composer" id="chat-form">
      <button class="composer-tool" id="emoji-btn" type="button" title="Emoji" aria-label="Emoji">☺</button>
      <button class="composer-tool" id="attach-btn" type="button" title="Joindre" aria-label="Joindre">＋</button>
      <input id="chat-input" type="text" maxlength="2000" placeholder="Écrire un message" autocomplete="off">
      <button type="submit" title="Envoyer" aria-label="Envoyer">➤</button>
    </form>
  </section>`;

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const back = document.getElementById('chat-back');

  back?.addEventListener('click', () => { stopTyping(); fermerDiscussion(); onClose?.(); document.dispatchEvent(new CustomEvent('vibe:close-chat')); });
  document.getElementById('chat-video-call')?.addEventListener('click', () => enregistrerAppel('video', recipientName));
  document.getElementById('chat-audio-call')?.addEventListener('click', () => enregistrerAppel('audio', recipientName));
  document.getElementById('emoji-btn')?.addEventListener('click', () => { if (input) input.value += '🙂'; input?.focus(); });
  startTyping(input);

  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*,video/*,audio/*,.pdf,.txt,.doc,.docx'; fileInput.hidden = true;
  document.body.appendChild(fileInput);
  fileInput.addEventListener('change', async () => { const file = fileInput.files?.[0]; fileInput.value = ''; if (file) await sendAttachment(file, recipientName); });
  document.getElementById('attach-btn')?.addEventListener('click', () => fileInput.click());

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input?.value.trim();
    const user = auth?.currentUser;
    if (!text || !user || !activeChatId) return;
    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {uid:user.uid,text,timestamp:serverTimestamp(),read:false,reactions:{}});
      await setDoc(doc(db, 'chats', activeChatId), {name:recipientName,lastMessage:text,lastUpdated:serverTimestamp(),[`typing_${user.uid}`]:false},{merge:true});
      input.value = ''; input.removeAttribute('aria-invalid');
      clearTimeout(typingTimeout);
      clearInterval(typingHeartbeat);
      typingTimeout = null;
      typingHeartbeat = null;
    } catch (error) {
      console.error('[Vibe] Envoi:', error); input?.setAttribute('aria-invalid','true'); showToast('Envoi impossible.');
    }
  });

  const container = document.getElementById('chat-messages');
  renderCachedMessages(container, loadMessagesFromCache(chatId));

  stopChatMeta = onSnapshot(doc(db, 'chats', activeChatId), snapshot => {
    if (!snapshot.exists() || activeChatId !== chatId) return;
    updateTypingIndicator(snapshot.data());
  }, error => console.warn('[Vibe] Présence de frappe:', error));

  stopMessages = onSnapshot(collection(db, 'chats', activeChatId, 'messages'), snapshot => {
    const currentContainer = document.getElementById('chat-messages');
    if (!currentContainer || activeChatId !== chatId) return;
    const messages = sortMessages(snapshot);
    saveMessagesToCache(chatId, messages);
    if (!messages.length) {
      currentContainer.innerHTML = '<div class="empty-state">Aucun message. Écrivez le premier.</div>';
      return;
    }
    currentContainer.innerHTML = '';
    for (const data of messages) appendMessageBubble(currentContainer, data);
    currentContainer.scrollTop = currentContainer.scrollHeight;
    markMessagesAsRead(messages);
  }, error => {
    console.error('[Vibe] Messages:', error);
    const currentContainer = document.getElementById('chat-messages');
    if (currentContainer && !loadMessagesFromCache(chatId).length) currentContainer.innerHTML = '<div class="empty-state">Impossible de charger les messages.</div>';
  });

  input?.focus();
}

export function fermerDiscussion() {
  stopTyping();
  stopMessages?.();
  stopChatMeta?.();
  stopMessages = null;
  stopChatMeta = null;
  activeChatId = null;
}
