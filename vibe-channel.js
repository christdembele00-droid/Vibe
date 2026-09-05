import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, updateDoc, deleteField } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const CHANNEL_ID = 'vibe';
const CHANNEL_PATH = ['channels', CHANNEL_ID, 'messages'];
let currentUid = null;
let channelUnsub = null;
let channelActive = false;
let observer = null;
let booted = false;

const $ = id => document.getElementById(id);
const fallback = 'https://i.pravatar.cc/150?img=12';
const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
const time = value => value?.toDate?.().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) || '…';
const toast = text => {
  const el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(window.__vibeChannelToast);
  window.__vibeChannelToast = setTimeout(() => el.style.display = 'none', 2800);
};

function ensureChannelInSidebar() {
  const box = $('contacts');
  if (!box || !currentUid || channelActive) return;
  const existing = box.querySelector('[data-vibe-channel="true"]');
  if (existing) return;
  const empty = box.querySelector('.empty');
  if (empty) empty.remove();

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'contact';
  button.dataset.id = CHANNEL_ID;
  button.dataset.vibeChannel = 'true';
  button.innerHTML = `<img src="${esc($('meAvatar')?.src || fallback)}" alt=""><span><b>VIBE</b><small>Canal public</small></span>`;
  box.prepend(button);
}

function renderMessage(id, message, box) {
  const el = document.createElement('div');
  el.className = 'msg ' + (message.sender === currentUid ? 'sent' : 'received');
  el.dataset.messageId = id;

  if (message.deleted) {
    el.classList.add('deleted');
    el.innerHTML = '<span>🚫 Message supprimé</span>';
    box.appendChild(el);
    return;
  }

  if (message.sender !== currentUid) {
    const author = document.createElement('small');
    author.className = 'channel-author';
    author.textContent = message.senderName || 'Utilisateur';
    el.appendChild(author);
  }

  if (message.text) {
    const text = document.createElement('span');
    text.className = 'message-text';
    text.textContent = message.text;
    el.appendChild(text);
  }

  if (message.edited) {
    const edited = document.createElement('em');
    edited.className = 'edited';
    edited.textContent = 'modifié';
    el.appendChild(edited);
  }

  const tm = document.createElement('span');
  tm.className = 'time';
  tm.textContent = time(message.createdAt) + (message.sender === currentUid ? ' ✓' : '');
  el.appendChild(tm);

  if (message.sender === currentUid) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = '✏️';
    edit.title = 'Modifier';
    edit.onclick = event => {
      event.stopPropagation();
      const next = prompt('Modifier le message :', message.text || '');
      if (!next?.trim()) return;
      updateDoc(doc(db, ...CHANNEL_PATH, id), {
        text: next.trim().slice(0, 4000),
        edited: true,
        editedAt: serverTimestamp()
      }).catch(error => toast('Modification impossible : ' + (error?.message || 'erreur')));
    };

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '🗑️';
    remove.title = 'Supprimer';
    remove.onclick = event => {
      event.stopPropagation();
      if (!confirm('Supprimer ce message pour tous ?')) return;
      updateDoc(doc(db, ...CHANNEL_PATH, id), {
        deleted: true,
        text: '',
        deletedAt: serverTimestamp(),
        mediaURL: deleteField()
      }).then(() => toast('Message supprimé pour tous.'))
        .catch(error => toast('Suppression impossible : ' + (error?.message || 'erreur')));
    };

    actions.append(edit, remove);
    el.appendChild(actions);
  }

  box.appendChild(el);
}

function listenChannel() {
  channelUnsub?.();
  const box = $('messages');
  if (!box || !currentUid) return;
  const q = query(collection(db, ...CHANNEL_PATH), orderBy('createdAt', 'asc'), limit(300));
  channelUnsub = onSnapshot(q, snap => {
    if (!channelActive) return;
    box.replaceChildren();
    snap.forEach(item => renderMessage(item.id, item.data(), box));
    box.scrollTop = box.scrollHeight;
  }, error => toast('Canal VIBE indisponible : ' + (error?.message || 'erreur')));
}

function openChannel() {
  if (!currentUid) return;
  channelActive = true;
  window.VIBE_CHANNEL_ACTIVE = true;
  window.VIBE_CURRENT_USER = { id: CHANNEL_ID, name: 'VIBE', group: false, channel: true };
  document.querySelector('.app')?.classList.add('chat-open');
  if ($('name')) $('name').textContent = 'VIBE';
  if ($('status')) $('status').textContent = 'Canal public · tous les utilisateurs';
  if ($('composer')) $('composer').hidden = false;
  if ($('typing')) $('typing').hidden = true;
  listenChannel();
  $('message')?.focus();
}

function closeChannel() {
  channelUnsub?.();
  channelUnsub = null;
  channelActive = false;
  window.VIBE_CHANNEL_ACTIVE = false;
  if ($('composer')) $('composer').hidden = true;
}

async function sendChannelMessage(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!channelActive || !currentUid) return;
  const input = $('message');
  const text = input?.value.trim();
  if (!text) return;
  const user = auth.currentUser;
  try {
    await addDoc(collection(db, ...CHANNEL_PATH), {
      sender: currentUid,
      senderName: user?.displayName || user?.email?.split('@')[0] || 'Utilisateur',
      senderAvatar: user?.photoURL || fallback,
      text: text.slice(0, 4000),
      createdAt: serverTimestamp()
    });
    input.value = '';
  } catch (error) {
    toast('Message non envoyé : ' + (error?.message || 'erreur'));
  }
}

function handleClicks(event) {
  const channel = event.target.closest?.('[data-vibe-channel="true"]');
  if (channel) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openChannel();
    return;
  }
  if (event.target.closest?.('#back') && channelActive) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeChannel();
    document.querySelector('.app')?.classList.remove('chat-open');
    window.VIBE_CURRENT_USER = null;
  }
}

function handleSubmit(event) {
  if (channelActive && event.target?.id === 'composer') sendChannelMessage(event);
}

function boot() {
  if (booted) return;
  booted = true;
  document.addEventListener('click', handleClicks, true);
  document.addEventListener('submit', handleSubmit, true);
  observer = new MutationObserver(() => ensureChannelInSidebar());
  const contacts = $('contacts');
  if (contacts) observer.observe(contacts, { childList: true });
  onAuthStateChanged(auth, user => {
    currentUid = user?.uid || null;
    closeChannel();
    if (currentUid) setTimeout(ensureChannelInSidebar, 100);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

window.VIBE_OPEN_CHANNEL = openChannel;
window.VIBE_CLOSE_CHANNEL = closeChannel;
