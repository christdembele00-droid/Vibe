import { db } from './firebase-client.js';

const $ = (id) => document.getElementById(id);

function ensureConnectionIndicator() {
  const header = document.querySelector('.inbox-title-row');
  if (!header || $('vibeConnectionStatus')) return;
  const el = document.createElement('span');
  el.id = 'vibeConnectionStatus';
  el.className = 'connection-status online';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<i aria-hidden="true"></i><span>En ligne</span>';
  el.title = 'Connexion active';
  header.appendChild(el);
}

function setConnectionStatus(online, source = 'network') {
  const el = $('vibeConnectionStatus');
  if (!el) return;
  el.classList.toggle('online', online);
  el.classList.toggle('offline', !online);
  el.classList.toggle('syncing', source === 'syncing');
  const label = el.querySelector('span');
  if (label) label.textContent = source === 'syncing' ? 'Synchronisation…' : online ? 'En ligne' : 'Hors ligne';
  el.title = online ? 'Connexion active' : 'Connexion réseau indisponible';
}

function monitorBrowserConnection() {
  const update = () => setConnectionStatus(navigator.onLine, navigator.onLine ? 'network' : 'offline');
  window.addEventListener('online', update, { passive: true });
  window.addEventListener('offline', update, { passive: true });
  update();
}

function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const search = $('searchInput');
      search?.focus();
      search?.select();
      return;
    }
    if (event.key === 'Escape' && !typing) {
      const back = $('backBtn');
      if (back && !back.closest('.hidden')) back.click();
    }
  });
}

function bindMessageInput() {
  const input = $('messageInput');
  const form = $('messageForm');
  if (!input || !form) return;
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    form.requestSubmit();
  });
}

function init() {
  ensureConnectionIndicator();
  monitorBrowserConnection();
  bindKeyboardShortcuts();
  bindMessageInput();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
