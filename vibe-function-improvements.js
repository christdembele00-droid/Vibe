import { FIREBASE_ENABLED, auth, db, collection, doc, writeBatch, serverTimestamp } from './firebase-client.js';

let sending = false;

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function removeEmojiFeature() {
  document.getElementById('emojiBtn')?.remove();
}

async function sendMessageAtomically(event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const input = document.getElementById('messageInput');
  const form = document.getElementById('messageForm');
  const sendButton = form?.querySelector('.send-btn');
  const user = auth?.currentUser;
  const chatId = window.VibeApp?.currentChatId;
  const text = input?.value?.trim() || '';

  if (sending || !FIREBASE_ENABLED || !user || !chatId || !text) return;
  if (text.length > 2000) return toast('Message trop long.');

  sending = true;
  if (sendButton) sendButton.disabled = true;

  try {
    const batch = writeBatch(db);
    const messageRef = doc(collection(db, 'conversations', chatId, 'messages'));
    const now = serverTimestamp();

    batch.set(messageRef, {
      uid: user.uid,
      text,
      type: 'text',
      viewOnce: false,
      createdAt: now
    });

    batch.set(doc(db, 'conversations', chatId), {
      updatedAt: now
    }, { merge: true });

    batch.set(doc(db, 'users', user.uid, 'conversations', chatId), {
      chatId,
      updatedAt: now
    }, { merge: true });

    await batch.commit();
    if (input) input.value = '';
  } catch (error) {
    console.error('Envoi atomique Vibe:', error);
    toast(`Message non envoyé : ${error.message}`);
  } finally {
    sending = false;
    if (sendButton) sendButton.disabled = false;
    input?.focus();
  }
}

removeEmojiFeature();

const messageForm = document.getElementById('messageForm');
messageForm?.addEventListener('submit', sendMessageAtomically, true);
