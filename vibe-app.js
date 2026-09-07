import {
  auth, db, collection, doc, getDoc, setDoc, onSnapshot, serverTimestamp,
  onAuthStateChanged, ensureAnonymousAuth, firebaseConfigured, query, where
} from './firebase-client.js';
import { ouvrirDiscussion } from './vibe-chat.js';
import { initWhatsAppNavigation } from './whatsapp-extra-features.js';
import { ensureVibeProfile } from './vibe-direct-chat.js';

const fallbackChats = [{ id: 'general', name: 'Discussion générale', lastMessage: 'Bienvenue sur Vibe', type: 'general' }];
const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));
const list = document.getElementById('chats-list-container');
const search = document.getElementById('search-chat');
const status = document.getElementById('connection-status');
const shell = document.getElementById('app-shell');
const toastElement = document.getElementById('toast');
const SEARCH_STORAGE_KEY = 'vibe-chat-search';

let allChats = [...fallbackChats];
let currentUser = null;
let stopChats = null;
let toastTimer = null;
let favoriteChatIds = new Set();

function showToast(message) {
  if (!toastElement) return;
  toastElement.value = message;
  toastElement.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove('show'), 2400);
}

function sortChats(items) {
  return [...items].sort((a, b) => {
    const favoriteDiff = Number(favoriteChatIds.has(b.id)) - Number(favoriteChatIds.has(a.id));
    if (favoriteDiff) return favoriteDiff;
    return (b.lastUpdated?.toMillis?.() ?? 0) - (a.lastUpdated?.toMillis?.() ?? 0);
  });
}

function isFavorite(chatId) { return favoriteChatIds.has(chatId); }

async function toggleFavorite(chat, event) {
  event?.stopPropagation();
  if (!currentUser || !db) { showToast('Connectez-vous pour gérer les favoris.'); return; }
  const nextValue = !isFavorite(chat.id);
  const previous = new Set(favoriteChatIds);
  if (nextValue) favoriteChatIds.add(chat.id); else favoriteChatIds.delete(chat.id);
  allChats = sortChats(allChats);
  render(allChats);
  try {
    await setDoc(doc(db, 'userFavorites', currentUser.uid), { [chat.id]: nextValue, updatedAt: serverTimestamp() }, { merge: true });
    showToast(nextValue ? 'Discussion ajoutée aux favoris.' : 'Discussion retirée des favoris.');
  } catch (error) {
    favoriteChatIds = previous;
    allChats = sortChats(allChats);
    render(allChats);
    console.error('[Vibe] Favori:', error);
    showToast('Impossible de modifier le favori.');
  }
}

async function loadFavorites(user) {
  favoriteChatIds = new Set();
  if (!db || !user) return;
  try {
    const snapshot = await getDoc(doc(db, 'userFavorites', user.uid));
    if (!snapshot.exists()) return;
    favoriteChatIds = new Set(Object.entries(snapshot.data() || {}).filter(([key, value]) => key !== 'updatedAt' && value === true).map(([key]) => key));
  } catch (error) { console.error('[Vibe] Favoris:', error); }
}

function getSearchTerm() {
  try { return localStorage.getItem(SEARCH_STORAGE_KEY) || ''; } catch { return ''; }
}

function saveSearchTerm(value) {
  try {
    if (value) localStorage.setItem(SEARCH_STORAGE_KEY, value);
    else localStorage.removeItem(SEARCH_STORAGE_KEY);
  } catch (error) { console.warn('[Vibe] Recherche locale:', error); }
}

function applySearch(term = '') {
  const normalized = String(term).toLowerCase().trim();
  document.querySelectorAll('.chat-item').forEach(item => {
    item.hidden = !item.textContent.toLowerCase().includes(normalized);
  });
}

