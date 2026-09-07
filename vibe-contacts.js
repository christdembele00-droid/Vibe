import { auth, db, collection, doc, addDoc, getDocs, query, where, serverTimestamp } from './firebase-client.js';
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
  style.textContent = `.vibe-contacts-search{padding:14px 12px;background:#f0f2f5;border-bottom:1px solid #e9edef}.vibe-contacts-search strong{display:block;margin:0 0 9px;color:#111b21;font-size:16px;font-weight:500}.vibe-contacts-search input{width:100%;height:40px;border:0;border-radius:9px;outline:0;padding:0 12px;background:#fff;color:#111b21;box-shadow:0 1px 1px rgba(0,0,0,.04)}.vibe-contacts-search input:focus{box-shadow:0 0 0 2px rgba(0,168,132,.16)}.vibe-contacts-results{min-height:0;overflow-y:auto;background:#fff}.vibe-contact-row{width:100%;display:flex;align-items:center;gap:13px;padding:12px 16px;text-align:left;border-bottom:1px solid #f0f2f5;background:#fff;transition:background .12s ease}.vibe-contact-row:hover,.vibe-contact-row:focus-visible{background:#f5f6f6}.vibe-contact-row:focus-visible{outline:2px solid #00a884;outline-offset:-2px}.vibe-contact-avatar{width:46px;height:46px;flex:0 0 46px;display:grid;place-items:center;border-radius:50%;background:#00a884;color:#fff;font-weight:700}.vibe-contact-main{min-width:0;display:grid;gap:4px}.vibe-contact-main strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111b21;font-size:15px;font-weight:500}.vibe-contact-main small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#667781;font-size:12px}.vibe-contact-state.online{color:#00a884}`;
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

async function chargerUtilisateurs(filtreRecherche = '') {
  const resultsContainer = document.getElementById('users-results-list');
  if (!resultsContainer || !db || !auth?.currentUser) return;
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const filter = String(filtreRecherche).toLowerCase().trim();
    const users = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(user => user.uid && user.uid !== auth.currentUser.uid)
      .filter(user => !filter || `${user.name || ''} ${user.vibeId || ''}`.toLowerCase().includes(filter))
      .sort((a, b) => Number(b.online === true) - Number(a.online === true));

    if (!users.length) {
      resultsContainer.innerHTML = '<div class="empty-state">Aucun utilisateur trouvé.</div>';
      return;
    }

    resultsContainer.innerHTML = users.map(user => {
      const name = user.name || 'Utilisateur Vibe';
      const online = user.online === true;
      return `<button type="button" class="vibe-contact-row" data-uid="${escapeHtml(user.uid)}"><span class="vibe-contact-avatar">${escapeHtml(name.slice(0,1).toUpperCase())}</span><span class="vibe-contact-main"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(user.vibeId || 'Identifiant Vibe')} · <span class="vibe-contact-state ${online ? 'online' : ''}">${online ? 'En ligne' : 'Hors ligne'}</span></small></span></button>`;
    }).join('');

    resultsContainer.querySelectorAll('.vibe-contact-row').forEach(item => item.addEventListener('click', async () => {
      const target = users.find(user => user.uid === item.dataset.uid);
      if (!target) return;
      try {
        const chatId = await demarrerOuTrouverDiscussion(target.uid, target.name || 'Utilisateur Vibe');
        if (chatId) ouvrirDiscussion(chatId, target.name || 'Utilisateur Vibe');
      } catch (error) {
        console.error('[Vibe] Discussion contact:', error);
        showToast('Impossible d’ouvrir cette discussion.');
      }
    }));
  } catch (error) {
    console.error('[Vibe] Contacts:', error);
    resultsContainer.innerHTML = '<div class="empty-state">Erreur de chargement des contacts.</div>';
  }
}

export function afficherFenetreRechercheUtilisateurs(containerId = 'chats-list-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  injectContactStyles();
  container.innerHTML = `<div class="vibe-contacts-search"><strong>Nouvelle discussion</strong><input type="search" id="search-user-input" placeholder="Rechercher par nom ou identifiant Vibe..." autocomplete="off"></div><div id="users-results-list" class="vibe-contacts-results"><div class="empty-state">Chargement des contacts...</div></div>`;
  const input = document.getElementById('search-user-input');
  let timer = null;
  input?.addEventListener('input', event => { clearTimeout(timer); timer = setTimeout(() => chargerUtilisateurs(event.target.value), 120); });
  chargerUtilisateurs('');
  input?.focus();
}

export { demarrerOuTrouverDiscussion };
window.VibeContacts = { afficherFenetreRechercheUtilisateurs };
