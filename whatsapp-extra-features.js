import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from './firebase-client.js';

let stopStatuses = null;
let stopCalls = null;
let stopChannels = null;
let toastTimer = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
}[char]));

const formatTime = value => {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
};

const formatDate = value => {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
};

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.value = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function panelShell(title, subtitle, content) {
  return `<section class="feature-view">
    <header class="feature-header">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>
    </header>
    <div class="feature-content">${content}</div>
  </section>`;
}

function showPanel(html) {
  const panel = document.getElementById('main-chat-panel');
  if (!panel) return;
  panel.innerHTML = html;
  document.getElementById('app-shell')?.classList.add('chat-open');
}

async function publishStatus() {
  const input = document.getElementById('status-text-input');
  const text = input?.value.trim();
  const user = auth?.currentUser;
  if (!text || !user || !db) return;
  try {
    const profile = await getDoc(doc(db, 'profiles', user.uid));
    const profileData = profile.exists() ? profile.data() : {};
    await addDoc(collection(db, 'statuses'), {
      text: text.slice(0, 700), authorId: user.uid, authorName: profileData.name || user.displayName || 'Utilisateur Vibe', timestamp: serverTimestamp()
    });
    input.value = '';
    showToast('Statut publié.');
  } catch (error) { console.error('[Vibe] Publication statut:', error); showToast('Impossible de publier le statut.'); }
}

function loadStatuses() {
  stopStatuses?.(); stopStatuses = null;
  const container = document.getElementById('status-list-container');
  if (!container || !db || !auth?.currentUser) return;
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const statusesQuery = query(collection(db, 'statuses'), orderBy('timestamp', 'desc'));
  stopStatuses = onSnapshot(statusesQuery, snapshot => {
    const statuses = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => {
      const time = item.timestamp?.toDate?.()?.getTime?.() ?? 0; return !time || time >= since;
    });
    if (!statuses.length) { container.innerHTML = '<div class="feature-empty">Aucun statut publié dans les dernières 24 heures.</div>'; return; }
    container.innerHTML = statuses.map(item => `<article class="status-card"><div class="feature-avatar">${escapeHtml((item.authorName || 'V').slice(0, 1).toUpperCase())}</div><div class="status-body"><strong>${escapeHtml(item.authorName || 'Utilisateur Vibe')}</strong><p>${escapeHtml(item.text || '')}</p><time>${formatTime(item.timestamp)}</time></div></article>`).join('');
  }, error => { console.error('[Vibe] Statuts:', error); container.innerHTML = '<div class="feature-empty">Impossible de charger les statuts.</div>'; });
}

function openStatuses() {
  stopCalls?.(); stopCalls = null; stopChannels?.(); stopChannels = null;
  showPanel(panelShell('Statuts', 'Partagez une mise à jour visible pendant 24 heures.', `<div class="feature-card status-publisher"><div class="feature-card-title"><span class="feature-icon">◉</span><div><h3>Mon statut</h3><p>Une mise à jour simple, rapide et éphémère.</p></div></div><textarea id="status-text-input" maxlength="700" placeholder="Écrire une mise à jour..."></textarea><div class="feature-actions"><button class="primary-btn" id="publish-status-btn" type="button">Partager</button></div></div><div class="feature-card"><div class="feature-card-title"><div><h3>Statuts récents</h3><p>Les statuts sont automatiquement masqués après 24 heures.</p></div></div><div id="status-list-container" class="status-list"><div class="feature-empty">Chargement des statuts...</div></div></div>`));
  document.getElementById('publish-status-btn')?.addEventListener('click', publishStatus); loadStatuses();
}

async function addCallRecord(type, contact = 'Utilisateur Vibe') {
  const user = auth?.currentUser; if (!user || !db) return;
  try { await addDoc(collection(db, 'calls'), { uid: user.uid, contact, type, direction: 'outgoing', timestamp: serverTimestamp() }); }
  catch (error) { console.error('[Vibe] Historique appel:', error); }
}

