// Avatars Vibe : photo de profil Google si disponible, sinon initiales.
export function creerAvatarPersonnalise(nom, options = {}) {
  const value = String(nom || '').trim();
  const fallback = options.fallback || 'V';
  const initiales = value ? value.substring(0, 2).toUpperCase() : fallback;

  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  const couleurHex = `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
  const div = document.createElement('div');
  div.className = options.className || 'vibe-generated-avatar';
  div.style.backgroundColor = couleurHex;
  div.style.color = '#fff';
  div.textContent = initiales;
  div.setAttribute('aria-hidden', 'true');
  div.title = value || 'Utilisateur';
  return div;
}

export function creerAvatarDepuisProfil(profil = {}, options = {}) {
  const nom = String(profil?.name || profil?.displayName || 'Utilisateur').trim();
  const photoURL = String(profil?.photoURL || '').trim();

  if (!photoURL) return creerAvatarPersonnalise(nom, options);

  const wrapper = document.createElement('div');
  wrapper.className = options.className || 'user-avatar';
  wrapper.style.backgroundColor = '#dfe5e7';
  wrapper.style.overflow = 'hidden';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.title = nom || 'Utilisateur';
  wrapper.setAttribute('aria-label', nom || 'Utilisateur');

  const image = document.createElement('img');
  image.src = photoURL;
  image.alt = nom || 'Photo de profil';
  image.referrerPolicy = 'no-referrer';
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.objectFit = 'cover';

  image.addEventListener('error', () => {
    const fallback = creerAvatarPersonnalise(nom, options);
    fallback.title = nom || 'Utilisateur';
    wrapper.replaceWith(fallback);
  }, { once: true });

  wrapper.appendChild(image);
  return wrapper;
}

export function appliquerAvatarPersonnalise(element, nom, options = {}) {
  if (!element) return;
  const avatar = creerAvatarPersonnalise(nom, options);
  element.replaceWith(avatar);
}
