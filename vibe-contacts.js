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

async function demarrerOuTrouverDiscussion(targetUid, targetName) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db || !targetUid || targetUid === uid) return null;

  const existing = await getDocs(query(collection(db, 'chats'), where('participantIds', 'array-contains', uid)));
  const found = existing.docs.find(item => {
    const data = item.data();
    return data.type === 'private' && Array.isArray(data.participantIds) && data.participantIds.length === 2 && data.participantIds.includes(targetUid);
  });
  if (found) return found.id;

  const chatRef = await addDoc(collection(db, 'chats'), {
    name: targetName,
    ownerId: uid,
    participantIds: [uid, targetUid],
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    type: 'private'
  });
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
      .filter(user => !filter || `${user.name || ''} ${user.vibeId || ''}`.toLowerCase().includes(filter));

    if (!users.length) {
      resultsContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#667781;">Aucun utilisateur trouvé.</div>';
      return;
    }

    resultsContainer.innerHTML = users.map(user => {
      const name = user.name || 'Utilisateur Vibe';
      const online = user.online === true;
      return `<button type="button" class="vibe-contact-row" data-uid="${escapeHtml(user.uid)}">
        <span class="vibe-contact-avatar">${escapeHtml(name.slice(0,1).toUpperCase())}</span>
        <span class="vibe-contact-main"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(user.vibeId || 'Identifiant Vibe')} · <span class="vibe-contact-state ${online ? 'online' : ''}">${online ? 'En ligne' : 'Hors ligne'}</span></small></span>
      </button>`;
    }).join('');

    resultsContainer.querySelectorAll('.vibe-contact-row').forEach(item => item.addEventListener('click', async () => {
      const targetUid = item.dataset.uid;
      const target = users.find(user => user.uid === targetUid);
      if (!target) return;
      try {
        const chatId = await demarrerOuTrouverDiscussion(targetUid, target.name || 'Utilisateur Vibe');
        if (chatId) ouvrirDiscussion(chatId, target.name || 'Utilisateur Vibe');
      } catch (error) {
        console.error('[Vibe] Discussion contact:', error);
        showToast('Impossible d’ouvrir cette discussion.');
      }
    }));
  } catch (error) {
    console.error('[Vibe] Contacts:', error);
    resultsContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#d00;">Erreur de chargement.</div>';
  }
}

export function afficherFenetreRechercheUtilisateurs(containerId = 'chats-list-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="vibe-contacts-search"><strong>Nouvelle discussion</strong><input type="search" id="search-user-input" placeholder="Rechercher par nom ou identifiant Vibe..." autocomplete="off"></div><div id="users-results-list" class="vibe-contacts-results"><div class="empty-state">Chargement des contacts...</div></div>`;
  const input = document.getElementById('search-user-input');
  let timer = null;
  input?.addEventListener('input', event => {
    clearTimeout(timer);
    timer = setTimeout(() => chargerUtilisateurs(event.target.value), 120);
  });
  chargerUtilisateurs('');
  input?.focus();
}

export { demarrerOuTrouverDiscussion };
window.VibeContacts = { afficherFenetreRechercheUtilisateurs };
