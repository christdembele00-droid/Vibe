import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';

const app = getApps()[0];
const auth = getAuth(app);
const $ = id => document.getElementById(id);

const notify = text => {
  const el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(window.__vibeActionToast);
  window.__vibeActionToast = setTimeout(() => { el.style.display = 'none'; }, 2800);
};

function bindActions() {
  const settings = $('railSettings');
  const profile = $('railProfile');
  const profileButton = $('profile');
  const communities = $('railCommunities');

  if (settings) settings.setAttribute('aria-label', 'Paramètres VIBE');
  if (profile) profile.setAttribute('aria-label', 'Mon profil VIBE');
  if (profileButton) profileButton.setAttribute('aria-label', 'Mon profil VIBE');
  if (communities) communities.setAttribute('aria-label', 'Communautés VIBE');

  document.addEventListener('click', event => {
    const target = event.target.closest?.('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'close') {
      const modal = $('modal');
      if (modal?.open) modal.close();
      document.getElementById('vibeSettingsModal')?.remove();
    }
  });
}

onAuthStateChanged(auth, user => {
  window.VIBE_ACTION_USER = user || null;
  if (user) bindActions();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindActions, { once: true });
} else {
  bindActions();
}

window.VIBE_ACTIONS_READY = true;
window.VIBE_ACTION_NOTIFY = notify;
