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

const MAX_ATTACHMENT_BYTES = 450 * 1024;
const MAX_IMAGE_SIDE = 1280;

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
      if (!context) {
        reject(new Error('Compression d’image indisponible.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > MAX_ATTACHMENT_BYTES * 1.33 && quality > 0.45) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image invalide.'));
    };
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
    const dataUrl = file.type.startsWith('image/')
      ? await imageToCompressedDataUrl(file)
      : await fileToDataUrl(file);
    const payloadBytes = Math.ceil(dataUrl.length * 0.75);
    if (payloadBytes > MAX_ATTACHMENT_BYTES) {
      showToast('Pièce jointe trop volumineuse après compression.');
      return null;
    }
    return {
      name: file.name.slice(0, 180),
      type: file.type || 'application/octet-stream',
      size: payloadBytes,
      dataUrl
    };
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
    await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
      uid: user.uid,
      text: '',
      attachment,
      timestamp: serverTimestamp()
    });
    await setDoc(doc(db, 'chats', activeChatId), {
      name: recipientName,
      lastMessage: `📎 ${attachment.name}`,
      lastUpdated: serverTimestamp()
    }, {merge:true});
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
  if (type.startsWith('image/')) {
    return `<div class="message-attachment"><img src="${escapeHtml(attachment.dataUrl)}" alt="${name}" loading="lazy"><a href="${escapeHtml(attachment.dataUrl)}" download="${name}">${name}</a></div>`;
  }
  return `<div class="message-attachment"><a href="${escapeHtml(attachment.dataUrl)}" download="${name}">📎 ${name}</a></div>`;
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
      <input id="chat-input" type="text" maxlength="2000" placeholder="Écrire un message" autocomplete="off">
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

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*,audio/*,.pdf,.txt,.doc,.docx';
  fileInput.hidden = true;
  document.body.appendChild(fileInput);
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) await sendAttachment(file, recipientName);
  });
  document.getElementById('attach-btn')?.addEventListener('click', () => fileInput.click());

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
      showToast('Envoi impossible.');
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
      const attachmentHtml = renderAttachment(data.attachment);
      const textHtml = data.text ? `<span>${escapeHtml(data.text)}</span>` : '';
      bubble.innerHTML = `${attachmentHtml}${textHtml}<time>${formatTime(data.timestamp)}</time>`;
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
