import { auth, db, collection, doc, setDoc, getDoc, getDocs, query, where, serverTimestamp } from './firebase-client.js';

const toast = message => {
  const el = document.getElementById('toast');
  if (!el) return;
  el.value = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2800);
};

const userId = () => auth?.currentUser?.uid || null;

function makeVibeId(uid) {
  return uid ? `vibe-${uid.slice(-8).toLowerCase()}` : '';
}

// Un identifiant déterministe garantit qu'A et B ouvrent toujours
// exactement le même document Firestore, même s'ils démarrent la
// discussion presque au même moment.
function makeDirectChatId(uidA, uidB) {
  return `private_${[String(uidA), String(uidB)].sort().join('_')}`;
}

export async function ensureVibeProfile() {
  const user = auth?.currentUser;
  const uid = user?.uid || null;
  if (!uid || !db) return null;

  const profileRef = doc(db, 'profiles', uid);
  const snapshot = await getDoc(profileRef);
  const current = snapshot.exists() ? snapshot.data() : {};
  const vibeId = current.vibeId || makeVibeId(uid);
  const name = user.displayName || current.name || 'Utilisateur';
  const photoURL = user.photoURL || current.photoURL || '';

  await setDoc(profileRef, {
    name,
    displayName: name,
    photoURL,
    email: user.email || current.email || '',
    about: current.about || 'Disponible sur Vibe',
    vibeId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, 'userSearch', vibeId), {
    uid,
    vibeId,
    displayName: name,
    photoURL,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return { uid, vibeId, name, displayName: name, photoURL, email: user.email || '' };
}

export async function createDirectChat() {
  const uid = userId();
  if (!uid || !db) {
    toast('Connectez-vous pour créer une discussion.');
    return null;
  }

  await ensureVibeProfile();
  const identifier = String(prompt('Identifiant Vibe de la personne à contacter (ex. vibe-1234abcd) :') || '').trim().toLowerCase();
  if (!identifier) return null;

  try {
    const users = await getDocs(query(collection(db, 'userSearch'), where('vibeId', '==', identifier)));
    if (users.empty) {
      toast('Identifiant Vibe introuvable.');
      return null;
    }

    const target = users.docs[0].data();
    if (!target.uid || target.uid === uid) {
      toast('Choisissez un autre utilisateur.');
      return null;
    }

    const chatId = makeDirectChatId(uid, target.uid);
    const chatRef = doc(db, 'chats', chatId);
    const existingChat = await getDoc(chatRef);
    const name = target.displayName || target.vibeId || 'Discussion';

    if (!existingChat.exists()) {
      await setDoc(chatRef, {
        name,
        ownerId: uid,
        participantIds: [uid, target.uid],
        participantNames: {
          [uid]: auth.currentUser?.displayName || 'Utilisateur',
          [target.uid]: name
        },
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        type: 'private'
      });
      toast('Discussion créée.');
    } else {
      toast('Cette discussion existe déjà.');
    }

    const chatData = existingChat.exists() ? existingChat.data() : {};
    const chat = {
      id: chatId,
      ...chatData,
      name: chatData.name || name,
      ownerId: chatData.ownerId || uid,
      participantIds: Array.isArray(chatData.participantIds) ? chatData.participantIds : [uid, target.uid],
      type: 'private'
    };

    document.dispatchEvent(new CustomEvent('vibe:open-chat', { detail: { chat } }));
    return chat;
  } catch (error) {
    console.error('[Vibe] Discussion privée:', error);
    toast(`Création impossible : ${error.message}`);
    return null;
  }
}

document.addEventListener('vibe:open-chat', event => {
  const chat = event.detail?.chat;
  if (!chat) return;
  const item = document.querySelector(`[data-chat-id="${CSS.escape(chat.id)}"]`);
  if (item) item.click();
});

window.VibeDirectChat = { createDirectChat, ensureVibeProfile };
