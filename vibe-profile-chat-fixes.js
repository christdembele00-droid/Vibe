import { auth, db, doc, getDoc, setDoc, onAuthStateChanged } from './firebase-client.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char]));

let lastSyncedChatId = '';
let syncTimer = null;
let settingsOpening = false;

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
      photoURL: profile.photoURL || String(old.photoURL || '').trim(),
      email: profile.email,
      vibeId: old.vibeId || `vibe-${profile.uid.slice(-8).toLowerCase()}`,
      about: typeof old.about === 'string' ? old.about.slice(0, 180) : ''
    }, { merge: true });
  } catch (error) {
    console.warn('[Vibe] Synchronisation profil:', error);
  }
}

function replaceProfileAvatar(element, profile) {
  if (!element) return;
  const photoURL = String(profile?.photoURL || '').trim();
  const fallback = String(profile?.name || 'V').slice(0, 1).toUpperCase();
  element.innerHTML = '';
  element.style.overflow = 'hidden';
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';

  if (!photoURL) {
    element.textContent = fallback;
    return;
  }

  const image = document.createElement('img');
  image.src = photoURL;
  image.alt = 'Photo Google';
  image.referrerPolicy = 'no-referrer';
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.objectFit = 'cover';
  image.addEventListener('error', () => {
    image.remove();
    element.textContent = fallback;
  }, { once: true });
  element.appendChild(image);
}

async function openFixedSettings() {
  if (settingsOpening) return;
  const user = auth?.currentUser;
  if (!user || !db) return;
  const panel = document.getElementById('main-chat-panel');
  if (!panel) return;

  settingsOpening = true;
  try {
    const profile = currentGoogleProfile();
    let saved = {};
    try {
      const snapshot = await getDoc(doc(db, 'profiles', user.uid));
      if (snapshot.exists()) saved = snapshot.data();
    } catch (error) {
      console.warn('[Vibe] Lecture paramètres:', error);
    }

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
      const button = document.getElementById('vibe-save-settings');
      if (!button) return;
      button.disabled = true;
      try {
        await setDoc(doc(db, 'profiles', user.uid), {
          about,
          name: profile.name,
          displayName: profile.name,
          photoURL: profile.photoURL,
          email: profile.email
        }, { merge: true });
        button.textContent = 'Enregistré ✓';
        setTimeout(() => {
          const current = document.getElementById('vibe-save-settings');
          if (current) { current.textContent = 'Enregistrer'; current.disabled = false; }
        }, 1200);
      } catch (error) {
        console.error('[Vibe] Enregistrement paramètres:', error);
        button.disabled = false;
        const toast = document.getElementById('toast');
        if (toast) { toast.value = 'Impossible d’enregistrer les paramètres.'; toast.classList.add('show'); }
      }
    });
  } finally {
    settingsOpening = false;
  }
}

function installSettingsOverride() {
  const button = document.getElementById('btn-settings');
  if (!button || button.dataset.vibeFixedSettings === 'true') return;
  button.dataset.vibeFixedSettings = 'true';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openFixedSettings();
  }, true);
}

async function syncOpenedChatProfile() {
  if (settingsOpening) return;
  const view = document.querySelector('.chat-view');
  const active = document.querySelector('.chat-item.active');
  const user = auth?.currentUser;
  if (!view || !active || !db || !user) return;
  const chatId = active.dataset.chatId;
  if (!chatId || chatId === lastSyncedChatId) return;
  lastSyncedChatId = chatId;

  try {
    const chatSnapshot = await getDoc(doc(db, 'chats', chatId));
    if (!chatSnapshot.exists()) return;
    const chat = chatSnapshot.data();
    const ids = Array.isArray(chat.participantIds) ? chat.participantIds.map(String) : [];
    const otherUid = ids.find(uid => uid !== user.uid);
    if (!otherUid) return;

    let other = {};
    const userSnapshot = await getDoc(doc(db, 'users', otherUid));
    if (userSnapshot.exists()) other = userSnapshot.data();
    if (!other.photoURL || !other.name) {
      const profileSnapshot = await getDoc(doc(db, 'profiles', otherUid));
      if (profileSnapshot.exists()) other = { ...profileSnapshot.data(), ...other };
    }

    const name = other.name || other.displayName || chat.participantNames?.[otherUid] || chat.name || 'Utilisateur Vibe';
    const photoURL = other.photoURL || '';
    const title = view.querySelector('.chat-title-wrap strong');
    if (title && title.textContent !== name) title.textContent = name;
    const avatar = view.querySelector('.chat-header .chat-avatar');
    if (avatar && avatar.dataset.vibeProfileUid !== otherUid) {
      replaceProfileAvatar(avatar, { name, photoURL });
      avatar.dataset.vibeProfileUid = otherUid;
    }
  } catch (error) {
    console.warn('[Vibe] Profil discussion:', error);
  }
}

function scheduleChatSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncOpenedChatProfile(), 80);
}

function installFixes() {
  installSettingsOverride();
  scheduleChatSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installFixes, { once: true });
else installFixes();

const observer = new MutationObserver(() => {
  installSettingsOverride();
  if (!document.querySelector('.vibe-fixed-settings')) scheduleChatSync();
});
observer.observe(document.body, { childList: true, subtree: true });

if (auth && typeof onAuthStateChanged === 'function') {
  onAuthStateChanged(auth, () => {
    lastSyncedChatId = '';
    syncProfile();
    installFixes();
  });
}

export { syncProfile, openFixedSettings };
