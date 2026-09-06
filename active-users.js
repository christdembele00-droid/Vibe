import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, onSnapshot, query, where, limit, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant active-users.js');
const auth = getAuth(app);
const db = getFirestore(app);
const list = () => document.getElementById('activeUsersList');
let stop = null;
let currentUid = null;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
const escapeAttr = (value) => escapeHtml(value).replace(/`/g, '&#96;');
const makeInviteToken = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
const privateChatId = (a, b) => `private_${[String(a), String(b)].sort().join('_')}`;

async function findExistingPrivateChat(memberUid) {
  const directId = privateChatId(currentUid, memberUid);
  const direct = await getDoc(doc(db, 'conversations', directId));
  if (direct.exists()) return { id: direct.id, ...direct.data() };

  const q = query(collection(db, 'conversations'), where('participantIds', 'array-contains', currentUid), limit(100));
  const snap = await getDocs(q);
  let existing = null;
  snap.forEach((item) => {
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
      appApi.getChats?.();
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
    await setDoc(doc(db, 'conversationInvites', inviteToken), {
      token: inviteToken,
      chatId,
      name: chatData.name,
      ownerId: currentUid,
      createdAt: serverTimestamp()
    });

    const chat = { id: chatId, ...chatData };
    appApi.openChat(chatId, chat);
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
  const rows = users.filter((u) => u.uid !== currentUid);
  el.dataset.count = String(users.length);
  el.innerHTML = `<div class="active-users-avatars" aria-label="Utilisateurs actuellement en ligne">${rows.map((u) => {
    const name = u.displayName || `Utilisateur ${String(u.uid).slice(0, 8)}`;
    const initial = [...name.trim()][0]?.toUpperCase() || 'V';
    return `<button type="button" class="active-user-avatar" data-active-uid="${escapeAttr(u.uid)}" aria-label="Ouvrir une discussion avec ${escapeAttr(name)}" title="${escapeAttr(name)}"><span class="avatar">${escapeHtml(initial)}</span><i class="online-dot" aria-hidden="true"></i></button>`;
  }).join('')}</div>`;
}

function watch() {
  stop?.();
  if (!currentUid) { render([]); return; }
  const q = query(collection(db, 'presence'), where('state', '==', 'online'), limit(50));
  stop = onSnapshot(q, (snap) => {
    const users = [];
    snap.forEach((item) => users.push({ uid: item.id, ...item.data() }));
    users.sort((a, b) => String(a.displayName || a.uid).localeCompare(String(b.displayName || b.uid), 'fr'));
    queueMicrotask(() => render(users));
  }, (error) => {
    console.warn('Présence Firestore:', error);
    render([]);
  });
}

function bindList() {
  const el = list();
  if (!el || el.dataset.vibeActiveBound === '1') return;
  el.dataset.vibeActiveBound = '1';
  el.addEventListener('click', (event) => {
    const item = event.target.closest('[data-active-uid]');
    if (!item) return;
    const uid = item.dataset.activeUid;
    const name = item.getAttribute('title') || 'Utilisateur';
    void openMemberChat({ uid, displayName: name });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindList, { once: true });
else bindList();

auth.onAuthStateChanged ? onAuthStateChanged(auth, (user) => { currentUid = user?.uid || null; bindList(); watch(); }) : null;
document.addEventListener('vibe:auth-changed', (event) => { currentUid = event.detail?.user?.uid || auth.currentUser?.uid || null; bindList(); watch(); });
