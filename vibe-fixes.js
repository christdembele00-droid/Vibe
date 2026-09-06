import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getDatabase, ref, push, set, update, remove, get, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant vibe-fixes.js');

const auth = getAuth(app);
const db = getDatabase(app, 'https://vibe-749e5-default-rtdb.firebaseio.com');
const $ = (selector) => document.querySelector(selector);

let user = null;
let selected = null;
let stopReactions = null;
let stopPeerPresence = null;
const consumed = new Set();

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2800);
}

function currentChatId() {
  return window.VibeApp?.currentChatId
    || document.activeElement?.dataset?.chatId
    || document.querySelector('.conversation-item.active')?.dataset?.chatId
    || selected;
}

function cleanup() {
  if (stopReactions) stopReactions();
  if (stopPeerPresence) stopPeerPresence();
  stopReactions = null;
  stopPeerPresence = null;
}

function makeId() {
  return `chat-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function makeInviteToken() {
  return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
}

function clean(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

async function createPrivateChat() {
  if (!user) {
    toast('Connexion Firebase requise.');
    return;
  }

  const name = clean(prompt('Nom de la discussion :'), 120);
  if (!name) return;

  const id = makeId();
  const token = makeInviteToken();

  try {
    await update(ref(db), {
      [`chats/${id}`]: {
        name,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        inviteToken: token
      },
      [`chatMembers/${id}/${user.uid}`]: true,
      [`userChats/${user.uid}/${id}`]: true
    });

    toast(`Discussion créée. Code d'invitation : ${token}`);
    window.VibeApp?.openChat(id, { name, ownerUid: user.uid, inviteToken: token });
  } catch (error) {
    toast(`Création impossible : ${error.message}`);
  }
}

async function joinPrivateChat() {
  if (!user) {
    toast('Connexion Firebase requise.');
    return;
  }

  const id = clean(prompt('Identifiant de la discussion :'), 120);
  if (!id) return;

  const token = clean(prompt('Code d’invitation privé :'), 128);
  if (!token) return;

  try {
    const snapshot = await get(ref(db, `chats/${id}`));
    if (!snapshot.exists()) {
      toast('Discussion introuvable.');
      return;
    }

    const chat = snapshot.val();
    if (chat.ownerUid !== user.uid && chat.inviteToken !== token) {
      toast('Code d’invitation invalide.');
      return;
    }

    await set(ref(db, `joinRequests/${id}/${user.uid}`), token);
    await update(ref(db), {
      [`chatMembers/${id}/${user.uid}`]: true,
      [`userChats/${user.uid}/${id}`]: true
    });

    toast('Accès privé autorisé.');
    window.VibeApp?.openChat(id, chat);
  } catch (error) {
    toast(`Impossible de rejoindre : ${error.message}`);
  }
}

async function atomicSend(text, type = 'text', extra = {}) {
  const chatId = currentChatId();
  if (!chatId || !user || !text) return false;

  const key = push(ref(db, `messages/${chatId}`)).key;
  if (!key) return false;

  const message = {
    text: clean(text, 20000),
    uid: user.uid,
    createdAt: serverTimestamp(),
    type,
    viewOnce: Boolean(extra.viewOnce),
    ...extra
  };

  await update(ref(db), {
    [`messages/${chatId}/${key}`]: message,
    [`events/${user.uid}/${key}`]: {
      type: 'message_sent',
      chatId,
      messageId: key,
      createdAt: serverTimestamp()
    }
  });

  return true;
}

function handleSubmit(event) {
  if (event.target !== $('#messageForm')) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const input = $('#messageInput');
  const text = clean(input?.value);
  if (!text) return;

  atomicSend(text)
    .then((ok) => {
      if (ok) {
        input.value = '';
        toast('Message envoyé.');
      }
    })
    .catch((error) => toast(`Impossible d'envoyer : ${error.message}`));
}

function handleAttachment(event) {
  if (event.target?.id !== 'attachBtn') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  $('#fileInput')?.click();
}

async function handleFile(event) {
  if (event.target?.id !== 'fileInput') return;

  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  const allowed = file.type.startsWith('image/')
    || file.type.startsWith('video/')
    || file.type.startsWith('audio/')
    || file.type === 'application/pdf';

  if (!allowed) {
    toast('Type de fichier non pris en charge.');
    return;
  }

  if (file.size > 750 * 1024) {
    toast('Fichier trop volumineux : 750 Ko maximum.');
    return;
  }

  if (!currentChatId() || !user) {
    toast('Ouvrez une discussion.');
    return;
  }

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await atomicSend(file.name, 'media', {
      fileName: file.name.slice(0, 180),
      mimeType: file.type,
      dataUrl
    });

    toast('Fichier envoyé.');
  } catch (error) {
    toast(`Envoi impossible : ${error.message}`);
  }
}

function decorateReactions(raw) {
  const map = {};

  for (const [messageId, users] of Object.entries(raw || {})) {
    const counts = {};
    for (const value of Object.values(users || {})) {
      counts[value] = (counts[value] || 0) + 1;
    }

    map[messageId] = Object.entries(counts)
      .map(([emoji, count]) => emoji + (count > 1 ? ` ${count}` : ''))
      .join(' ');
  }

  document.querySelectorAll('#messages [data-message]').forEach((element) => {
    const previous = element.querySelector('.message-reaction');
    if (previous) previous.remove();

    if (map[element.dataset.message]) {
      const badge = document.createElement('span');
      badge.className = 'message-reaction';
      badge.textContent = map[element.dataset.message];
      element.appendChild(badge);
    }
  });
}

