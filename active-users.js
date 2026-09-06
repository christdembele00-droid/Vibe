import { auth, db, onAuthStateChanged, collection, doc, getDoc, getDocs, onSnapshot, query, where, limit, setDoc, serverTimestamp } from './firebase-client.js';

const list = () => document.getElementById('activeUsersList');
let stop = null;
let currentUid = null;
const privateChatId = (a, b) => `private_${[String(a), String(b)].sort().join('_')}`;
const makeInviteToken = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');

async function findExistingPrivateChat(memberUid) {
  const directId = privateChatId(currentUid, memberUid);
  const direct = await getDoc(doc(db, 'conversations', directId));
  if (direct.exists()) return { id: direct.id, ...direct.data() };
  const q = query(collection(db, 'conversations'), where('participantIds', 'array-contains', currentUid), limit(100));
  const snap = await getDocs(q);
  let existing = null;
  snap.forEach(item => {
    if (existing) return;
    const data = item.data();
    if (data.type === 'private' && Array.isArray(data.participantIds) && data.participantIds.length === 2 && data.participantIds.includes(memberUid)) {
      existing = { id: item.id, ...data };
    }
  });
  return existing;
}

async function openMemberChat(member) {
  if (!currentUid || !member?.uid || member.uid === currentUid) return;
  const appApi = window.VibeApp;
  if (!appApi?.openChat) return;
  try {
    const existing = await findExistingPrivateChat(member.uid);
    if (existing) {
      appApi.openChat(existing.id, existing);
      return;
    }
    const chatId = privateChatId(currentUid, member.uid);
    const name = member.displayName || `Utilisateur ${String(member.uid).slice(0, 8)}`;
    const currentName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Utilisateur';
    const inviteToken = makeInviteToken();
    const chatRef = doc(db, 'conversations', chatId);
    const chatData = {
      name: `Discussion avec ${name}`,
      ownerId: currentUid,
      participantIds: [currentUid, member.uid],
      participantNames: { [currentUid]: currentName, [member.uid]: name },
      inviteToken,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      type: 'private'
    };
    await setDoc(chatRef, chatData);
    await setDoc(doc(db, 'conversationInvites', inviteToken), { token: inviteToken, chatId, name: chatData.name, ownerId: currentUid, createdAt: serverTimestamp() });
    appApi.openChat(chatId, { id: chatId, ...chatData });
  } catch (error) {
    console.error('Ouverture discussion membre:', error);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `Discussion impossible : ${error.message}`;
      toast.classList.add('show');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
    }
  }
}

function render(users) {
  const el = list();
  if (!el) return;
  const count = users.filter(u => u.uid !== currentUid).length;
  el.dataset.count = String(count);
  el.innerHTML = `<div class="active-users-count" aria-live="polite">${count} personne${count > 1 ? 's' : ''} en ligne</div>`;
}

function watch() {
  stop?.();
  stop = null;
  if (!currentUid) {
    render([]);
    return;
  }
  const q = query(collection(db, 'presence'), where('state', '==', 'online'), limit(50));
  stop = onSnapshot(q, snap => {
    const users = [];
    snap.forEach(item => users.push({ uid: item.id, ...item.data() }));
    queueMicrotask(() => render(users));
  }, error => {
    console.warn('Présence Firestore:', error);
    stop = null;
    render([]);
  });
}

onAuthStateChanged(auth, user => {
  currentUid = user?.uid || null;
  watch();
});

// auth-ui.js already emits this event. Keep it as a UI refresh hook without
// starting a second listener when the Auth state callback has already handled it.
document.addEventListener('vibe:auth-changed', event => {
  const nextUid = event.detail?.user?.uid || null;
  if (nextUid === currentUid) return;
  currentUid = nextUid;
  watch();
});
