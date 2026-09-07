// Verrouillage du nom et de la photo de profil dans les paramètres Vibe.
// Le nom et la photo restent ceux fournis par le compte Google.

function getGoogleProfileName() {
  return String(window.firebase?.auth?.currentUser?.displayName || '').trim();
}

function lockProfileEditing() {
  const nameInput = document.getElementById('profile-name');
  if (nameInput) {
    const googleName = getGoogleProfileName();
    if (googleName) nameInput.value = googleName;
    nameInput.readOnly = true;
    nameInput.disabled = false;
    nameInput.setAttribute('aria-readonly', 'true');
    nameInput.title = 'Le nom est géré par votre compte Google.';
  }

  const photoSelectors = [
    '#profile-photo',
    '#profile-photo-input',
    'input[type="file"][accept*="image"]',
    '[data-profile-photo-edit]',
    '[data-action="change-profile-photo"]'
  ];

  document.querySelectorAll(photoSelectors.join(',')).forEach(element => {
    element.disabled = true;
    element.setAttribute('aria-disabled', 'true');
    element.title = 'La photo de profil est gérée par votre compte Google.';
  });

  document.querySelectorAll('.profile-avatar, [data-profile-avatar]').forEach(element => {
    element.style.cursor = 'default';
    element.removeAttribute('role');
    element.removeAttribute('tabindex');
    element.removeAttribute('onclick');
  });
}

function installProfileLock() {
  lockProfileEditing();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installProfileLock, { once: true });
} else {
  installProfileLock();
}

const observer = new MutationObserver(() => lockProfileEditing());
observer.observe(document.body, { childList: true, subtree: true });

export { lockProfileEditing };
