import {
  auth, db, collection, doc, getDoc, setDoc, addDoc, query, orderBy, onSnapshot, serverTimestamp
} from './firebase-client.js';

let stopChannels = null;
let stopPosts = null;

const esc = (value = '') => String(value).replace(/[&<>\"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;'
}[char]));

const time = value => {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
};

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.value = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
}

function shell(title, subtitle, body) {
  return `<section class="feature-view"><header class="feature-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div></header><div class="feature-content">${body}</div></section>`;
}

function show(html) {
  const panel = document.getElementById('main-chat-panel');
  if (!panel) return;
  panel.innerHTML = html;
  document.getElementById('app-shell')?.classList.add('chat-open');
}

function cleanupPosts() { stopPosts?.(); stopPosts = null; }
function cleanupChannels() { stopChannels?.(); stopChannels = null; cleanupPosts(); }

async function isFollowing(channelId, uid) {
  if (!db || !uid) return false;
  const snap = await getDoc(doc(db, 'channelFollowers', `${channelId}_${uid}`));
  return snap.exists() && snap.data()?.active !== false;
}

async function updateFollowCount(channelId, delta) {
  if (!db) return;
  const ref = doc(db, 'channels', channelId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = Number(snap.data()?.followersCount || 0);
  await setDoc(ref, { followersCount: Math.max(0, current + delta), updatedAt: serverTimestamp() }, { merge: true });
}

async function toggleFollow(channel, button) {
  const user = auth?.currentUser;
  if (!user || !db) return toast('Connectez-vous pour suivre une chaîne.');
  const ref = doc(db, 'channelFollowers', `${channel.id}_${user.uid}`);
  try {
    const snap = await getDoc(ref);
    const active = snap.exists() && snap.data()?.active !== false;
    if (active) {
      await setDoc(ref, { channelId: channel.id, uid: user.uid, active: false, unfollowedAt: serverTimestamp() }, { merge: true });
      await updateFollowCount(channel.id, -1);
      button.textContent = 'Suivre';
      toast('Chaîne retirée de vos abonnements.');
    } else {
      await setDoc(ref, { channelId: channel.id, uid: user.uid, active: true, followedAt: serverTimestamp() }, { merge: true });
      await updateFollowCount(channel.id, 1);
      button.textContent = 'Suivi';
      toast('Chaîne suivie.');
    }
  } catch (error) {
    console.error('[Vibe] Abonnement chaîne:', error);
    toast('Impossible de modifier l’abonnement.');
  }
}

async function createChannel() {
  const user = auth?.currentUser;
  if (!user || !db) return toast('Connectez-vous pour créer une chaîne.');
  const name = String(window.prompt('Nom de la chaîne :') || '').trim().slice(0, 60);
  if (!name) return;
  const description = String(window.prompt('Description de la chaîne (facultatif) :') || '').trim().slice(0, 180);
  try {
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
    const profile = userSnap.exists() ? userSnap.data() : (profileSnap.exists() ? profileSnap.data() : {});
    const channel = await addDoc(collection(db, 'channels'), {
      name, description, ownerId: user.uid,
      ownerName: user.displayName || profile.name || 'Utilisateur',
      ownerPhotoURL: user.photoURL || profile.photoURL || '',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), followersCount: 1, type: 'channel'
    });
    await setDoc(doc(db, 'channelFollowers', `${channel.id}_${user.uid}`), { channelId: channel.id, uid: user.uid, active: true, followedAt: serverTimestamp() });
    toast('Chaîne créée et suivie.');
    openChannel(channel.id);
  } catch (error) {
    console.error('[Vibe] Création chaîne:', error);
    toast('Impossible de créer la chaîne.');
  }
}

async function publishPost(channel) {
  const user = auth?.currentUser;
  if (!user || !db || channel.ownerId !== user.uid) return;
  const text = String(window.prompt(`Publication dans « ${channel.name} » :`) || '').trim().slice(0, 2000);
  if (!text) return;
  try {
    await addDoc(collection(db, 'channels', channel.id, 'posts'), {
      text, authorId: user.uid, authorName: user.displayName || channel.ownerName || 'Utilisateur',
      authorPhotoURL: user.photoURL || channel.ownerPhotoURL || '', createdAt: serverTimestamp()
    });
    await setDoc(doc(db, 'channels', channel.id), { updatedAt: serverTimestamp() }, { merge: true });
    toast('Publication envoyée.');
  } catch (error) {
    console.error('[Vibe] Publication chaîne:', error);
    toast('Impossible de publier.');
  }
}

