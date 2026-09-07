// Configuration du stockage média Vibe via Cloudinary.
// Uploads directs depuis le navigateur avec un preset UNSIGNED.
// Ne mettez JAMAIS l'API Secret Cloudinary dans ce fichier.
export const VIBE_MEDIA_CONFIG = Object.freeze({
  cloudName: 'bk4jm7px',
  uploadPreset: 'vibe-media',
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  maxDocumentBytes: 450 * 1024
});
