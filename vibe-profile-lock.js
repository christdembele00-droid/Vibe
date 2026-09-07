// Verrouillage du nom et de la photo de profil dans les paramètres Vibe.
// Le nom et la photo restent ceux fournis par le compte Google.

function getGoogleUser() {
  return window.firebase?.auth?.currentUser || null;
}

function getGoogleProfile() {
  const user = getGoogleUser();
  return {
    name: String(user?.displayName || '').trim(),
    photoURL: String(user?.photoURL || '').trim()
  };
}

function renderGooglePhoto(element, name, photoURL) {
  if (!element) return;
  element.innerHTML = '';
  element.style.overflow = 'hidden';
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.title = 'Photo de profil gérée par votre compte Google.';

  if (!photoURL) {
    element.textContent = (name || 'V').slice(0, 1).toUpperCase();
    return;
  }

  const image = document.createElement('img');
  image.src = photoURL;
  image.alt = `Photo de profil Google de ${name || 'Utilisateur'}`;
  image.referrerPolicy = 'no-referrer';
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.objectFit = 'cover';
  image.addEventListener('error', () => {
    image.remove();
    element.textContent = (name || 'V').slice(0, 1).toUpperCase();
  }, { once: true });
  element.appendChild(image);
}

function lockProfileEditing() {
  const { name: googleName, photoURL: googlePhoto } = getGoogleProfile();

  const nameInput = document.getElementById('profile-name');
  if (nameInput) {
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

    // Dans les paramètres, toujours afficher la photo Google actuelle.
    if (element.id === 'settings-profile-avatar' || element.closest('.profile-card')) {
      renderGooglePhoto(element, googleName, googlePhoto);
    }
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