function loadCalls() {
  stopCalls?.(); stopCalls = null;
  const container = document.getElementById('calls-list-container'); if (!container || !db || !auth?.currentUser) return;
  const callsQuery = query(collection(db, 'calls'), orderBy('timestamp', 'desc'));
  stopCalls = onSnapshot(callsQuery, snapshot => {
    const calls = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => item.uid === auth.currentUser?.uid).slice(0, 30);
    if (!calls.length) { container.innerHTML = '<div class="feature-empty">Aucun appel récent.</div>'; return; }
    container.innerHTML = calls.map(item => `<article class="call-row"><div class="feature-avatar">${item.type === 'video' ? '▣' : '☎'}</div><div class="call-main"><strong>${escapeHtml(item.contact || 'Utilisateur Vibe')}</strong><p>${item.direction === 'incoming' ? 'Appel reçu' : 'Appel sortant'} · ${item.type === 'video' ? 'Vidéo' : 'Audio'}</p></div><time>${formatDate(item.timestamp)} ${formatTime(item.timestamp)}</time></article>`).join('');
  }, error => { console.error('[Vibe] Appels:', error); container.innerHTML = '<div class="feature-empty">Impossible de charger l’historique.</div>'; });
}

function openCalls() {
  stopStatuses?.(); stopStatuses = null; stopChannels?.(); stopChannels = null;
  showPanel(panelShell('Appels', 'Historique des appels audio et vidéo de Vibe.', `<div class="feature-card call-hero"><div class="call-hero-icon">☎</div><h3>Appels Vibe</h3><p>Les appels peuvent être préparés ici. Cette version enregistre l’action dans votre historique sans démarrer un appel réel.</p><div class="feature-actions feature-actions-center"><button class="secondary-btn" id="quick-audio" type="button">☎ Appel audio</button><button class="primary-btn" id="quick-video" type="button">▣ Appel vidéo</button></div></div><div class="feature-card"><div class="feature-card-title"><div><h3>Historique</h3><p>Vos 30 dernières actions d’appel.</p></div></div><div id="calls-list-container" class="calls-list"><div class="feature-empty">Chargement...</div></div></div>`));
  document.getElementById('quick-audio')?.addEventListener('click', async () => { await addCallRecord('audio'); showToast('Appel audio préparé.'); });
  document.getElementById('quick-video')?.addEventListener('click', async () => { await addCallRecord('video'); showToast('Appel vidéo préparé.'); });
  loadCalls();
}

function stopChannelListener() { stopChannels?.(); stopChannels = null; }

async function createChannel() {
  const user = auth?.currentUser; if (!user || !db) { showToast('Connectez-vous pour créer une chaîne.'); return; }
  const name = String(prompt('Nom de la chaîne :') || '').trim().slice(0, 60); if (!name) return;
  const description = String(prompt('Description de la chaîne (facultatif) :') || '').trim().slice(0, 180);
  try {
    const profile = await getDoc(doc(db, 'profiles', user.uid)); const profileData = profile.exists() ? profile.data() : {};
    const channelRef = await addDoc(collection(db, 'channels'), { name, description, ownerId: user.uid, ownerName: profileData.name || user.displayName || 'Utilisateur Vibe', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), followersCount: 0, type: 'channel' });
    await setDoc(doc(db, 'channelFollowers', `${channelRef.id}_${user.uid}`), { channelId: channelRef.id, uid: user.uid, followedAt: serverTimestamp(), active: true });
    showToast('Chaîne créée et suivie.');
  } catch (error) { console.error('[Vibe] Création chaîne:', error); showToast('Impossible de créer la chaîne.'); }
}

