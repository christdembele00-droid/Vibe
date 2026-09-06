import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getDatabase, ref, onValue, remove, get } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant vibe-media.js');
const auth = getAuth(app);
const db = getDatabase(app, 'https://vibe-749e5-default-rtdb.firebaseio.com');

let stopMessages = null;
let stopStories = null;
let observedChatId = null;
let cleanupTimer = null;
let conversationObserver = null;
let cleanupRunning = false;

const activeChatId = () => document.querySelector('.conversation-item.active')?.dataset.chatId || null;
const messagesEl = () => document.querySelector('#messages');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;' }[c]));
}

function mediaHtml(m) {
  const url = typeof m.dataUrl === 'string' ? m.dataUrl : '';
  if (!url || !url.startsWith('data:')) return '';
  const type = m.mimeType || '';
  const name = escapeHtml(m.fileName || 'Fichier');
  if (type.startsWith('image/')) return `<img src="${url}" alt="${name}" loading="lazy" style="max-width:280px;border-radius:12px">`;
  if (type.startsWith('video/')) return `<video src="${url}" controls playsinline preload="metadata" style="max-width:300px;border-radius:12px"></video>`;
  if (type.startsWith('audio/')) return `<audio src="${url}" controls preload="metadata"></audio>`;
  return `<a href="${url}" download="${name}">${name}</a>`;
}

function renderMediaMessage(key, m) {
  const root = messagesEl();
  if (!root || !m || !m.dataUrl) return;
  const existing = root.querySelector(`[data-media-key="${CSS.escape(key)}"]`);
  if (existing) return;
  const wrap = document.createElement('div');
  wrap.className = `message-row ${m.uid === auth.currentUser?.uid ? 'mine' : ''}`;
  wrap.dataset.mediaKey = key;
  wrap.innerHTML = `<div class="message-bubble">${mediaHtml(m)}</div>`;
  root.appendChild(wrap);
}

function watchChat(chatId) {
  if (chatId === observedChatId && stopMessages) return;
  stopMessages?.();
  stopMessages = null;
  observedChatId = chatId;
  if (!chatId || chatId.startsWith('demo-')) return;
  stopMessages = onValue(ref(db, `messages/${chatId}`), snap => {
    const data = snap.val() || {};
    for (const [key, m] of Object.entries(data)) renderMediaMessage(key, m);
  });
}

async function cleanupExpiredStories() {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || cleanupRunning) return;
  cleanupRunning = true;
  try {
    const snap = await get(ref(db, `stories/${currentUid}`));
    const stories = snap.val() || {};
    const now = Date.now();
    const expired = Object.entries(stories)
      .filter(([, story]) => Number(story?.expiresAt) > 0 && Number(story.expiresAt) <= now)
      .map(([storyId]) => remove(ref(db, `stories/${currentUid}/${storyId}`)).catch(() => {}));
    await Promise.all(expired);
  } finally {
    cleanupRunning = false;
  }
}

function watchStories() {
  stopStories?.();
  stopStories = null;
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return;

  stopStories = onValue(ref(db, `stories/${currentUid}`), snap => {
    const stories = snap.val() || {};
    const now = Date.now();
    for (const [storyId, story] of Object.entries(stories)) {
      if (Number(story?.expiresAt) > 0 && Number(story.expiresAt) <= now) {
        remove(ref(db, `stories/${currentUid}/${storyId}`)).catch(() => {});
      }
    }
  });
}

function observe() {
  const list = document.querySelector('#conversationList');
  if (!list) return;
  conversationObserver?.disconnect();
  const refresh = () => requestAnimationFrame(() => watchChat(activeChatId()));
  refresh();
  conversationObserver = new MutationObserver(refresh);
  conversationObserver.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-chat-id'] });
}

onAuthStateChanged(auth, user => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  stopMessages?.();
  stopStories?.();
  conversationObserver?.disconnect();
  stopMessages = stopStories = null;
  conversationObserver = null;
  observedChatId = null;

  if (!user) return;

  observe();
  watchStories();
  cleanupExpiredStories().catch(() => {});
  cleanupTimer = setInterval(() => cleanupExpiredStories().catch(() => {}), 60000);
});
