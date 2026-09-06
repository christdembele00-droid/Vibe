import { auth, db, collection, doc, addDoc, getDoc, onSnapshot, serverTimestamp, storage, ref, uploadBytes, getDownloadURL } from './firebase-client.js';

const $ = id => document.getElementById(id);
const uid = () => auth?.currentUser?.uid || null;
const toast = text => {
  const el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
};
const escapeHtml = value => String(value ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[c]));

function currentChatId() {
  return window.VibeApp?.currentChatId || document.querySelector('.conversation-item.active')?.dataset.chatId || null;
}

async function uploadMedia(file) {
  if (!uid()) throw new Error('Connexion requise');
  if (file.size > 25 * 1024 * 1024) throw new Error('Fichier limité à 25 Mo');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `messages/${uid()}/${Date.now()}-${safeName}`);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  return getDownloadURL(storageRef);
}

function mediaPicker() {
  const input = $('fileInput');
  if (!input) return;
  input.accept = 'image/*,video/*,.pdf,.doc,.docx,.txt';
  input.click();
}

async function handleMedia(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !uid()) return;
  const chatId = currentChatId();
  if (!chatId) return toast('Ouvrez une discussion.');
  try {
    const url = await uploadMedia(file);
    await addDoc(collection(db, 'conversations', chatId, 'messages'), {
      uid: uid(), text: file.name, type: 'media', dataUrl: url, mediaUrl: url,
      mimeType: file.type || 'application/octet-stream', fileName: file.name,
      fileSize: file.size, createdAt: serverTimestamp(), viewOnce: false
    });
    toast('Média envoyé.');
  } catch (error) {
    console.error('[Vibe] upload média:', error);
    toast(`Envoi impossible : ${error.message}`);
  }
}

function renderReactions(article, rows) {
  article.querySelector('.vibe-reactions')?.remove();
  if (!rows.length) return;
  const counts = new Map();
  rows.forEach(row => { if (row.emoji) counts.set(row.emoji, (counts.get(row.emoji) || 0) + 1); });
  const bar = document.createElement('div');
  bar.className = 'vibe-reactions';
  bar.innerHTML = [...counts.entries()].map(([emoji, count]) => `<span title="${count} réaction(s)">${escapeHtml(emoji)} <b>${count}</b></span>`).join('');
  article.appendChild(bar);
}

const reactionStops = new Map();
function enhanceMessage(article) {
  const messageId = article.dataset.message;
  const chatId = currentChatId();
  if (!messageId || !chatId || article.dataset.mediaEnhanced === '1') return;
  article.dataset.mediaEnhanced = '1';
  const key = `${chatId}:${messageId}`;
  const stop = onSnapshot(
    collection(db, 'conversations', chatId, 'messages', messageId, 'reactions'),
    snap => renderReactions(article, snap.docs.map(item => item.data())),
    () => {}
  );
  reactionStops.set(key, stop);
  getDoc(doc(db, 'conversations', chatId, 'messages', messageId)).then(snap => {
    if (!snap.exists() || !article.isConnected) return;
    const message = snap.data();
    const url = message.mediaUrl || message.dataUrl;
    const mime = String(message.mimeType || '');
    if (message.type !== 'media' || !url) return;
    const bubble = article.querySelector('.message-bubble');
    if (!bubble || bubble.querySelector('.message-media, .message-file, audio')) return;
    if (mime.startsWith('image/')) bubble.innerHTML = `<img class="message-media" src="${escapeHtml(url)}" alt="${escapeHtml(message.fileName || 'Image')}" loading="lazy">`;
    else if (mime.startsWith('video/')) bubble.innerHTML = `<video class="message-media" src="${escapeHtml(url)}" controls preload="metadata"></video>`;
    else bubble.innerHTML = `<a class="message-file" href="${escapeHtml(url)}" target="_blank" rel="noopener" download="${escapeHtml(message.fileName || 'fichier')}">📎 ${escapeHtml(message.fileName || 'Fichier')}</a>`;
  }).catch(() => {});
}

function cleanupDisconnectedReactions() {
  for (const [key, stop] of reactionStops) {
    const split = key.indexOf(':');
    const chatId = split >= 0 ? key.slice(0, split) : key;
    const messageId = split >= 0 ? key.slice(split + 1) : '';
    const article = [...document.querySelectorAll('.message')].find(el => el.dataset.message === messageId);
    if (!article || !article.isConnected || currentChatId() !== chatId) {
      try { stop(); } catch {}
      reactionStops.delete(key);
    }
  }
}

function observeMessages() {
  const box = $('messages');
  if (!box || box.dataset.mediaObserver === '1') return;
  box.dataset.mediaObserver = '1';
  const scan = () => { box.querySelectorAll('.message').forEach(enhanceMessage); cleanupDisconnectedReactions(); };
  scan();
  new MutationObserver(scan).observe(box, { childList: true, subtree: true });
}

function bind() {
  $('attachBtn')?.addEventListener('click', mediaPicker);
  $('fileInput')?.addEventListener('change', handleMedia);
  observeMessages();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
else bind();
window.VibeMedia = { media: mediaPicker };
