import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from './firebase-client.js';

let stopStatuses = null;
let stopCalls = null;
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
    await addDoc(collection(db, 'statuses'), {
      text,
      authorId: user.uid,
      timestamp: serverTimestamp()
    });
    input.value = '';
    showToast('Statut publié.');
  } catch (error) {
    console.error('[Vibe] Publication statut:', error);
    showToast('Impossible de publier le statut.');
  }
}

function loadStatuses() {
  stopStatuses?.();
  stopStatuses = null;
  const container = document.getElementById('status-list-container');
  if (!container || !db || !auth?.currentUser) return;

  const since = Date.now() - 24 * 60 * 60 * 1000;
  const statusesQuery = query(collection(db, 'statuses'), orderBy('timestamp', 'desc'));

  stopStatuses = onSnapshot(statusesQuery, snapshot => {
    const statuses = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => {
        const time = item.timestamp?.toDate?.()?.getTime?.() ?? 0;
        return !time || time >= since;
      });

    if (!statuses.length) {
      container.innerHTML = '<div class="feature-empty">Aucun statut publié dans les dernières 24 heures.</div>';
      return;
    }

    container.innerHTML = statuses.map(item => `
      <article class="status-card">
        <div class="feature-avatar">${escapeHtml((item.authorName || 'V').slice(0, 1).toUpperCase())}</div>
        <div class="status-body">
          <strong>${escapeHtml(item.authorName || 'Utilisateur Vibe')}</strong>
          <p>${escapeHtml(item.text || '')}</p>
          <time>${formatTime(item.timestamp)}</time>
        </div>
      </article>`).join('');
  }, error => {
    console.error('[Vibe] Statuts:', error);
    container.innerHTML = '<div class="feature-empty">Impossible de charger les statuts.</div>';
  });
}

function openStatuses() {
  stopCalls?.();
  stopCalls = null;
  showPanel(panelShell(
    'Statuts',
    'Partagez une mise à jour visible pendant 24 heures.',
    `<div class="feature-card status-publisher">
      <div class="feature-card-title"><span class="feature-icon">◉</span><div><h3>Mon statut</h3><p>Une mise à jour simple, rapide et éphémère.</p></div></div>
      <textarea id="status-text-input" maxlength="700" placeholder="Écrire une mise à jour..."></textarea>
      <div class="feature-actions"><button class="primary-btn" id="publish-status-btn" type="button">Partager</button></div>
    </div>
    <div class="feature-card">
      <div class="feature-card-title"><div><h3>Statuts récents</h3><p>Les statuts sont automatiquement masqués après 24 heures.</p></div></div>
      <div id="status-list-container" class="status-list"><div class="feature-empty">Chargement des statuts...</div></div>
    </div>`
  ));

  document.getElementById('publish-status-btn')?.addEventListener('click', publishStatus);
  loadStatuses();
}