async function toggleChannelFollow(channel, button) {
  const user = auth?.currentUser; if (!user || !db) { showToast('Connectez-vous pour suivre une chaîne.'); return; }
  const followRef = doc(db, 'channelFollowers', `${channel.id}_${user.uid}`);
  try {
    const existing = await getDoc(followRef);
    if (existing.exists() && existing.data()?.active !== false) { await setDoc(followRef, { unfollowedAt: serverTimestamp(), active: false }, { merge: true }); button.textContent = 'Suivre'; showToast('Chaîne retirée de vos abonnements.'); }
    else { await setDoc(followRef, { channelId: channel.id, uid: user.uid, followedAt: serverTimestamp(), active: true }, { merge: true }); button.textContent = 'Suivi'; showToast('Chaîne suivie.'); }
  } catch (error) { console.error('[Vibe] Abonnement chaîne:', error); showToast('Impossible de modifier l’abonnement.'); }
}

async function publishChannelPost(channel) {
  const user = auth?.currentUser; if (!user || !db) return;
  const text = String(prompt(`Publication dans « ${channel.name} » :`) || '').trim().slice(0, 1000); if (!text) return;
  try {
    const profile = await getDoc(doc(db, 'profiles', user.uid)); const profileData = profile.exists() ? profile.data() : {};
    await addDoc(collection(db, 'channels', channel.id, 'posts'), { text, authorId: user.uid, authorName: profileData.name || user.displayName || 'Utilisateur Vibe', createdAt: serverTimestamp() });
    await setDoc(doc(db, 'channels', channel.id), { updatedAt: serverTimestamp() }, { merge: true }); showToast('Publication envoyée.');
  } catch (error) { console.error('[Vibe] Publication chaîne:', error); showToast('Impossible de publier.'); }
}

function loadChannelPosts(channel, container) {
  const postsQuery = query(collection(db, 'channels', channel.id, 'posts'), orderBy('createdAt', 'desc'));
  return onSnapshot(postsQuery, snapshot => {
    const posts = snapshot.docs.slice(0, 30).map(item => ({ id: item.id, ...item.data() }));
    if (!posts.length) { container.innerHTML = '<div class="feature-empty">Aucune publication pour le moment.</div>'; return; }
    container.innerHTML = posts.map(post => `<article class="status-card"><div class="feature-avatar">${escapeHtml((post.authorName || channel.name || 'V').slice(0, 1).toUpperCase())}</div><div class="status-body"><strong>${escapeHtml(post.authorName || channel.name)}</strong><p>${escapeHtml(post.text || '')}</p><time>${formatTime(post.createdAt)}</time></div></article>`).join('');
  }, error => { console.error('[Vibe] Publications chaîne:', error); container.innerHTML = '<div class="feature-empty">Impossible de charger les publications.</div>'; });
}

async function openChannel(channel) {
  stopChannelListener();
  const postsId = `channel-posts-${channel.id}`;
  showPanel(panelShell(channel.name, channel.description || `Chaîne Vibe · ${channel.followersCount || 0} abonnés`, `<div class="feature-card"><div class="feature-card-title"><span class="feature-icon">📢</span><div><h3>${escapeHtml(channel.name)}</h3><p>${escapeHtml(channel.ownerName || 'Créateur Vibe')}</p></div></div><div class="feature-actions"><button class="secondary-btn" id="channel-follow-btn" type="button">Suivre</button>${channel.ownerId === auth?.currentUser?.uid ? '<button class="primary-btn" id="channel-publish-btn" type="button">Publier</button>' : ''}</div></div><div class="feature-card"><div class="feature-card-title"><div><h3>Publications</h3><p>Les dernières publications de la chaîne.</p></div></div><div id="${postsId}" class="status-list"><div class="feature-empty">Chargement...</div></div></div>`));
  const followButton = document.getElementById('channel-follow-btn');
  if (auth.currentUser) {
    const followSnapshot = await getDoc(doc(db, 'channelFollowers', `${channel.id}_${auth.currentUser.uid}`));
    if (followSnapshot.exists() && followSnapshot.data()?.active !== false) followButton.textContent = 'Suivi';
  }
  followButton?.addEventListener('click', () => toggleChannelFollow(channel, followButton));
  document.getElementById('channel-publish-btn')?.addEventListener('click', () => publishChannelPost(channel));
  const container = document.getElementById(postsId); if (container) stopChannels = loadChannelPosts(channel, container);
}

