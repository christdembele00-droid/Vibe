const DEFAULT_ANDROID_URL = '';

function getAndroidDownloadUrl() {
  return window.VIBE_ANDROID_DOWNLOAD_URL || DEFAULT_ANDROID_URL;
}

export function downloadVibeAndroid() {
  const url = getAndroidDownloadUrl();
  if (!url) {
    window.alert('Le téléchargement Android sera disponible dès que l’APK Vibe sera publié.');
    return;
  }
  window.location.assign(url);
}

export function initVibeDownload() {
  const button = document.querySelector('#btn-download-vibe');
  if (!button || button.dataset.vibeDownloadBound === '1') return;
  button.dataset.vibeDownloadBound = '1';
  button.addEventListener('click', downloadVibeAndroid);
}

export default { downloadVibeAndroid, initVibeDownload };
