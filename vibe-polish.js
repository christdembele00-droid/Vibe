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

function enhanceSearch() {
  const input = $('searchInput');
  const list = $('conversationList');
  if (!input || !list || input.dataset.vibePolishBound) return;
  input.dataset.vibePolishBound = 'true';
  const filter = () => {
    const term = input.value.trim().toLocaleLowerCase('fr-FR');
    let visible = 0;
    list.querySelectorAll('.conversation-item').forEach((item) => {
      const match = !term || item.textContent.toLocaleLowerCase('fr-FR').includes(term);
      item.hidden = !match;
      if (match) visible += 1;
    });
    let empty = list.querySelector('.vibe-empty-search');
    if (term && visible === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'vibe-empty-search';
        empty.textContent = 'Aucune discussion trouvée';
        list.appendChild(empty);
      }
    } else empty?.remove();
  };
  input.addEventListener('input', filter, { passive: true });
  new MutationObserver(filter).observe(list, { childList: true });
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
  enhanceSearch();
  enhanceSendButton();
  updatePlatformShortcut();
  enhanceMessages();
  const messages = $('messages');
  if (messages) new MutationObserver(enhanceMessages).observe(messages, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
