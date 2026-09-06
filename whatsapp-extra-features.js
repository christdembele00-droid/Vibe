import {
  auth, db, storage, collection, doc, addDoc, setDoc, onSnapshot,
  serverTimestamp, ref, uploadBytes, getDownloadURL
} from './firebase-client.js';

const $ = (id) => document.getElementById(id);
const listeners = new WeakMap();
let modal = null;
let voiceRecorder = null;
let voiceChunks = [];
let voiceStartedAt = 0;

function toast(text) {
  const el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2800);
}

function uid() { return auth?.currentUser?.uid || null; }
function chatId() {
  return window.VibeApp?.currentChatId || document.querySelector('.conversation-item.active')?.dataset.chatId || null;
}

function closeModal() { modal?.remove(); modal = null; }

function openModal(title, body) {
  closeModal();
  modal = document.createElement('div');
  modal.className = 'vibe-extra-overlay';
  modal.innerHTML = `<section class="vibe-extra-modal" role="dialog" aria-modal="true" aria-label="${title}"><header><strong>${title}</strong><button type="button" data-close aria-label="Fermer">×</button></header><div class="vibe-extra-body">${body}</div></section>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) closeModal();
  });
  return modal;
}

function renderReactionBadge(message, reactions) {
  let badge = message.querySelector('.vibe-reactions');
  if (!reactions.length) { badge?.remove(); return; }
  const counts = reactions.reduce((map, r) => {
    map[r.emoji] = (map[r.emoji] || 0) + 1;
    return map;
  }, {});
  const current = uid();
  badge ||= Object.assign(document.createElement('div'), { className: 'vibe-reactions' });
  badge.innerHTML = Object.entries(counts).map(([emoji, count]) => `<span>${emoji} <b>${count}</b></span>`).join('');
  badge.title = current && reactions.some(r => r.uid === current) ? 'Votre réaction est incluse' : 'Réactions';
  if (!badge.parentElement) message.appendChild(badge);
}

function watchReactions(message) {
  const id = message.dataset.message || message.dataset.messageId;
  const cid = chatId();
  if (!id || !cid || listeners.has(message)) return;
  const unsubscribe = onSnapshot(collection(db, 'conversations', cid, 'messages', id, 'reactions'), (snap) => {
    renderReactionBadge(message, snap.docs.map(d => d.data()));
  }, () => {});
  listeners.set(message, unsubscribe);
}

function scanMessages() {
  document.querySelectorAll('#messages .message').forEach(watchReactions);
}

async function uploadMedia(file, folder = 'chat-media') {
  const user = uid();
  if (!user) throw new Error('Connexion requise.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${user}/${Date.now()}-${safeName}`;
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, file, { contentType: file.type || 'application/octet-stream' });
  return getDownloadURL(objectRef);
}

async function sendMedia(file) {
  const cid = chatId();
  const user = uid();
  if (!cid || !user) return toast(!user ? 'Connexion requise.' : 'Ouvrez une discussion.');
  if (file.size > 25 * 1024 * 1024) return toast('Fichier limité à 25 Mo.');
  try {
    toast('Envoi du média…');
    const url = await uploadMedia(file);
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
    await addDoc(collection(db, 'conversations', cid, 'messages'), {
      uid: user, text: file.name, type, mediaUrl: url, fileName: file.name,
      mimeType: file.type || '', size: file.size, createdAt: serverTimestamp()
    });
    await setDoc(doc(db, 'conversations', cid), { updatedAt: serverTimestamp() }, { merge: true });
    toast('Média envoyé.');
  } catch (e) { toast(`Envoi impossible : ${e.message}`); }
}

function openMediaPicker() {
  const input = $('fileInput');
  if (!input) return;
  input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
  input.multiple = false;
  input.onchange = () => { const file = input.files?.[0]; if (file) void sendMedia(file); input.value = ''; };
  input.click();
}

