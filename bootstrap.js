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
    await import(path);
    return true;
  } catch (error) {
    showBootError(label, error);
    return false;
  }
};

// Le cœur est chargé en premier. Les modules optionnels restent isolés afin
// qu'une erreur secondaire ne bloque jamais les autres fonctionnalités.
await loadModule('Firebase', './firebase-client.js?v=20260906');
await loadModule('authentification', './auth-ui.js?v=20260906');
await loadModule('messagerie', './app.js?v=20260906');

// vibe-fixes.js contenait encore un ancien gestionnaire global du sélecteur
// de fichiers (DataURL 750 Ko) qui interceptait les nouveaux gestionnaires
// Firebase Storage de whatsapp-extras.js. Il n'est plus chargé au démarrage.
await loadModule('utilisateurs actifs', './active-users.js?v=20260906');
await loadModule('paramètres', './vibe-settings.js?v=20260906');
await loadModule('appels', './webrtc-calls.js?v=20260906');
await loadModule('fonctionnalités', './vibe-features.js?v=20260906');
await loadModule('interface', './vibe-polish.js?v=20260906');
await loadModule('navigation', './whatsapp-navigation.js?v=20260906');
await loadModule('actions des messages', './whatsapp-message-actions.js?v=20260906');
await loadModule('médias et statuts', './whatsapp-extras.js?v=20260906');
