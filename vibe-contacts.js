import { auth, db, collection, doc, addDoc, getDocs, query, where, onSnapshot, serverTimestamp } from './firebase-client.js';
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
  style.textContent = `.vibe-contacts-search{padding:14px 12px;background:#f0f2f5;border-bottom:1px solid #e9edef}.vibe-contacts-search strong{display:block;margin:0 0 9px;color:#111b21;font-size:16px;font-weight:500}.vibe-contacts-search input{width:100%;height:40px;border:0;border-radius:9px;outline:0;padding:0 12px;background:#fff;color:#111b21;box-shadow:0 1px 1px rgba(0,0,0,.04)}.vibe-contacts-search input:focus{box-shadow:0 0 0 2px rgba(0,168,132,.16)}.vibe-contacts-results{min-height:0;overflow-y:auto;background:#fff}.vibe-contact-row{width:100%;display:flex;align-items:center;padding:14px 16px;text-align:left;border:0;border-bottom:1px solid #f0f2f5;background:#fff;transition:background .12s ease}.vibe-contact-row:hover,.vibe-contact-row:focus-visible{background:#f5f6f6}.vibe-contact-row:focus-visible{outline:2px solid #00a884;outline-offset:-2px}.vibe-contact-main{min-width:0;display:grid;gap:4px}.vibe-contact-main strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111b21;font-size:15px;font-weight:500}.vibe-contact-main small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#667781;font-size:12px}.vibe-contact-state.online{color:#00a884}`;
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
    .filter(user => !filter || `${user.vibeId || ''}`.toLowerCase().includes(filter));

  if (!filtered.length) {
    resultsContainer.innerHTML = '<div class="empty-state">Aucun utilisateur trouvé.</div>';
    return;
  }

  resultsContainer.innerHTML = '';
  for (const user of filtered) {
    const vibeId = user.vibeId || 'Identifiant Vibe';
    const online = user.online === true;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vibe-contact-row';
    button.dataset.uid = user.uid;

    const info = document.createElement('span');
    info.className = 'vibe-contact-main';
    info.innerHTML = `<strong>${escapeHtml(vibeId)}</strong><small><span class="vibe-contact-state ${online ? 'online' : ''}">${online ? '● En ligne' : 'Hors ligne'}</span></small>`;
    button.appendChild(info);

    button.addEventListener('click', async () => {
      try {
        const chatId = await demarrerOuTrouverDiscussion(user.uid, user.name || vibeId);
        if (chatId) ouvrirDiscussion(chatId, user.name || vibeId);
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
    latestUsers.sort((a, b) => Number(b.online === true) - Number(a.online === true) || String(a.vibeId || '').localeCompare(String(b.vibeId || ''), 'fr'));
    renderUsers(latestUsers);
  }, error => {
    console.error('[Vibe] Présence contacts:', error);
    showToast('Impossible de mettre à jour les statuts.');
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
  container.innerHTML = `<div class="vibe-contacts-search"><strong>Nouvelle discussion</strong><input type="search" id="search-user-input" placeholder="Rechercher par identifiant Vibe..." autocomplete="off"></div><div id="users-results-list" class="vibe-contacts-results"><div class="empty-state">Chargement des utilisateurs...</div></div>`;
  const input = document.getElementById('search-user-input');
  input?.addEventListener('input', event => chargerUtilisateurs(event.target.value));
  latestUsers = [];
  latestFilter = '';
  demarrerEcoutePresence();
  input?.focus();
}

export { demarrerOuTrouverDiscussion };
window.VibeContacts = { afficherFenetreRechercheUtilisateurs };
