import { auth, db, collection, doc, addDoc, setDoc, getDoc, getDocs, query, where, serverTimestamp } from './firebase-client.js';

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

export async function ensureVibeProfile() {
  const uid = userId();
  if (!uid || !db) return null;

  const profileRef = doc(db, 'profiles', uid);
  const snapshot = await getDoc(profileRef);
  const current = snapshot.exists() ? snapshot.data() : {};
  const vibeId = current.vibeId || makeVibeId(uid);
  const name = current.name || 'Vibe';

  await setDoc(profileRef, {
    name,
    about: current.about || 'Disponible sur Vibe',
    vibeId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, 'userSearch', vibeId), {
    uid,
    vibeId,
    displayName: name,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return { uid, vibeId, name };
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

    const existing = await getDocs(query(collection(db, 'chats'), where('participantIds', 'array-contains', uid)));
    let found = null;
    existing.forEach(item => {
      const data = item.data();
      if (!found && data.type === 'private' && Array.isArray(data.participantIds) && data.participantIds.length === 2 && data.participantIds.includes(target.uid)) {
        found = { id: item.id, ...data };
      }
    });

    if (found) {
      toast('Cette discussion existe déjà.');
      document.dispatchEvent(new CustomEvent('vibe:open-chat', { detail: { chat: found } }));
      return found;
    }

    const name = target.displayName || target.vibeId || 'Discussion';
    const ref = await addDoc(collection(db, 'chats'), {
      name,
      ownerId: uid,
      participantIds: [uid, target.uid],
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      type: 'private'
    });

    const chat = {
      id: ref.id,
      name,
      ownerId: uid,
      participantIds: [uid, target.uid],
      type: 'private'
    };

    toast('Discussion créée.');
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