function loadChannels() {
  stopChannelListener();
  const container = document.getElementById('channel-list-container'); if (!container || !db || !auth?.currentUser) return;
  const channelsQuery = query(collection(db, 'channels'), orderBy('updatedAt', 'desc'));
  stopChannels = onSnapshot(channelsQuery, snapshot => {
    const channels = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    if (!channels.length) { container.innerHTML = '<div class="feature-empty">Aucune chaîne pour le moment. Créez la première chaîne Vibe.</div>'; return; }
    container.innerHTML = channels.map(channel => `<article class="call-row channel-row" data-channel-id="${escapeHtml(channel.id)}"><div class="feature-avatar">${escapeHtml((channel.name || 'V').slice(0, 1).toUpperCase())}</div><div class="call-main"><strong>${escapeHtml(channel.name || 'Chaîne Vibe')}</strong><p>${escapeHtml(channel.description || 'Chaîne Vibe')} · ${channel.followersCount || 0} abonnés</p></div><button class="secondary-btn channel-open-btn" type="button">Ouvrir</button></article>`).join('');
    container.querySelectorAll('.channel-open-btn').forEach(button => { button.addEventListener('click', () => { const id = button.closest('[data-channel-id]')?.dataset.channelId; const channel = channels.find(item => item.id === id); if (channel) openChannel(channel); }); });
  }, error => { console.error('[Vibe] Chaînes:', error); container.innerHTML = '<div class="feature-empty">Impossible de charger les chaînes.</div>'; });
}

function openChannels() {
  stopStatuses?.(); stopStatuses = null; stopCalls?.(); stopCalls = null;
  showPanel(panelShell('Chaînes', 'Découvrez, suivez et publiez sur les chaînes Vibe.', `<div class="feature-card call-hero"><div class="call-hero-icon">📢</div><h3>Chaînes Vibe</h3><p>Suivez les chaînes qui vous intéressent et créez votre propre espace de publication.</p><div class="feature-actions feature-actions-center"><button class="primary-btn" id="create-channel-btn" type="button">+ Créer une chaîne</button></div></div><div class="feature-card"><div class="feature-card-title"><div><h3>Découvrir</h3><p>Les chaînes disponibles sur Vibe.</p></div></div><div id="channel-list-container" class="calls-list"><div class="feature-empty">Chargement des chaînes...</div></div></div>`));
  document.getElementById('create-channel-btn')?.addEventListener('click', createChannel); loadChannels();
}

async function loadProfile() {
  const user = auth?.currentUser;
  if (!user || !db) return { name: '', about: 'Disponible sur Vibe', photoURL: '' };
  try {
    const snapshot = await getDoc(doc(db, 'profiles', user.uid));
    const saved = snapshot.exists() ? snapshot.data() : {};
    return {
      uid: user.uid,
      name: String(user.displayName || saved.name || 'Utilisateur Vibe').trim(),
      displayName: String(user.displayName || saved.displayName || saved.name || 'Utilisateur Vibe').trim(),
      photoURL: String(user.photoURL || saved.photoURL || '').trim(),
      about: String(saved.about || 'Disponible sur Vibe').trim(),
      email: user.email || saved.email || '',
      vibeId: String(saved.vibeId || `vibe-${user.uid.slice(-8).toLowerCase()}`).trim()
    };
  } catch (error) { console.error('[Vibe] Profil:', error); return { name: user.displayName || 'Utilisateur Vibe', about: 'Disponible sur Vibe', photoURL: user.photoURL || '', email: user.email || '' }; }
}

async function saveProfile() {
  const user = auth?.currentUser; if (!user || !db) return;
  const about = document.getElementById('profile-about')?.value.trim() || '';
  try {
    const current = await loadProfile();
    await setDoc(doc(db, 'profiles', user.uid), {
      uid: user.uid,
      name: user.displayName || current.name || 'Utilisateur Vibe',
      displayName: user.displayName || current.displayName || current.name || 'Utilisateur Vibe',
      photoURL: user.photoURL || current.photoURL || '',
      email: user.email || current.email || '',
      vibeId: current.vibeId || `vibe-${user.uid.slice(-8).toLowerCase()}`,
      about: about.slice(0, 160),
      updatedAt: serverTimestamp()
    }, { merge: true });
    const currentName = document.getElementById('current-user-name');
    if (currentName) currentName.textContent = user.displayName || current.name || 'Utilisateur Vibe';
    showToast('Profil enregistré.');
  } catch (error) { console.error('[Vibe] Enregistrement profil:', error); showToast('Impossible d’enregistrer le profil.'); }
}