function render(items = allChats) {
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<div class="empty-state">Aucune conversation.</div>'; return; }
  for (const item of sortChats(items)) {
    const name = item.name || 'Discussion Vibe';
    const favorite = isFavorite(item.id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-item';
    button.dataset.chatId = item.id;
    button.innerHTML = `<div class="chat-avatar">${escapeHtml(name.slice(0,1).toUpperCase())}</div><div class="chat-meta"><strong>${escapeHtml(name)}</strong><p>${escapeHtml(item.lastMessage || 'Appuyez pour commencer...')}</p></div><span class="chat-favorite" role="button" tabindex="0" title="${favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-label="${favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${favorite ? '★' : '☆'}</span>`;
    const favoriteButton = button.querySelector('.chat-favorite');
    favoriteButton?.addEventListener('click', event => toggleFavorite(item, event));
    favoriteButton?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleFavorite(item, event); }
    });
    button.addEventListener('click', () => {
      document.querySelectorAll('.chat-item.active').forEach(el => el.classList.remove('active'));
      button.classList.add('active');
      shell?.classList.add('chat-open');
      ouvrirDiscussion(item.id, name, () => shell?.classList.remove('chat-open'));
    });
    list.appendChild(button);
  }
  applySearch(search?.value || '');
}

async function ensureGeneralChat() {
  if (!db || !currentUser) return;
  const reference = doc(db, 'chats', 'general');
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    await setDoc(reference, {
      name: 'Discussion générale',
      lastMessage: 'Bienvenue sur Vibe',
      lastUpdated: serverTimestamp(),
      type: 'general'
    });
  }
}

function startChatsListener() {
  if (!db || !currentUser) return;
  stopChats?.();
  stopChats = null;

  const privateChatsQuery = query(
    collection(db, 'chats'),
    where('participantIds', 'array-contains', currentUser.uid)
  );

  const stopPrivateChats = onSnapshot(privateChatsQuery, snapshot => {
    const privateChats = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.id !== 'general');

    const general = allChats.find(item => item.id === 'general') || fallbackChats[0];
    allChats = [general, ...privateChats];
    render(allChats);
  }, error => {
    console.error('[Vibe] Conversations privées:', error);
    allChats = [allChats.find(item => item.id === 'general') || fallbackChats[0]];
    render(allChats);
  });

  const stopGeneral = onSnapshot(doc(db, 'chats', 'general'), snapshot => {
    const general = snapshot.exists()
      ? { id: snapshot.id, ...snapshot.data() }
      : fallbackChats[0];
    const privateChats = allChats.filter(item => item.id !== 'general');
    allChats = [general, ...privateChats];
    render(allChats);
  }, error => console.error('[Vibe] Discussion générale:', error));

  stopChats = () => {
    stopPrivateChats?.();
    stopGeneral?.();
  };
}

async function loadCurrentProfile(user) {
  if (!db || !user) return;
  try {
    const profile = await ensureVibeProfile();
    const name = profile?.name || 'Vibe';
    const avatar = document.getElementById('current-user-avatar');
    const userName = document.getElementById('current-user-name');
    if (avatar) avatar.textContent = name.slice(0, 1).toUpperCase();
    if (userName) userName.textContent = name;
  } catch (error) { console.error('[Vibe] Profil initial:', error); }
}

if (search) {
  search.value = getSearchTerm();
  search.addEventListener('input', event => { saveSearchTerm(event.target.value); applySearch(event.target.value); });
}

render();

if (!firebaseConfigured || !auth || !db) {
  if (status) status.textContent = 'Firebase non configuré';
} else {
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    stopChats?.();
    stopChats = null;
    if (!user) { if (status) status.textContent = 'connexion...'; return; }
    if (status) status.textContent = 'connecté';
    initWhatsAppNavigation();
    await loadCurrentProfile(user);
    await loadFavorites(user);
    render(allChats);
    try { await ensureGeneralChat(); startChatsListener(); }
    catch (error) { console.error('[Vibe] Firestore après authentification:', error); if (status) status.textContent = 'Firestore refusé'; }
  });
  ensureAnonymousAuth().catch(error => {
    console.error('[Vibe] Authentification:', error);
    if (status) status.textContent = 'Authentification refusée';
    showToast('Vérifiez que la connexion anonyme Firebase est activée.');
  });
}

document.addEventListener('vibe:close-chat', () => shell?.classList.remove('chat-open'));
