const DEFAULT_ANDROID_URL = 'https://github.com/christdembele00-droid/Vibe/releases';

function getAndroidDownloadUrl() {
  return window.VIBE_ANDROID_DOWNLOAD_URL || DEFAULT_ANDROID_URL;
}

export function downloadVibeAndroid() {
  const url = getAndroidDownloadUrl();
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function initVibeDownload() {
  const button = document.querySelector('#btn-download-vibe');
  if (!button || button.dataset.vibeDownloadBound === '1') return;
  button.dataset.vibeDownloadBound = '1';
  button.addEventListener('click', downloadVibeAndroid);
}

export default { downloadVibeAndroid, initVibeDownload };
