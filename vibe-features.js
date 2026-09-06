import { db } from './firebase-client.js';
import { disableNetwork, enableNetwork } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const $ = (id) => document.getElementById(id);

function ensureConnectionIndicator() {
  const header = document.querySelector('.side-header');
  if (!header || $('vibeConnectionStatus')) return;
  const el = document.createElement('span');
  el.id = 'vibeConnectionStatus';
  el.className = 'connection-status online';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<i aria-hidden="true"></i><span>En ligne</span>';
  header.insertBefore(el, header.querySelector('.header-actions'));
}

function setConnectionStatus(online, source = 'network') {
  const el = $('vibeConnectionStatus');
  if (!el) return;
  el.classList.toggle('online', online);
  el.classList.toggle('offline', !online);
  el.classList.toggle('syncing', source === 'syncing');
  const label = el.querySelector('span');
  if (label) label.textContent = source === 'syncing' ? 'Synchronisation…' : online ? 'En ligne' : 'Hors ligne';
  el.title = online ? 'Connexion active' : 'Mode hors connexion — les changements seront synchronisés au retour du réseau';
}

async function syncFirestoreNetwork() {
  try {
    if (navigator.onLine) {
      setConnectionStatus(true, 'syncing');
      await enableNetwork(db);
      setConnectionStatus(true);
    } else {
      await disableNetwork(db);
      setConnectionStatus(false);
    }
  } catch (error) {
    console.warn('[Vibe] réseau Firestore:', error);
    setConnectionStatus(navigator.onLine);
  }
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
  setConnectionStatus(navigator.onLine);
  window.addEventListener('online', syncFirestoreNetwork, { passive: true });
  window.addEventListener('offline', syncFirestoreNetwork, { passive: true });
  bindKeyboardShortcuts();
  bindMessageInput();
  void syncFirestoreNetwork();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
