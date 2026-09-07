import { auth, db, doc, getDoc } from './firebase-client.js';
import { creerAvatarDepuisProfil } from './vibe-avatar.js';

async function getRemoteGoogleProfile(chat) {
  const uid = auth?.currentUser?.uid;
  const participants = Array.isArray(chat?.participantIds) ? chat.participantIds : [];
  const targetUid = participants.find(id => id && id !== uid);
  if (!targetUid || !db) return null;

  try {
    const userSnapshot = await getDoc(doc(db, 'users', targetUid));
    if (userSnapshot.exists()) {
      const data = userSnapshot.data() || {};
      return {
        uid: targetUid,
        name: data.name || data.displayName || 'Utilisateur',
        displayName: data.displayName || data.name || 'Utilisateur',
        photoURL: data.photoURL || ''
      };
    }

    const profileSnapshot = await getDoc(doc(db, 'profiles', targetUid));
    if (profileSnapshot.exists()) {
      const data = profileSnapshot.data() || {};
      return {
        uid: targetUid,
        name: data.name || data.displayName || 'Utilisateur',
        displayName: data.displayName || data.name || 'Utilisateur',
        photoURL: data.photoURL || ''
      };
    }
  } catch (error) {
    console.warn('[Vibe] Profil Google discussion:', error);
  }
  return null;
}

function replaceAvatar(container, profile) {
  if (!container || !profile) return;
  const avatar = creerAvatarDepuisProfil(profile, { className: 'chat-avatar' });
  avatar.dataset.googleProfile = 'true';
  container.replaceWith(avatar);
}

async function syncChatProfile(button) {
  if (!button || !db) return;
  const chatId = button.dataset.chatId;
  if (!chatId) return;

  try {
    const snapshot = await getDoc(doc(db, 'chats', chatId));
    if (!snapshot.exists()) return;
    const chat = snapshot.data() || {};
    const profile = await getRemoteGoogleProfile(chat);
    if (!profile) return;

    const listAvatar = button.querySelector('.chat-avatar');
    replaceAvatar(listAvatar, profile);

    const mainPanel = document.getElementById('main-chat-panel');
    const header = mainPanel?.querySelector('.chat-header');
    if (!header) return;

    const headerAvatar = header.querySelector('.chat-avatar');
    if (headerAvatar) {
      const avatar = creerAvatarDepuisProfil(profile, { className: 'chat-avatar' });
      avatar.dataset.googleProfile = 'true';
      headerAvatar.replaceWith(avatar);
    }

    const title = header.querySelector('.chat-title-wrap strong');
    if (title) title.textContent = profile.name;
  } catch (error) {
    console.warn('[Vibe] Synchronisation profil discussion:', error);
  }
}

function installProfileSync() {
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.chat-item[data-chat-id]');
    if (!button) return;
    setTimeout(() => syncChatProfile(button), 0);
  }, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installProfileSync, { once: true });
} else {
  installProfileSync();
}