async function addCallRecord(type, contact = 'Utilisateur Vibe') {
  const user = auth?.currentUser;
  if (!user || !db) return;
  try {
    await addDoc(collection(db, 'calls'), {
      uid: user.uid,
      contact,
      type,
      direction: 'outgoing',
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('[Vibe] Historique appel:', error);
  }
}

function loadCalls() {
  stopCalls?.();
  stopCalls = null;
  const container = document.getElementById('calls-list-container');
  if (!container || !db || !auth?.currentUser) return;

  const callsQuery = query(collection(db, 'calls'), orderBy('timestamp', 'desc'));
  stopCalls = onSnapshot(callsQuery, snapshot => {
    const calls = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.uid === auth.currentUser?.uid)
      .slice(0, 30);

    if (!calls.length) {
      container.innerHTML = '<div class="feature-empty">Aucun appel récent.</div>';
      return;
    }

    container.innerHTML = calls.map(item => `
      <article class="call-row">
        <div class="feature-avatar">${item.type === 'video' ? '▣' : '☎'}</div>
        <div class="call-main"><strong>${escapeHtml(item.contact || 'Utilisateur Vibe')}</strong><p>${item.direction === 'incoming' ? 'Appel reçu' : 'Appel sortant'} · ${item.type === 'video' ? 'Vidéo' : 'Audio'}</p></div>
        <time>${formatDate(item.timestamp)} ${formatTime(item.timestamp)}</time>
      </article>`).join('');
  }, error => {
    console.error('[Vibe] Appels:', error);
    container.innerHTML = '<div class="feature-empty">Impossible de charger l’historique.</div>';
  });
}

function openCalls() {
  stopStatuses?.();
  stopStatuses = null;
  showPanel(panelShell(
    'Appels',
    'Historique des appels audio et vidéo de Vibe.',
    `<div class="feature-card call-hero">
      <div class="call-hero-icon">☎</div>
      <h3>Appels Vibe</h3>
      <p>Les appels peuvent être préparés ici. Cette version enregistre l’action dans votre historique sans démarrer un appel réel.</p>
      <div class="feature-actions feature-actions-center">
        <button class="secondary-btn" id="quick-audio" type="button">☎ Appel audio</button>
        <button class="primary-btn" id="quick-video" type="button">▣ Appel vidéo</button>
      </div>
    </div>
    <div class="feature-card">
      <div class="feature-card-title"><div><h3>Historique</h3><p>Vos 30 dernières actions d’appel.</p></div></div>
      <div id="calls-list-container" class="calls-list"><div class="feature-empty">Chargement...</div></div>
    </div>`
  ));

  document.getElementById('quick-audio')?.addEventListener('click', async () => {
    await addCallRecord('audio');
    showToast('Appel audio préparé.');
  });
  document.getElementById('quick-video')?.addEventListener('click', async () => {
    await addCallRecord('video');
    showToast('Appel vidéo préparé.');
  });
  loadCalls();
}

async function loadProfile() {
  const user = auth?.currentUser;
  if (!user || !db) return { name: 'Vibe', about: 'Disponible sur Vibe' };
  try {
    const snapshot = await getDoc(doc(db, 'profiles', user.uid));
    return snapshot.exists() ? snapshot.data() : { name: 'Vibe', about: 'Disponible sur Vibe' };
  } catch (error) {
    console.error('[Vibe] Profil:', error);
    return { name: 'Vibe', about: 'Disponible sur Vibe' };
  }
}

async function saveProfile() {
  const user = auth?.currentUser;
  if (!user || !db) return;
  const name = document.getElementById('profile-name')?.value.trim() || 'Vibe';
  const about = document.getElementById('profile-about')?.value.trim() || '';
  try {
    await setDoc(doc(db, 'profiles', user.uid), {
      name: name.slice(0, 60),
      about: about.slice(0, 160),
      updatedAt: serverTimestamp()
    }, { merge: true });
    const currentName = document.getElementById('current-user-name');
    const currentAvatar = document.getElementById('current-user-avatar');
    if (currentName) currentName.textContent = name.slice(0, 60);
    if (currentAvatar) currentAvatar.textContent = name.slice(0, 1).toUpperCase();
    showToast('Profil enregistré.');
  } catch (error) {
    console.error('[Vibe] Enregistrement profil:', error);
    showToast('Impossible d’enregistrer le profil.');
  }
}

async function openSettings() {
  stopStatuses?.();
  stopStatuses = null;
  stopCalls?.();
  stopCalls = null;
  const profile = await loadProfile();
  const uid = auth?.currentUser?.uid || 'Non connecté';

  showPanel(panelShell(
    'Paramètres',
    'Personnalisez votre profil et vos préférences Vibe.',
    `<div class="feature-card profile-card">
      <div class="profile-avatar">${escapeHtml((profile.name || 'V').slice(0, 1).toUpperCase())}</div>
      <div class="profile-fields">
        <label>Nom<input id="profile-name" maxlength="60" value="${escapeHtml(profile.name || 'Vibe')}"></label>
        <label>À propos<textarea id="profile-about" maxlength="160">${escapeHtml(profile.about || '')}</textarea></label>
        <button class="primary-btn" id="save-profile-btn" type="button">Enregistrer</button>
      </div>
    </div>
    <div class="feature-card">
      <div class="setting-row"><span>Identifiant de session</span><code>${escapeHtml(uid)}</code></div>
      <div class="setting-row"><span>Authentification</span><strong>Session Firebase</strong></div>
      <div class="setting-row"><span>Synchronisation</span><strong>Temps réel</strong></div>
    </div>
    <div class="feature-card security-card">
      <h3>Confidentialité et sécurité</h3>
      <p>Vibe applique les règles Firestore de développement aux utilisateurs authentifiés. Les appels affichés dans cette version sont des actions simulées et ne lancent pas de communication réelle.</p>
    </div>`
  ));

  document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
}

export function initWhatsAppNavigation() {
  const btnStatus = document.getElementById('btn-status');
  const btnCalls = document.getElementById('btn-calls');
  const btnSettings = document.getElementById('btn-settings');

  if (btnStatus && !btnStatus.dataset.vibeBound) {
    btnStatus.dataset.vibeBound = 'true';
    btnStatus.addEventListener('click', openStatuses);
  }
  if (btnCalls && !btnCalls.dataset.vibeBound) {
    btnCalls.dataset.vibeBound = 'true';
    btnCalls.addEventListener('click', openCalls);
  }
  if (btnSettings && !btnSettings.dataset.vibeBound) {
    btnSettings.dataset.vibeBound = 'true';
    btnSettings.addEventListener('click', openSettings);
  }
}

export async function enregistrerAppel(type, contact) {
  await addCallRecord(type, contact);
  showToast(type === 'video' ? 'Appel vidéo préparé.' : 'Appel audio préparé.');
}

export function cleanupWhatsAppFeatures() {
  stopStatuses?.();
  stopStatuses = null;
  stopCalls?.();
  stopCalls = null;
}
