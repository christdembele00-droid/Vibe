import { auth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, googleProvider, githubProvider } from './firebase-client.js';
import { updateProfile, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const $ = selector => document.querySelector(selector);
let modal = null;

function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.hidden = true;
  modal.innerHTML = `<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <button class="glass-btn auth-close" id="authClose" type="button" aria-label="Fermer">×</button>
    <h2 id="authTitle">Connexion à Vibe</h2>
    <p id="authCopy">Connectez-vous pour synchroniser vos discussions.</p>
    <div class="auth-actions">
      <button type="button" id="googleLogin">Continuer avec Google</button>
      <button type="button" id="githubLogin">Continuer avec GitHub</button>
      <button type="button" id="logoutBtn" hidden>Se déconnecter</button>
    </div>
    <div class="auth-error" id="authError" role="alert" aria-live="polite"></div>
  </div>`;
  document.body.appendChild(modal);
  $('#authClose').addEventListener('click', closeLogin);
  modal.addEventListener('click', e => { if (e.target === modal) closeLogin(); });
  $('#googleLogin').addEventListener('click', () => login(googleProvider));
  $('#githubLogin').addEventListener('click', () => login(githubProvider));
  $('#logoutBtn').addEventListener('click', async () => { try { await signOut(auth); closeLogin(); } catch (e) { showError(e); } });
  return modal;
}

function showError(error) {
  const el = $('#authError');
  if (!el) return;
  const code = error?.code || '';
  const messages = {
    'auth/popup-closed-by-user': 'La fenêtre de connexion a été fermée.',
    'auth/popup-blocked': 'La fenêtre de connexion a été bloquée par le navigateur.',
    'auth/account-exists-with-different-credential': 'Ce compte existe déjà avec un autre mode de connexion.',
    'auth/unauthorized-domain': 'Ce domaine doit être autorisé dans Firebase Authentication.',
    'auth/operation-not-allowed': 'Ce fournisseur de connexion n’est pas activé dans Firebase.',
    'auth/network-request-failed': 'Connexion réseau impossible. Vérifiez Internet puis réessayez.'
  };
  el.textContent = messages[code] || error?.message || 'Connexion impossible.';
}

async function login(provider) {
  $('#authError').textContent = '';
  try {
    await signInWithPopup(auth, provider);
    closeLogin();
  } catch (error) {
    // Certains navigateurs bloquent les popups : le redirect est le fallback.
    if (error?.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return;
    }
    showError(error);
  }
}

function openLogin() {
  const m = ensureModal();
  const user = auth.currentUser;
  m.hidden = false;
  $('#googleLogin').hidden = !!user;
  $('#githubLogin').hidden = !!user;
  $('#logoutBtn').hidden = !user;
  $('#authTitle').textContent = user ? 'Mon compte Vibe' : 'Connexion à Vibe';
  $('#authCopy').textContent = user ? (user.displayName || user.email || 'Compte connecté') : 'Connectez-vous pour synchroniser vos discussions.';
  $('#authError').textContent = '';
}

function closeLogin() { if (modal) modal.hidden = true; }

onAuthStateChanged(auth, user => {
  const profileName = document.querySelector('.profile-copy strong');
  const profileCopy = document.querySelector('.profile-copy span');
  const avatar = document.querySelector('.avatar-user');
  if (!user) {
    if (profileName) profileName.textContent = 'Mon profil';
    if (profileCopy) profileCopy.textContent = 'Se connecter';
    if (avatar) avatar.textContent = 'V';
    return;
  }
  if (profileName) profileName.textContent = user.displayName || user.email || 'Mon profil';
  if (profileCopy) profileCopy.textContent = 'Connecté';
  if (avatar) avatar.textContent = (user.displayName || user.email || 'V').trim().charAt(0).toUpperCase();
});

document.addEventListener('DOMContentLoaded', () => {
  const profileButton = $('#profileBtn');
  if (profileButton) profileButton.addEventListener('click', openLogin);
});

// Termine proprement un éventuel flux redirect démarré précédemment.
getRedirectResult(auth).catch(error => showError(error));

export { openLogin, closeLogin };