function renderPosts(channel) {
  cleanupPosts();
  const container = document.getElementById('vibe-channel-posts');
  if (!container || !db) return;
  const q = query(collection(db, 'channels', channel.id, 'posts'), orderBy('createdAt', 'desc'));
  stopPosts = onSnapshot(q, snapshot => {
    if (snapshot.empty) return void (container.innerHTML = '<div class="feature-empty">Aucune publication pour le moment.</div>');
    container.innerHTML = snapshot.docs.slice(0, 50).map(item => {
      const post = item.data();
      return `<article class="status-card"><div class="feature-avatar">${esc((post.authorName || channel.name || 'V').slice(0, 1).toUpperCase())}</div><div class="status-body"><strong>${esc(post.authorName || channel.name)}</strong><p>${esc(post.text || '')}</p><time>${time(post.createdAt)}</time></div></article>`;
    }).join('');
  }, error => {
    console.error('[Vibe] Publications chaîne:', error);
    container.innerHTML = '<div class="feature-empty">Impossible de charger les publications.</div>';
  });
}

async function openChannel(channelId) {
  if (!db || !auth?.currentUser) return;
  cleanupPosts();
  const snap = await getDoc(doc(db, 'channels', channelId));
  if (!snap.exists()) return toast('Cette chaîne n’existe plus.');
  const channel = { id: snap.id, ...snap.data() };
  const following = await isFollowing(channel.id, auth.currentUser.uid);
  show(shell(channel.name || 'Chaîne Vibe', channel.description || 'Chaîne publique Vibe', `<div class="feature-card"><div class="feature-card-title"><span class="feature-icon">📢</span><div><h3>${esc(channel.name || 'Chaîne Vibe')}</h3><p>${esc(channel.ownerName || 'Créateur Vibe')} · ${Number(channel.followersCount || 0)} abonnés</p></div></div><div class="feature-actions"><button class="secondary-btn" id="vibe-channel-follow" type="button">${following ? 'Suivi' : 'Suivre'}</button>${channel.ownerId === auth.currentUser.uid ? '<button class="primary-btn" id="vibe-channel-publish" type="button">Publier</button>' : ''}</div></div><div class="feature-card"><div class="feature-card-title"><div><h3>Publications</h3><p>Les dernières publications de la chaîne.</p></div></div><div id="vibe-channel-posts" class="status-list"><div class="feature-empty">Chargement...</div></div></div>`));
  document.getElementById('vibe-channel-follow')?.addEventListener('click', event => toggleFollow(channel, event.currentTarget));
  document.getElementById('vibe-channel-publish')?.addEventListener('click', () => publishPost(channel));
  renderPosts(channel);
}

function loadChannels() {
  cleanupChannels();
  const container = document.getElementById('vibe-channels-list');
  if (!container || !db || !auth?.currentUser) return;
  const q = query(collection(db, 'channels'), orderBy('updatedAt', 'desc'));
  stopChannels = onSnapshot(q, snapshot => {
    if (snapshot.empty) return void (container.innerHTML = '<div class="feature-empty">Aucune chaîne pour le moment. Créez la première chaîne Vibe.</div>');
    const channels = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    container.innerHTML = channels.map(channel => `<article class="call-row channel-row" data-channel-id="${esc(channel.id)}"><div class="feature-avatar">${esc((channel.name || 'V').slice(0,1).toUpperCase())}</div><div class="call-main"><strong>${esc(channel.name || 'Chaîne Vibe')}</strong><p>${esc(channel.description || 'Chaîne publique Vibe')} · ${Number(channel.followersCount || 0)} abonnés</p></div><button class="secondary-btn vibe-channel-open" type="button">Ouvrir</button></article>`).join('');
    container.querySelectorAll('.vibe-channel-open').forEach(button => button.addEventListener('click', () => openChannel(button.closest('[data-channel-id]')?.dataset.channelId)));
  }, error => {
    console.error('[Vibe] Chaînes:', error);
    container.innerHTML = '<div class="feature-empty">Impossible de charger les chaînes.</div>';
  });
}

export function afficherFenetreChaines(containerId = 'main-chat-panel') {
  if (!auth?.currentUser || !db) return toast('Connectez-vous avec Google pour accéder aux chaînes.');
  cleanupChannels();
  show(shell('Chaînes', 'Découvrez, suivez et créez des chaînes Vibe.', `<div class="feature-card call-hero"><div class="call-hero-icon">📢</div><h3>Chaînes Vibe</h3><p>Suivez vos créateurs, recevez leurs publications et créez votre propre chaîne.</p><div class="feature-actions feature-actions-center"><button class="primary-btn" id="vibe-create-channel" type="button">+ Créer une chaîne</button></div></div><div class="feature-card"><div class="feature-card-title"><div><h3>Découvrir</h3><p>Les chaînes publiques disponibles sur Vibe.</p></div></div><div id="vibe-channels-list" class="calls-list"><div class="feature-empty">Chargement des chaînes...</div></div></div>`));
  document.getElementById('vibe-create-channel')?.addEventListener('click', createChannel);
  loadChannels();
}

export function initVibeChannels() {
  const button = document.getElementById('btn-channels');
  if (!button || button.dataset.vibeChannelsBound) return;
  button.dataset.vibeChannelsBound = 'true';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    afficherFenetreChaines('main-chat-panel');
  }, true);
}
