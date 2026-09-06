const $ = (id) => document.getElementById(id);

function ensureStylesheet() {
  if (document.querySelector('link[data-vibe-polish]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './vibe-polish.css?v=20260906';
  link.dataset.vibePolish = 'true';
  document.head.appendChild(link);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function enhanceMessages() {
  const container = $('messages');
  if (!container) return;
  container.querySelectorAll('.message').forEach((message) => {
    if (message.querySelector('.message-time')) return;
    const bubble = message.querySelector('.message-bubble');
    if (!bubble) return;
    const time = formatTime(message.dataset.createdAt);
    if (!time) return;
    const label = document.createElement('span');
    label.className = 'message-time';
    label.textContent = time;
    bubble.insertAdjacentElement('afterend', label);
  });
}

function enhanceSendButton() {
  const form = $('messageForm');
  const button = form?.querySelector('.send-btn');
  if (!form || !button || form.dataset.vibePolishBound) return;
  form.dataset.vibePolishBound = 'true';
  form.addEventListener('submit', () => {
    button.classList.remove('vibe-send-pop');
    requestAnimationFrame(() => button.classList.add('vibe-send-pop'));
    setTimeout(() => button.classList.remove('vibe-send-pop'), 320);
  });
}

function updatePlatformShortcut() {
  const kbd = document.querySelector('.search-box kbd');
  if (kbd && !navigator.platform.toLowerCase().includes('mac')) kbd.textContent = 'Ctrl K';
}

function init() {
  ensureStylesheet();
  // La recherche est gérée exclusivement par vibe-enhancements.js pour éviter
  // qu'un filtre DOM concurrent ne masque les résultats Firebase.
  enhanceSendButton();
  updatePlatformShortcut();
  enhanceMessages();
  const messages = $('messages');
  if (messages) new MutationObserver(enhanceMessages).observe(messages, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