async function openSettings() {
  stopStatuses?.(); stopStatuses = null; stopCalls?.(); stopCalls = null; stopChannels?.(); stopChannels = null;
  const profile = await loadProfile();
  const uid = auth?.currentUser?.uid || 'Non connecté';
  const photoMarkup = profile.photoURL
    ? `<img class="settings-profile-photo" src="${escapeHtml(profile.photoURL)}" alt="Photo de profil" referrerpolicy="no-referrer">`
    : `<div class="settings-profile-fallback">${escapeHtml((profile.name || 'V').slice(0, 1).toUpperCase())}</div>`;

  showPanel(panelShell('Paramètres', 'Personnalisez votre profil et vos préférences Vibe.', `<div class="feature-card profile-card"><div id="settings-profile-avatar" class="profile-avatar" aria-label="Photo de profil">${photoMarkup}</div><div class="profile-fields"><label>Nom<input id="profile-name" maxlength="60" value="${escapeHtml(profile.name || 'Utilisateur Vibe')}" readonly aria-readonly="true"></label><label>À propos<textarea id="profile-about" maxlength="160" placeholder="À propos de vous...">${escapeHtml(profile.about || '')}</textarea></label><button class="primary-btn" id="save-profile-btn" type="button">Enregistrer</button></div></div><div class="feature-card"><div class="setting-row"><span>Identifiant Vibe</span><code>${escapeHtml(profile.vibeId || uid)}</code></div><div class="setting-row"><span>Compte Google</span><strong>${escapeHtml(profile.email || 'Connecté')}</strong></div><div class="setting-row"><span>Synchronisation</span><strong>Temps réel</strong></div></div><div class="feature-card security-card"><h3>Confidentialité et sécurité</h3><p>Votre nom et votre photo sont liés au compte Google. Seule la section « À propos » est personnalisable depuis Vibe.</p></div>`));

  const photo = document.querySelector('.settings-profile-photo');
  photo?.addEventListener('error', () => {
    const fallback = document.createElement('div'); fallback.className = 'settings-profile-fallback'; fallback.textContent = (profile.name || 'V').slice(0, 1).toUpperCase(); photo.replaceWith(fallback);
  }, { once: true });
  document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
}

export function initWhatsAppNavigation() {
  const btnStatus = document.getElementById('btn-status'); const btnChannels = document.getElementById('btn-channels'); const btnCalls = document.getElementById('btn-calls'); const btnSettings = document.getElementById('btn-settings');
  if (btnStatus && !btnStatus.dataset.vibeBound) { btnStatus.dataset.vibeBound = 'true'; btnStatus.addEventListener('click', openStatuses); }
  if (btnChannels && !btnChannels.dataset.vibeBound) { btnChannels.dataset.vibeBound = 'true'; btnChannels.addEventListener('click', openChannels); }
  if (btnCalls && !btnCalls.dataset.vibeBound) { btnCalls.dataset.vibeBound = 'true'; btnCalls.addEventListener('click', openCalls); }
  if (btnSettings && !btnSettings.dataset.vibeBound) { btnSettings.dataset.vibeBound = 'true'; btnSettings.addEventListener('click', openSettings); }
}

export async function enregistrerAppel(type, contact) { await addCallRecord(type, contact); showToast(type === 'video' ? 'Appel vidéo préparé.' : 'Appel audio préparé.'); }
export function cleanupWhatsAppFeatures() { stopStatuses?.(); stopStatuses = null; stopCalls?.(); stopCalls = null; stopChannels?.(); stopChannels = null; }
