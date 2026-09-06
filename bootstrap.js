const showBootError = (error) => {
  console.error('[Vibe] Initialisation impossible:', error);
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = 'Vibe n’a pas pu charger un module. Rechargez la page.';
    toast.classList.add('show');
  }
};

try {
  await import('./firebase-client.js?v=20260906');
  await import('./auth-ui.js?v=20260906');
  await import('./app.js?v=20260906');
  await import('./vibe-fixes.js?v=20260906');
  await import('./active-users.js?v=20260906');
  await import('./vibe-settings.js?v=20260906');
  await import('./webrtc-calls.js?v=20260906');
  await import('./vibe-features.js?v=20260906');
  await import('./vibe-polish.js?v=20260906');
  await import('./whatsapp-navigation.js?v=20260906');
  await import('./whatsapp-message-actions.js?v=20260906');
  await import('./whatsapp-extra-features.js?v=20260906');
} catch (error) {
  showBootError(error);
}
