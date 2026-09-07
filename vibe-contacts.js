import { auth, db, collection, addDoc, getDocs, query, where, onSnapshot, serverTimestamp } from './firebase-client.js';
import { ouvrirDiscussion } from './vibe-chat.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.value = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function injectContactStyles() {
  if (document.getElementById('vibe-contact-styles')) return;
  const style = document.createElement('style');
  style.id = 'vibe-contact-styles';
  style.textContent = `.vibe-contacts-search{padding:14px 12px;background:#f0f2f5;border-bottom:1px solid #e9edef}.vibe-contacts-search strong{display:block;margin:0 0 9px;color:#111b21;font-size:16px;font-weight:500}.vibe-contacts-search input{width:100%;height:40px;border:0;border-radius:9px;outline:0;padding:0 12px;background:#fff;color:#111b21;box-shadow:0 1px 1px rgba(0,0,0,.04)}.vibe-contacts-search input:focus{box-shadow:0 0 0 2px rgba(0,168,132,.16)}.vibe-contacts-results{min-height:0;overflow-y:auto;background:#fff}.vibe-contact-row{width:100%;display:flex;align-items:center;gap:13px;padding:12px 16px;text-align:left;border:0;border-bottom:1px solid #f0f2f5;background:#fff;transition:background .12s ease}.vibe-contact-row:hover,.vibe-contact-row:focus-visible{background:#f5f6f6}.vibe-contact-row:focus-visible{outline:2px solid #00a884;outline-offset:-2px}.vibe-contact-avatar{width:48px;height:48px;flex:0 0 48px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#00a884;color:#fff;font-size:17px;font-weight:600}.vibe-contact-avatar img{width:100%;height:100%;display:block;object-fit:cover}.vibe-contact-main{min-width:0;display:block}.vibe-contact-main strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111b21;font-size:15px;font-weight:500}`;
  document.head.appendChild(style);
}

async function demarrerOuTrouverDiscussion(targetUid, targetName) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db || !targetUid || targetUid === uid) return null;
  const existing = await getDocs(query(collection(db, 'chats'), where('participantIds', 'array-contains', uid)));
  const found = existing.docs.find(item => {
    const data = item.data();
    return data.type === 'private' && Array.isArray(data.participantIds) && data.participantIds.length === 2 && data.participantIds.includes(targetUid);
  });
  if (found) return found.id;
  const chatRef = await addDoc(collection(db, 'chats'), { name: targetName, ownerId: uid, participantIds: [uid, targetUid], createdAt: serverTimestamp(), lastUpdated: serverTimestamp(), type: 'private' });
  return chatRef.id;
}

let stopUsersListener = null;
let latestUsers = [];
let latestFilter = '';

function renderUsers(users) {
  const resultsContainer = document.getElementById('users-results-list');
  if (!resultsContainer) return;
  const filter = latestFilter;
  const filtered = users
    .filter(user => user.uid && user.uid !== auth?.currentUser?.uid)
    .filter(user => !filter || `${user.name || user.displayName || ''}`.toLowerCase().includes(filter));

  if (!filtered.length) {
    resultsContainer.innerHTML = '<div class="empty-state">Aucun utilisateur trouvé.</div>';
    return;
  }

  resultsContainer.innerHTML = '';
  for (const user of filtered) {
    const name = user.name || user.displayName || 'Utilisateur Vibe';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vibe-contact-row';
    button.dataset.uid = user.uid;

    const avatar = document.createElement('span');
    avatar.className = 'vibe-contact-avatar';
    if (user.photoURL) {
      const image = document.createElement('img');
      image.src = user.photoURL;
      image.alt = '';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        image.remove();
        avatar.textContent = name.substring(0, 2).toUpperCase();
      });
      avatar.appendChild(image);
    } else {
      avatar.textContent = name.substring(0, 2).toUpperCase();
    }

    const info = document.createElement('span');
    info.className = 'vibe-contact-main';
    info.innerHTML = `<strong>${escapeHtml(name)}</strong>`;

    button.appendChild(avatar);
    button.appendChild(info);

    button.addEventListener('click', async () => {
      try {
        const chatId = await demarrerOuTrouverDiscussion(user.uid, name);
        if (chatId) ouvrirDiscussion(chatId, name);
      } catch (error) {
        console.error('[Vibe] Discussion contact:', error);
        showToast('Impossible d’ouvrir cette discussion.');
      }
    });
    resultsContainer.appendChild(button);
  }
}

function demarrerEcoutePresence() {
  stopUsersListener?.();
  stopUsersListener = null;
  if (!db || !auth?.currentUser) return;
  stopUsersListener = onSnapshot(collection(db, 'users'), snapshot => {
    latestUsers = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    latestUsers.sort((a, b) => String(a.name || a.displayName || '').localeCompare(String(b.name || b.displayName || ''), 'fr'));
    renderUsers(latestUsers);
  }, error => {
    console.error('[Vibe] Présence contacts:', error);
    showToast('Impossible de mettre à jour les utilisateurs.');
  });
}

function chargerUtilisateurs(filtreRecherche = '') {
  latestFilter = String(filtreRecherche).toLowerCase().trim();
  renderUsers(latestUsers);
}

export function afficherFenetreRechercheUtilisateurs(containerId = 'chats-list-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectContactStyles();
  container.innerHTML = `<div class="vibe-contacts-search"><strong>Nouvelle discussion</strong><input type="search" id="search-user-input" placeholder="Rechercher par nom..." autocomplete="off"></div><div id="users-results-list" class="vibe-contacts-results"><div class="empty-state">Chargement des utilisateurs...</div></div>`;
  const input = document.getElementById('search-user-input');
  input?.addEventListener('input', event => chargerUtilisateurs(event.target.value));
  latestUsers = [];
  latestFilter = '';
  demarrerEcoutePresence();
  input?.focus();
}

export { demarrerOuTrouverDiscussion };
window.VibeContacts = { afficherFenetreRechercheUtilisateurs };