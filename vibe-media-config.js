// Configuration du stockage média Vibe via Cloudinary.
// Créez un upload preset UNSIGNED dans Cloudinary puis renseignez ces deux valeurs.
// Ne mettez JAMAIS l'API Secret Cloudinary dans ce fichier.
export const VIBE_MEDIA_CONFIG = Object.freeze({
  cloudName: '',
  uploadPreset: '',
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  maxDocumentBytes: 450 * 1024
});
