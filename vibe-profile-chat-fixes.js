import { auth, db, doc, getDoc, setDoc, onAuthStateChanged } from './firebase-client.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char]));

function currentGoogleProfile() {
  const user = auth?.currentUser;
  return {
    uid: user?.uid || '',
    name: String(user?.displayName || 'Utilisateur Vibe').trim(),
    photoURL: String(user?.photoURL || '').trim(),
    email: String(user?.email || '').trim()
  };
}

async function syncProfile() {
  const profile = currentGoogleProfile();
  if (!profile.uid || !db) return;
  const ref = doc(db, 'profiles', profile.uid);
  try {
    const snapshot = await getDoc(ref);
    const old = snapshot.exists() ? snapshot.data() : {};
    await setDoc(ref, {
      uid: profile.uid,
      name: profile.name,
      displayName: profile.name,
      photoURL: profile.photoURL,
      email: profile.email,
      vibeId: old.vibeId || `vibe-${profile.uid.slice(-8).toLowerCase()}`,
      about: typeof old.about === 'string' ? old.about.slice(0, 180) : '',
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.warn('[Vibe] Synchronisation profil:', error);
  }
}

function replaceProfileAvatar(element, profile) {
  if (!element) return;
  element.innerHTML = '';
  if (profile.photoURL) {
    const image = document.createElement('img');
    image.src = profile.photoURL;
    image.alt = 'Photo Google';
    image.referrerPolicy = 'no-referrer';
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.objectFit = 'cover';
    image.addEventListener('error', () => { image.remove(); element.textContent = profile.name.slice(0, 1).toUpperCase(); }, { once: true });
    element.appendChild(image);
  } else {
    element.textContent = profile.name.slice(0, 1).toUpperCase();
  }
}

async function openFixedSettings() {
  const user = auth?.currentUser;
  if (!user || !db) return;
  const profile = currentGoogleProfile();
  let saved = {};
  try {
    const snapshot = await getDoc(doc(db, 'profiles', user.uid));
    if (snapshot.exists()) saved = snapshot.data();
  } catch (error) { console.warn('[Vibe] Lecture paramètres:', error); }

  const panel = document.getElementById('main-chat-panel');
  if (!panel) return;
  panel.innerHTML = `<section class="feature-view vibe-fixed-settings">
    <header class="feature-header"><div><h2>Paramètres</h2><p>Votre identité est gérée par votre compte Google.</p></div></header>
    <div class="feature-content">
      <div class="feature-card">
        <div class="feature-card-title"><div id="vibe-settings-avatar" class="feature-avatar" style="width:64px;height:64px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;flex:none;"></div><div><h3>${escapeHtml(profile.name)}</h3><p>${escapeHtml(profile.email || 'Compte Google')}</p></div></div>
        <div class="setting-row"><span>Nom</span><strong>${escapeHtml(profile.name)}</strong></div>
        <div class="setting-row"><span>Photo de profil</span><strong>Compte Google</strong></div>
        <div class="setting-row"><span>ID Vibe</span><strong>${escapeHtml(saved.vibeId || `vibe-${user.uid.slice(-8).toLowerCase()}`)}</strong></div>
        <label class="setting-row" style="display:block"><span>À propos</span><textarea id="vibe-about-input" maxlength="180" style="width:100%;margin-top:8px;min-height:80px;resize:vertical;">${escapeHtml(saved.about || '')}</textarea></label>
        <div class="feature-actions"><button class="primary-btn" id="vibe-save-settings" type="button">Enregistrer</button></div>
      </div>
    </div>
  </section>`;
  document.getElementById('app-shell')?.classList.add('chat-open');
  replaceProfileAvatar(document.getElementById('vibe-settings-avatar'), profile);
  document.getElementById('vibe-save-settings')?.addEventListener('click', async () => {
    const about = String(document.getElementById('vibe-about-input')?.value || '').trim().slice(0, 180);
    try {
      await setDoc(doc(db, 'profiles', user.uid), { about, name: profile.name, displayName: profile.name, photoURL: profile.photoURL, email: profile.email }, { merge: true });
      document.getElementById('vibe-save-settings').textContent = 'Enregistré ✓';
      setTimeout(() => { const button = document.getElementById('vibe-save-settings'); if (button) button.textContent = 'Enregistrer'; }, 1400);
    } catch (error) {
      console.error('[Vibe] Enregistrement paramètres:', error);
      const toast = document.getElementById('toast');
      if (toast) { toast.value = 'Impossible d’enregistrer les paramètres.'; toast.classList.add('show'); }
    }
  });
}

function installSettingsOverride() {
  const button = document.getElementById('btn-settings');
  if (!button || button.dataset.vibeFixedSettings) return;
  button.dataset.vibeFixedSettings = 'true';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openFixedSettings();
  }, true);
}

async function syncOpenedChatProfile() {
  const view = document.querySelector('.chat-view');
  const active = document.querySelector('.chat-item.active');
  if (!view || !active || !db || !auth?.currentUser) return;
  const chatId = active.dataset.chatId;
  if (!chatId) return;
  try {
    const chatSnapshot = await getDoc(doc(db, 'chats', chatId));
    if (!chatSnapshot.exists()) return;
    const chat = chatSnapshot.data();
    const ids = Array.isArray(chat.participantIds) ? chat.participantIds.map(String) : [];
    const otherUid = ids.find(uid => uid !== auth.currentUser.uid);
    if (!otherUid) return;
    const userSnapshot = await getDoc(doc(db, 'users', otherUid));
    const other = userSnapshot.exists() ? userSnapshot.data() : {};
    const name = other.name || other.displayName || chat.participantNames?.[otherUid] || chat.name || 'Utilisateur Vibe';
    const title = view.querySelector('.chat-title-wrap strong');
    if (title) title.textContent = name;
    const avatar = view.querySelector('.chat-header .chat-avatar');
    replaceProfileAvatar(avatar, { name, photoURL: other.photoURL || '' });
  } catch (error) {
    console.warn('[Vibe] Profil discussion:', error);
  }
}

function installFixes() {
  installSettingsOverride();
  syncOpenedChatProfile();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installFixes, { once: true });
else installFixes();

const observer = new MutationObserver(() => installFixes());
observer.observe(document.body, { childList: true, subtree: true });

if (auth && typeof onAuthStateChanged === 'function') onAuthStateChanged(auth, () => { syncProfile(); installFixes(); });

export { syncProfile, openFixedSettings };
