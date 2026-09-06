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

// Un seul module actif par responsabilité : le cœur Firebase/messagerie est
// chargé avant les modules UI et les enrichissements qui dépendent de lui.
await loadModule('Firebase', './firebase-client.js');
await loadModule('authentification', './auth-ui.js');
await loadModule('messagerie', './app.js');
await loadModule('utilisateurs actifs', './active-users.js');
await loadModule('paramètres', './vibe-settings.js');
await loadModule('appels', './webrtc-calls.js');
await loadModule('fonctionnalités', './vibe-features.js');
await loadModule('interface', './vibe-polish.js');
await loadModule('menu', './whatsapp-menu.js');
await loadModule('actions des messages', './whatsapp-message-actions.js');
await loadModule('médias', './media-extras.js');
await loadModule('recherche et améliorations', './vibe-enhancements.js');
await loadModule('navigation', './vibe-right-pane.js');
