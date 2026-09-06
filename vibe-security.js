import { getAuth } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getDatabase, ref, get, set, push, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';
import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant vibe-security.js');
const auth = getAuth(app);
const db = getDatabase(app, 'https://vibe-749e5-default-rtdb.firebaseio.com');

const randomToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

const clean = value => String(value || '').trim();
const toast = text => {
  const element = document.querySelector('#toast');
  if (!element) return;
  element.textContent = text;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2800);
};

async function secureEnsureChatMembership(chatId, inviteToken = '') {
  const user = auth.currentUser;
  if (!user || !chatId || String(chatId).startsWith('demo-')) return false;
  const memberRef = ref(db, `chatMembers/${chatId}/${user.uid}`);
  const memberSnap = await get(memberRef);
  if (memberSnap.val() === true) return true;

  const chatSnap = await get(ref(db, `chats/${chatId}`));
  const chat = chatSnap.val();
  if (!chat) throw new Error('Discussion introuvable.');

  if (chat.ownerUid !== user.uid) {
    const token = clean(inviteToken);
    if (!token || token.length < 16) throw new Error('Un code d’invitation valide est requis.');
    if (chat.inviteToken !== token) throw new Error('Code d’invitation incorrect.');
  }

  await set(memberRef, true);
  await set(ref(db, `userChats/${user.uid}/${chatId}`), true);
  return true;
}

async function secureCreateChat() {
  const user = auth.currentUser;
  if (!user) return toast('Connectez-vous pour créer une discussion.');
  const name = prompt('Nom de la discussion :');
  if (!clean(name)) return;
  const cleanName = clean(name).slice(0, 120);
  const chatId = `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const inviteToken = randomToken();

  try {
    await set(ref(db, `chats/${chatId}`), {
      name: cleanName,
      ownerUid: user.uid,
      inviteToken,
      createdAt: serverTimestamp()
    });
    await set(ref(db, `chatMembers/${chatId}/${user.uid}`), true);
    await set(ref(db, `userChats/${user.uid}/${chatId}`), true);
    toast(`Discussion créée — ID : ${chatId} — Code : ${inviteToken}`);
    window.dispatchEvent(new CustomEvent('vibe:chat-created', { detail: { chatId, name: cleanName, inviteToken } }));
  } catch (error) {
    toast(`Création impossible : ${error.message}`);
  }
}

async function secureJoinChat() {
  const user = auth.currentUser;
  if (!user) return toast('Connectez-vous pour rejoindre une discussion.');
  const chatId = clean(prompt('Identifiant de la discussion :'));
  if (!chatId) return;
  const token = clean(prompt('Code d’invitation :'));
  if (!token) return;

  try {
    await secureEnsureChatMembership(chatId, token);
    const snapshot = await get(ref(db, `chats/${chatId}`));
    const data = snapshot.val();
    if (!data) throw new Error('Discussion introuvable.');
    toast('Discussion rejointe.');
    window.dispatchEvent(new CustomEvent('vibe:chat-joined', { detail: { chatId, data } }));
  } catch (error) {
    toast(`Impossible de rejoindre : ${error.message}`);
  }
}

window.ensureChatMembership = secureEnsureChatMembership;
window.createChat = secureCreateChat;
window.joinChat = secureJoinChat;

document.addEventListener('click', event => {
  const newChatButton = event.target.closest('#newChatBtn');
  if (newChatButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    secureCreateChat();
  }
}, true);

document.addEventListener('vibe:chat-created', event => {
  const { chatId, name } = event.detail || {};
  const list = document.querySelector('#conversationList');
  if (!list || !chatId) return;
  const existing = list.querySelector(`[data-chat="${CSS.escape(chatId)}"]`);
  if (existing) existing.click();
  else {
    const item = document.createElement('article');
    item.className = 'conversation';
    item.dataset.chat = chatId;
    item.innerHTML = `<div class="avatar">${String(name || 'V').trim().charAt(0).toUpperCase()}</div><div class="conv-body"><div class="conv-row"><strong>${name}</strong><span class="conv-time"></span></div><div class="conv-row"><div class="conv-preview"></div></div></div>`;
    list.prepend(item);
    item.click();
  }
});

document.addEventListener('vibe:chat-joined', event => {
  const { chatId, data } = event.detail || {};
  if (!chatId || !data) return;
  const list = document.querySelector('#conversationList');
  const item = list?.querySelector(`[data-chat="${CSS.escape(chatId)}"]`);
  if (item) item.click();
  else window.openChat?.(chatId);
});
