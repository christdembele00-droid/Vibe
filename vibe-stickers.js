import {
  auth,
  db,
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  onSnapshot
} from './firebase-client.js';

const STICKERS = [
  ['vibe-love','❤️','Love'],['vibe-laugh','😂','Rire'],['vibe-wow','😮','Wow'],['vibe-cry','😢','Triste'],
  ['vibe-angry','😤','Énervé'],['vibe-fire','🔥','Feu'],['vibe-ok','👌','OK'],['vibe-clap','👏','Bravo'],
  ['vibe-party','🥳','Fête'],['vibe-cool','😎','Cool'],['vibe-thanks','🙏','Merci'],['vibe-strong','💪','Force'],
  ['vibe-star','⭐','Étoile'],['vibe-rocket','🚀','Go'],['vibe-haha','🤣','Haha'],['vibe-kiss','😘','Bisou'],
  ['vibe-heart-eyes','😍','J’adore'],['vibe-thinking','🤔','Hmm'],['vibe-sleep','😴','Dodo'],['vibe-great','🎉','Super']
];

let currentStop = null;
let currentChatId = null;
let currentRecipient = '';
let observer = null;

function escapeHtml(value='') {
  return String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
}

function stickerSvg(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect x="5" y="5" width="170" height="170" rx="48" fill="#fff" stroke="#00a884" stroke-width="8"/><text x="90" y="116" text-anchor="middle" font-size="86">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function stickerUrl(id) {
  const sticker = STICKERS.find(item => item[0] === id);
  return sticker ? stickerSvg(sticker[1]) : '';
}

function injectComposer() {
  const composer = document.querySelector('.composer');
  if (!composer || document.getElementById('sticker-btn')) return;

  const button = document.createElement('button');
  button.className = 'composer-tool sticker-tool';
  button.id = 'sticker-btn';
  button.type = 'button';
  button.title = 'Stickers';
  button.setAttribute('aria-label','Stickers');
  button.textContent = '▣';

  const panel = document.createElement('div');
  panel.className = 'sticker-panel';
  panel.id = 'sticker-panel';
  panel.setAttribute('aria-label','Panneau de stickers');
  panel.innerHTML = `<div class="sticker-panel-head"><strong>Stickers</strong><button type="button" class="sticker-close" aria-label="Fermer">×</button></div><div class="sticker-grid">${STICKERS.map(([id,emoji,label]) => `<button type="button" class="sticker-item" data-sticker-id="${id}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><img src="${stickerUrl(id)}" alt="${escapeHtml(label)}"></button>`).join('')}</div>`;

  composer.insertBefore(button, composer.querySelector('input'));
  composer.parentElement?.appendChild(panel);

  button.addEventListener('click', event => {
    event.preventDefault();
    panel.classList.toggle('show');
  });
  panel.querySelector('.sticker-close')?.addEventListener('click', () => panel.classList.remove('show'));
  panel.querySelectorAll('[data-sticker-id]').forEach(item => item.addEventListener('click', async () => {
    await sendSticker(item.dataset.stickerId || 'vibe-love');
    panel.classList.remove('show');
  }));
}

async function resolveChatId() {
  const user = auth?.currentUser;
  if (!user || !db) return null;
  const title = document.querySelector('.chat-title-wrap strong')?.textContent?.trim() || currentRecipient;
  if (!title) return null;
  try {
    const snapshot = await getDocs(query(collection(db,'chats'), where('participantIds','array-contains',user.uid)));
    const matches = snapshot.docs.filter(item => String(item.data()?.name || '').trim() === title);
    if (!matches.length) return null;
    matches.sort((a,b) => (b.data()?.lastUpdated?.toMillis?.() || 0) - (a.data()?.lastUpdated?.toMillis?.() || 0));
    return matches[0].id;
  } catch (error) {
    console.error('[Vibe] Recherche du chat pour sticker:', error);
    return null;
  }
}

async function sendSticker(stickerId) {
  const user = auth?.currentUser;
  if (!user || !db) return;
  const sticker = STICKERS.find(item => item[0] === stickerId);
  if (!sticker) return;
  const chatId = currentChatId || await resolveChatId();
  if (!chatId) {
    document.getElementById('toast')?.setAttribute('value','Impossible de trouver cette discussion.');
    return;
  }
  currentChatId = chatId;
  try {
    await addDoc(collection(db,'chats',chatId,'messages'), {
      uid:user.uid,
      text:'',
      sticker:{id:sticker[0],label:sticker[2]},
      timestamp:serverTimestamp(),
      read:false,
      reactions:{}
    });
    await setDoc(doc(db,'chats',chatId), {
      lastMessage:`Sticker ${sticker[1]}`,
      lastUpdated:serverTimestamp()
    }, {merge:true});
  } catch (error) {
    console.error('[Vibe] Envoi sticker:',error);
    const toast=document.getElementById('toast');
    if(toast){toast.value='Envoi du sticker impossible.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2500);}
  }
}

function sortDocs(snapshot) {
  return snapshot.docs.slice().sort((a,b) => (a.data()?.timestamp?.toMillis?.() || 0) - (b.data()?.timestamp?.toMillis?.() || 0));
}

function decorateStickerMessages(snapshot) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const docs = sortDocs(snapshot);
  docs.forEach((item,index) => {
    const sticker = item.data()?.sticker;
    if (!sticker) return;
    const bubble = container.children[index];
    if (!bubble) return;
    const url = stickerUrl(sticker.id);
    if (!url) return;
    const time = bubble.querySelector('time')?.outerHTML || '';
    bubble.querySelectorAll('.message-text,.message-attachment,.sticker-message').forEach(node => node.remove());
    const image = document.createElement('img');
    image.className = 'sticker-message';
    image.src = url;
    image.alt = sticker.label || 'Sticker';
    image.loading = 'lazy';
    bubble.prepend(image);
    if (!bubble.querySelector('time') && time) bubble.insertAdjacentHTML('beforeend',time);
  });
}

async function watchCurrentChat() {
  currentStop?.();
  currentStop = null;
  currentChatId = await resolveChatId();
  if (!currentChatId || !db) return;
  currentStop = onSnapshot(collection(db,'chats',currentChatId,'messages'), snapshot => decorateStickerMessages(snapshot));
}

function install() {
  if (observer) return;
  observer = new MutationObserver(() => {
    const chat = document.querySelector('.chat-view');
    if (!chat) {
      currentStop?.(); currentStop = null; currentChatId = null;
      return;
    }
    injectComposer();
    const title = document.querySelector('.chat-title-wrap strong')?.textContent?.trim() || '';
    if (title && title !== currentRecipient) {
      currentRecipient = title;
      watchCurrentChat();
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  injectComposer();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
