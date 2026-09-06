const VERSION = '20260906r13';

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
    return true;
  } catch (error) {
    showBootError(label, error);
    return false;
  }
};

// Socle Firebase + authentification + messagerie
await loadModule('Firebase', './firebase-client.js');
await loadModule('authentification', './auth-ui.js');
await loadModule('messagerie', './app.js');
await loadModule('utilisateurs actifs', './active-users.js');

// Fonctions Vibe conservées
await loadModule('paramètres', './vibe-settings.js');
await loadModule('profil', './vibe-profile.js');
await loadModule('appels', './webrtc-calls.js');
await loadModule('fonctionnalités', './vibe-features.js');
await loadModule('médias et chaînes', './vibe-media-channels.js');
await loadModule('discussions privées', './vibe-direct-chat.js');
await loadModule('améliorations des fonctions', './vibe-function-improvements.js');
await loadModule('fonctionnalités avancées', './whatsapp-extra-features.js');
await loadModule('actions des messages', './whatsapp-message-actions.js');

// Contrôle final unique de l’interface et de la navigation.
await loadModule('interactions finales', './vibe-interaction-fix.js');
