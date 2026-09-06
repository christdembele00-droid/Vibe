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
// Tous les imports locaux utilisent maintenant exactement la même URL de
// module : cela évite de réévaluer firebase-client.js à cause de ?v=... et
// donc de créer plusieurs instances ES/Firebase inutilement.
await loadModule('Firebase', './firebase-client.js');
await loadModule('authentification', './auth-ui.js');
await loadModule('messagerie', './app.js');

// vibe-fixes.js contenait encore un ancien gestionnaire global du sélecteur
// de fichiers (DataURL 750 Ko) qui interceptait les nouveaux gestionnaires
// Firebase Storage de whatsapp-extras.js. Il n'est plus chargé au démarrage.
await loadModule('utilisateurs actifs', './active-users.js');
await loadModule('paramètres', './vibe-settings.js');
await loadModule('appels', './webrtc-calls.js');
await loadModule('fonctionnalités', './vibe-features.js');
await loadModule('interface', './vibe-polish.js');
await loadModule('menu', './whatsapp-menu.js');
await loadModule('actions des messages', './whatsapp-message-actions.js');
await loadModule('médias et statuts', './whatsapp-extras.js');
