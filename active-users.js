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

  // Compatibilité avec les anciennes discussions créées avec un ID aléatoire.
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

    // ID déterministe : les deux utilisateurs ouvrent exactement la même discussion.
    const chatId = privateChatId(currentUid, member.uid);
    const name = member.displayName || `Utilisateur ${String(member.uid).slice(0, 8)}`;
    const currentName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Utilisateur';
    const inviteToken = makeInviteToken();
    const chatRef = doc(db, 'conversations', chatId);
    const chatData = {
      name: `Discussion avec ${name}`,
      ownerId: currentUid,
      participantIds: [currentUid, member.uid],
      participantNames: {
        [currentUid]: currentName,
        [member.uid]: name
      },
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
  const count = users.length;
  el.dataset.count = String(count);
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 11px;margin:3px 2px 7px;border:1px solid rgba(255,255,255,.07);border-radius:15px;background:linear-gradient(135deg,rgba(255,122,24,.12),rgba(255,255,255,.025));">
      <div style="width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:rgba(255,122,24,.16);color:#ffb45a;font-weight:800;font-size:14px;box-shadow:0 0 18px rgba(255,122,24,.12)">●</div>
      <div style="min-width:0;flex:1"><strong style="display:block;font-size:12px">${count} en ligne</strong><span style="display:flex;align-items:center;gap:5px;margin-top:3px;color:#7f8795;font-size:10px"><i class="online-dot"></i> Actifs maintenant</span></div>
      <span style="font-size:18px;line-height:1">${count}</span>
    </div>
    ${rows.map((u) => {
      const name = u.displayName || `Utilisateur ${String(u.uid).slice(0, 8)}`;
      const initial = [...name.trim()][0]?.toUpperCase() || 'V';
      return `<button type="button" class="conversation-item" data-active-uid="${escapeAttr(u.uid)}" aria-label="Ouvrir une discussion avec ${escapeAttr(name)}"><div class="avatar">${escapeHtml(initial)}</div><div><strong>${escapeHtml(name)}</strong><span><i class="online-dot"></i> En ligne</span></div></button>`;
    }).join('')}`;
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

list()?.addEventListener('click', (event) => {
  const item = event.target.closest('[data-active-uid]');
  if (!item) return;
  const uid = item.dataset.activeUid;
  const name = item.querySelector('strong')?.textContent || 'Utilisateur';
  openMemberChat({ uid, displayName: name });
});

onAuthStateChanged(auth, (user) => { currentUid = user?.uid || null; watch(); });
document.addEventListener('vibe:auth-changed', (event) => { currentUid = event.detail?.user?.uid || auth.currentUser?.uid || null; watch(); });
