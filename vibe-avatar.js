// Avatars Vibe : couleur stable + initiales à partir du nom.
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
  div.title = value || 'Vibe';
  return div;
}

export function appliquerAvatarPersonnalise(element, nom, options = {}) {
  if (!element) return;
  const avatar = creerAvatarPersonnalise(nom, options);
  element.replaceWith(avatar);
}