function watchReactions(chatId) {
  if (stopReactions) stopReactions();
  stopReactions = onValue(ref(db, `reactions/${chatId}`), (snapshot) => {
    decorateReactions(snapshot.val() || {});
  });
}

async function watchPresence(chatId) {
  if (stopPeerPresence) stopPeerPresence();

  const members = (await get(ref(db, `chatMembers/${chatId}`))).val() || {};
  const peers = Object.keys(members).filter((uid) => uid !== user?.uid);
  const element = $('#chatPresence');

  if (!peers.length) {
    if (element) element.textContent = 'vous êtes le seul membre';
    return;
  }

  const states = new Map();
  const listeners = [];

  const paint = () => {
    const onlineCount = [...states.values()].filter((state) => state === 'online').length;
    if (element) {
      element.textContent = peers.length === 1
        ? (onlineCount ? 'en ligne' : 'hors ligne')
        : `${onlineCount}/${peers.length} en ligne`;
    }
  };

  for (const peerUid of peers) {
    listeners.push(onValue(ref(db, `presence/${peerUid}/status`), (snapshot) => {
      states.set(peerUid, snapshot.val()?.state || 'offline');
      paint();
    }));
  }

  stopPeerPresence = () => listeners.forEach((unsubscribe) => unsubscribe());
}

function viewOnceClick(event) {
  const element = event.target.closest('#messages [data-message]');
  if (!element || !user) return;

  const messageId = element.dataset.message;
  const chatId = currentChatId();
  if (!messageId || !chatId || consumed.has(messageId)) return;

  get(ref(db, `messages/${chatId}/${messageId}`)).then(async (snapshot) => {
    const message = snapshot.val();
    if (!message?.viewOnce || message.uid === user.uid) return;

    consumed.add(messageId);
    try {
      await remove(ref(db, `messages/${chatId}/${messageId}`));
      toast('Message à vue unique consommé.');
    } catch (error) {
      consumed.delete(messageId);
      toast(`Impossible : ${error.message}`);
    }
  });
}

async function cleanupStories() {
  if (!user) return;

  const raw = (await get(ref(db, `stories/${user.uid}`))).val() || {};
  const now = Date.now();

  await Promise.all(
    Object.entries(raw)
      .filter(([, story]) => Number(story?.expiresAt || 0) <= now)
      .map(([storyId]) => remove(ref(db, `stories/${user.uid}/${storyId}`)).catch(() => {}))
  );
}

function monitor() {
  const chatId = currentChatId();
  if (!chatId) {
    cleanup();
    return;
  }

  if (chatId === selected) return;
  selected = chatId;
  cleanup();
  watchReactions(chatId);
  watchPresence(chatId).catch(() => {});
}

onAuthStateChanged(auth, async (currentUser) => {
  user = currentUser;
  if (user) await cleanupStories().catch(() => {});
  selected = null;
  monitor();
  document.dispatchEvent(new CustomEvent('vibe:auth-changed', { detail: { user } }));
});

document.addEventListener('click', (event) => {
  const target = event.target.closest('#newChatBtn, #menuBtn, #chatMenuBtn');

  if (target?.id === 'newChatBtn') {
    event.preventDefault();
    event.stopImmediatePropagation();
    createPrivateChat();
    return;
  }

  if (target?.id === 'chatMenuBtn') {
    event.preventDefault();
    event.stopImmediatePropagation();

    const choice = prompt(
      'Vibe :\n1. Rejoindre une discussion privée\n2. Message à vue unique\n3. Réagir au dernier message'
    );

    if (choice === '1') {
      joinPrivateChat();
    } else if (choice === '2') {
      const text = clean(prompt('Message à vue unique :'));
      if (text) {
        atomicSend(text, 'text', { viewOnce: true })
          .then((ok) => {
            if (ok) toast('Message à vue unique envoyé.');
          });
      }
    } else if (choice === '3') {
      const chatId = currentChatId();
      if (!chatId || !user) return;

      get(ref(db, `messages/${chatId}`)).then((snapshot) => {
        const values = snapshot.val() || {};
        const keys = Object.keys(values);
        const lastMessageId = keys[keys.length - 1];
        if (!lastMessageId) return;

        const reaction = clean(prompt('Réaction : ❤️ 👍 😂 😮 😢 🙏'), 16);
        if (reaction) {
          set(ref(db, `reactions/${chatId}/${lastMessageId}/${user.uid}`), reaction)
            .then(() => toast('Réaction enregistrée.'));
        }
      });
    }

    return;
  }

  const chatButton = event.target.closest('[data-chat-id]');
  if (chatButton) {
    selected = chatButton.dataset.chatId;
    document.querySelectorAll('.conversation-item').forEach((element) => {
      element.classList.toggle('active', element.dataset.chatId === selected);
    });
    setTimeout(monitor, 0);
  }

  viewOnceClick(event);
}, true);

document.addEventListener('submit', handleSubmit, true);
document.addEventListener('click', handleAttachment, true);
document.addEventListener('change', handleFile, true);

window.VibeFixes = { createPrivateChat, joinPrivateChat };
