const VERSION = '20260906q';

const showBootError = (label, error) => {
  console.error(`[Vibe] ${label} impossible à charger:`, error);
  const toast = document.getElementById('toast');
  if (toast) { toast.textContent = `Vibe n’a pas pu charger ${label}.`; toast.classList.add('show'); }
};
const loadModule = async (label, path) => { try { await import(`${path}?v=${VERSION}`); return true; } catch (error) { showBootError(label, error); return false; } };
await loadModule('Firebase', './firebase-client.js');
await loadModule('authentification', './auth-ui.js');
await loadModule('messagerie', './app.js');
await loadModule('utilisateurs actifs', './active-users.js');
await loadModule('paramètres', './vibe-settings.js');
await loadModule('profil', './vibe-profile.js');
await loadModule('messages riches', './vibe-rich-messages.js');
await loadModule('appels', './webrtc-calls.js');
await loadModule('fonctionnalités', './vibe-features.js');
await loadModule('interface', './vibe-polish.js');
await loadModule('thème Vibe 2026', './vibe-2026-theme.js');
await loadModule('menu', './whatsapp-menu.js');
await loadModule('médias et chaînes', './vibe-media-channels.js');
await loadModule('discussions privées', './vibe-direct-chat.js');