async function publishStatus() {
  const user = uid();
  if (!user) return toast('Connectez-vous pour publier un statut.');
  const box = openModal('Mon statut', `<textarea id="statusText" maxlength="700" placeholder="Écrivez un statut…"></textarea><input id="statusFile" type="file" accept="image/*,video/*"><button class="vibe-primary" id="publishStatusBtn">Publier</button>`);
  box.querySelector('#publishStatusBtn').addEventListener('click', async () => {
    const text = box.querySelector('#statusText').value.trim();
    const file = box.querySelector('#statusFile').files?.[0];
    if (!text && !file) return toast('Ajoutez du texte ou un média.');
    if (file && file.size > 25 * 1024 * 1024) return toast('Fichier limité à 25 Mo.');
    try {
      let mediaUrl = '';
      if (file) mediaUrl = await uploadMedia(file, 'statuses');
      await addDoc(collection(db, 'statuses'), {
        uid: user, text, mediaUrl, mimeType: file?.type || '', fileName: file?.name || '',
        createdAt: serverTimestamp(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      closeModal();
      toast('Statut publié pour 24 h.');
    } catch (e) { toast(`Publication impossible : ${e.message}`); }
  });
}

function openStatuses() {
  const user = uid();
  if (!user) return toast('Connexion requise.');
  const box = openModal('Actus', '<div id="statusFeed" class="vibe-status-feed"><p>Chargement…</p></div>');
  const feed = box.querySelector('#statusFeed');
  const unsubscribe = onSnapshot(collection(db, 'statuses'), (snap) => {
    const now = Date.now();
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(s => s.createdAt?.toMillis ? now - s.createdAt.toMillis() < 86400000 : true)
      .sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    feed.innerHTML = rows.length ? rows.map(s => `<article><strong>${s.uid === user ? 'Vous' : 'Utilisateur'}</strong>${s.text ? `<p>${escapeHtml(s.text)}</p>` : ''}${s.mediaUrl ? (s.mimeType?.startsWith('video/') ? `<video controls src="${s.mediaUrl}"></video>` : `<img src="${s.mediaUrl}" alt="Statut">`) : ''}</article>`).join('') : '<p>Aucun statut récent.</p>';
  }, () => { feed.innerHTML = '<p>Impossible de charger les statuts.</p>'; });
  modal.querySelector('[data-close]').addEventListener('click', unsubscribe, { once: true });
}

function escapeHtml(value) { const d = document.createElement('div'); d.textContent = value; return d.innerHTML; }

async function createCommunity(kind) {
  const user = uid();
  if (!user) return toast('Connexion requise.');
  const label = kind === 'group' ? 'Nouveau groupe' : 'Nouvelle chaîne';
  const box = openModal(label, `<input id="communityName" maxlength="60" placeholder="Nom"><textarea id="communityDescription" maxlength="300" placeholder="Description (facultatif)"></textarea>${kind === 'group' ? '<input id="communityMembers" placeholder="UID des membres, séparés par des virgules">' : ''}<button class="vibe-primary" id="communityCreate">Créer</button>`);
  box.querySelector('#communityCreate').addEventListener('click', async () => {
    const name = box.querySelector('#communityName').value.trim();
    const description = box.querySelector('#communityDescription').value.trim();
    if (!name) return toast('Donnez un nom.');
    const members = kind === 'group' ? [...new Set([user, ...(box.querySelector('#communityMembers').value || '').split(',').map(x => x.trim()).filter(Boolean)])] : [user];
    try {
      const refDoc = await addDoc(collection(db, 'conversations'), {
        name, description, type: kind, ownerId: user, members, admins: [user], updatedAt: serverTimestamp(), createdAt: serverTimestamp()
      });
      if (kind === 'group') await addDoc(collection(db, 'conversations', refDoc.id, 'messages'), { uid: user, text: `Groupe « ${name} » créé.`, type: 'system', createdAt: serverTimestamp() });
      closeModal();
      toast(`${label} créé.`);
    } catch (e) { toast(`Création impossible : ${e.message}`); }
  });
}

function setupVoice() {
  const form = $('messageForm');
  if (!form || $('vibeVoiceBtn')) return;
  const button = document.createElement('button');
  button.type = 'button'; button.id = 'vibeVoiceBtn'; button.className = 'composer-btn vibe-voice-btn'; button.title = 'Message vocal'; button.setAttribute('aria-label', 'Message vocal'); button.textContent = '🎙️';
  form.insertBefore(button, form.querySelector('.send-btn'));
  button.addEventListener('click', async () => {
    if (voiceRecorder && voiceRecorder.state === 'recording') return stopVoice(button);
    const user = uid();
    const cid = chatId();
    if (!user) return toast('Connexion requise.');
    if (!cid) return toast('Ouvrez une discussion.');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Les messages vocaux ne sont pas pris en charge ici.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunks = [];
      voiceRecorder = new MediaRecorder(stream);
      voiceStartedAt = Date.now();
      voiceRecorder.ondataavailable = e => { if (e.data.size) voiceChunks.push(e.data); };
      voiceRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(voiceChunks, { type: voiceRecorder.mimeType || 'audio/webm' });
        voiceRecorder = null; voiceChunks = [];
        if (Date.now() - voiceStartedAt < 500) return toast('Message vocal trop court.');
        try {
          toast('Envoi du vocal…');
          const file = new File([blob], `vocal-${Date.now()}.webm`, { type: blob.type });
          const url = await uploadMedia(file, 'voice');
          await addDoc(collection(db, 'conversations', cid, 'messages'), { uid: user, text: 'Message vocal', type: 'audio', mediaUrl: url, mimeType: blob.type, duration: Math.round((Date.now() - voiceStartedAt) / 1000), createdAt: serverTimestamp() });
          toast('Message vocal envoyé.');
        } catch (e) { toast(`Vocal impossible : ${e.message}`); }
      };
      voiceRecorder.start();
      button.classList.add('recording'); button.textContent = '⏹️'; toast('Enregistrement… appuyez pour arrêter.');
    } catch (e) { toast('Microphone refusé ou indisponible.'); }
  });
}
function stopVoice(button) { button.classList.remove('recording'); button.textContent = '🎙️'; voiceRecorder?.stop(); }

function openExtraMenu() {
  const box = openModal('Vibe', '<button data-extra="status">🟢 Actus / Statuts 24 h</button><button data-extra="publish">➕ Publier un statut</button><button data-extra="group">👥 Nouveau groupe</button><button data-extra="channel">📣 Nouvelle chaîne</button>');
  box.addEventListener('click', (e) => {
    const action = e.target.closest('[data-extra]')?.dataset.extra;
    if (!action) return;
    closeModal();
    if (action === 'status') openStatuses();
    if (action === 'publish') void publishStatus();
    if (action === 'group') void createCommunity('group');
    if (action === 'channel') void createCommunity('channel');
  });
}

function bind() {
  $('attachBtn')?.addEventListener('click', openMediaPicker);
  $('menuBtn')?.addEventListener('click', openExtraMenu);
  setupVoice();
  const messages = $('messages');
  if (messages) {
    scanMessages();
    new MutationObserver(scanMessages).observe(messages, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
else bind();
