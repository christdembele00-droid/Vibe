const VERSION = '20260906r14';

const showBootError = (label, error) => {
  console.error(`[Vibe] ${label} impossible à charger:`, error);
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = `Vibe n’a pas pu charger ${label}.`;
    toast.classList.add('show');
  }
};

const loadModule = async (label, path) => {
  try {
    await import(`${path}?v=${VERSION}`);
  } catch (error) {
    showBootError(label, error);
  }
};

// Modules réellement présents et nécessaires au fonctionnement de Vibe.
await loadModule('Firebase', './firebase-client.js');
await loadModule('authentification', './auth-ui.js');
await loadModule('messagerie', './app.js');
await loadModule('utilisateurs actifs', './active-users.js');
await loadModule('paramètres', './vibe-settings.js');
await loadModule('profil', './vibe-profile.js');
await loadModule('appels', './webrtc-calls.js');
await loadModule('fonctionnalités', './vibe-features.js');
await loadModule('médias et chaînes', './vibe-media-channels.js');
await loadModule('discussions privées', './vibe-direct-chat.js');
await loadModule('actions des messages', './whatsapp-message-actions.js');
