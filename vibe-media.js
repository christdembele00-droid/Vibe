import {
  auth,
  db,
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from './firebase-client.js';
import { VIBE_MEDIA_CONFIG } from './vibe-media-config.js';

const CONFIG = VIBE_MEDIA_CONFIG;
const STYLE_ID = 'vibe-media-native-styles';
const MENU_ID = 'vibe-media-menu';
const MAX_STATUS_AGE = 24 * 60 * 60 * 1000;
let busy = false;

const esc = (value = '') => String(value).replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.value = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .vibe-media-menu{position:fixed;z-index:9999;display:none;min-width:210px;padding:7px;border-radius:14px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.18);border:1px solid #e9edef}
    .vibe-media-menu.show{display:grid;gap:3px}
    .vibe-media-menu button{border:0;background:#fff;border-radius:10px;padding:11px 13px;text-align:left;font-size:14px;cursor:pointer;color:#111b21}
    .vibe-media-menu button:hover{background:#f0f2f5}
    .vibe-media-preview{width:100%;max-height:360px;object-fit:cover;border-radius:10px;display:block;margin-top:7px}
    .vibe-media-video{width:100%;max-height:420px;border-radius:10px;display:block;margin-top:7px;background:#000}
    .vibe-media-meta{display:block;margin-top:5px;font-size:12px;color:#667781;word-break:break-word}
    .vibe-status-media,.vibe-channel-media{margin-top:8px}
    .vibe-media-composer{display:grid;gap:9px;margin-top:12px}
    .vibe-media-composer textarea{min-height:90px;resize:vertical}
    .vibe-media-composer input[type=file]{width:100%}
  `;
  document.head.appendChild(style);
}

function assertConfigured() {
  if (CONFIG.cloudName && CONFIG.uploadPreset) return true;
  toast('Stockage média non configuré : renseignez Cloudinary dans vibe-media-config.js.');
  return false;
}

function validateFile(file, mode = 'media') {
  if (!file) return false;
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const max = isImage ? CONFIG.maxImageBytes : isVideo ? CONFIG.maxVideoBytes : CONFIG.maxDocumentBytes;
  if (mode === 'media' && !isImage && !isVideo) {
    toast('Choisissez une photo ou une vidéo.');
    return false;
  }
  if (file.size > max) {
    const limit = Math.round(max / (1024 * 1024));
    toast(isImage ? `Photo trop volumineuse. Limite : ${limit} Mo.` : isVideo ? `Vidéo trop volumineuse. Limite : ${limit} Mo.` : 'Document trop volumineux. Limite : 450 Ko.');
    return false;
  }
  return true;
}

async function uploadToCloudinary(file) {
  if (!assertConfigured() || !validateFile(file)) return null;
  if (busy) return null;
  busy = true;
  try {
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CONFIG.cloudName)}/${resourceType}/upload`;
    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', CONFIG.uploadPreset);
    const response = await fetch(endpoint, { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.secure_url) throw new Error(data.error?.message || 'Upload Cloudinary impossible.');
    return {
      url: data.secure_url,
      name: file.name.slice(0, 180),
      type: file.type || (resourceType === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: file.size,
      width: Number(data.width || 0),
      height: Number(data.height || 0),
      duration: Number(data.duration || 0),
      resourceType,
      provider: 'cloudinary',
      publicId: data.public_id || ''
    };
  } catch (error) {
    console.error('[Vibe] Média Cloudinary:', error);
    toast(error.message || 'Impossible d’envoyer le média.');
    return null;
  } finally {
    busy = false;
  }
}

function createPicker(accept, onFile) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.hidden = true;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (file) await onFile(file);
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

function openMenu(anchor) {
  injectStyles();
  let menu = document.getElementById(MENU_ID);
  if (!menu) {
    menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.className = 'vibe-media-menu';
    menu.innerHTML = '<button type="button" data-media-action="photo">📷 Photo</button><button type="button" data-media-action="video">🎥 Vidéo</button><button type="button" data-media-action="document">📎 Document</button>';
    document.body.appendChild(menu);
    menu.addEventListener('click', async event => {
      const action = event.target.closest('[data-media-action]')?.dataset.mediaAction;
      if (!action) return;
      menu.classList.remove('show');
      if (action === 'photo') createPicker('image/*', file => handleChatMedia(file));
      if (action === 'video') createPicker('video/*', file => handleChatMedia(file));
      if (action === 'document') createPicker('.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx', file => handleChatDocument(file));
    });
  }
  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 225)}px`;
  menu.style.top = `${Math.max(8, rect.top - 145)}px`;
  menu.classList.toggle('show');
}

async function getOpenChat() {
  const user = auth?.currentUser;
  const title = document.querySelector('.chat-title-wrap strong')?.textContent?.trim();
  if (!user || !db || !title) return null;
  const snap = await getDocs(query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid)));
  const candidates = snap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(chat => chat.type === 'private' && Array.isArray(chat.participantIds) && chat.participantIds.length === 2)
    .filter(chat => String(chat.name || '').trim() === title || String(chat.participantNames?.[chat.participantIds.find(id => id !== user.uid)] || '').trim() === title)
    .sort((a,b) => (b.lastUpdated?.toMillis?.() || 0) - (a.lastUpdated?.toMillis?.() || 0));
  return candidates[0] || null;
}

async function handleChatMedia(file) {
  const chat = await getOpenChat();
  const user = auth?.currentUser;
  if (!chat || !user || !db) return toast('Impossible d’identifier la discussion ouverte.');
  const media = await uploadToCloudinary(file);
  if (!media) return;
  try {
    await addDoc(collection(db, 'chats', chat.id, 'messages'), { uid:user.uid, text:'', attachment:{ ...media, dataUrl:media.url }, read:false, timestamp:serverTimestamp() });
    await setDoc(doc(db, 'chats', chat.id), { name:chat.name, lastMessage:`${media.resourceType === 'video' ? '🎥' : '📷'} ${media.name}`, lastUpdated:serverTimestamp() }, { merge:true });
    toast(media.resourceType === 'video' ? 'Vidéo envoyée.' : 'Photo envoyée.');
  } catch (error) { console.error('[Vibe] Média discussion:', error); toast('Impossible d’enregistrer le média.'); }
}

async function handleChatDocument(file) {
  if (!file || file.size > CONFIG.maxDocumentBytes) return toast('Document trop volumineux. Limite : 450 Ko.');
  const chat = await getOpenChat();
  const user = auth?.currentUser;
  if (!chat || !user || !db) return toast('Impossible d’identifier la discussion ouverte.');
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const dataUrl = String(reader.result || '');
      await addDoc(collection(db, 'chats', chat.id, 'messages'), { uid:user.uid, text:'', attachment:{name:file.name.slice(0,180),type:file.type || 'application/octet-stream',size:file.size,dataUrl}, read:false, timestamp:serverTimestamp() });
      await setDoc(doc(db, 'chats', chat.id), { name:chat.name, lastMessage:`📎 ${file.name}`, lastUpdated:serverTimestamp() }, { merge:true });
      toast('Document envoyé.');
    } catch (error) { console.error('[Vibe] Document discussion:', error); toast('Impossible d’envoyer le document.'); }
  };
  reader.onerror = () => toast('Lecture du document impossible.');
  reader.readAsDataURL(file);
}

function mediaMarkup(media, className = '') {
  if (!media?.url) return '';
  const type = String(media.type || '');
  const safeUrl = esc(media.url);
  const name = esc(media.name || 'Média Vibe');
  if (type.startsWith('video/') || media.resourceType === 'video') return `<div class="${className}"><video class="vibe-media-video" controls preload="metadata" playsinline src="${safeUrl}"></video><span class="vibe-media-meta">${name}</span></div>`;
  return `<div class="${className}"><img class="vibe-media-preview" loading="lazy" src="${safeUrl}" alt="${name}"><span class="vibe-media-meta">${name}</span></div>`;
}

function upgradeRenderedMedia(root = document) {
  root.querySelectorAll('.message-attachment').forEach(node => {
    if (node.dataset.vibeMediaReady === 'true') return;
    const image = node.querySelector('img');
    const link = node.querySelector('a');
    const url = image?.getAttribute('src') || link?.getAttribute('href') || '';
    const type = image ? 'image/*' : '';
    if (!url) return;
    if (type || /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url)) {
      node.innerHTML = `<img class="vibe-media-preview" loading="lazy" src="${esc(url)}" alt="Média Vibe">`;
      node.dataset.vibeMediaReady = 'true';
    } else if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) {
      node.innerHTML = `<video class="vibe-media-video" controls preload="metadata" playsinline src="${esc(url)}"></video>`;
      node.dataset.vibeMediaReady = 'true';
    }
  });
  root.querySelectorAll('[data-media-url]').forEach(node => {
    if (node.dataset.vibeMediaReady === 'true') return;
    const url = node.dataset.mediaUrl;
    const type = node.dataset.mediaType || '';
    node.outerHTML = mediaMarkup({url,type,name:node.dataset.mediaName || 'Média Vibe'}, node.className || 'vibe-status-media');
  });
}

function observeMediaRendering() {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) for (const node of mutation.addedNodes) if (node.nodeType === 1) upgradeRenderedMedia(node);
  });
  observer.observe(document.body, { childList:true, subtree:true });
  upgradeRenderedMedia(document);
}

async function publishStatusWithMedia() {
  const user = auth?.currentUser;
  if (!user || !db) return toast('Connectez-vous pour publier un statut.');
  createPicker('image/*,video/*', async file => {
    const media = await uploadToCloudinary(file);
    if (!media) return;
    const text = String(window.prompt('Texte du statut (facultatif) :') || '').trim().slice(0,700);
    try {
      await addDoc(collection(db,'statuses'), { text, authorId:user.uid, authorName:user.displayName || 'Utilisateur Vibe', media, timestamp:serverTimestamp(), expiresAt:new Date(Date.now()+MAX_STATUS_AGE) });
      toast('Statut média publié pendant 24 h.');
    } catch (error) { console.error('[Vibe] Statut média:', error); toast('Impossible de publier le statut.'); }
  });
}

async function publishChannelWithMedia() {
  const user = auth?.currentUser;
  if (!user || !db) return toast('Connectez-vous pour publier.');
  const title = document.querySelector('.channel-identity h3, .feature-header h2')?.textContent?.trim();
  if (!title) return toast('Chaîne introuvable.');
  const owned = await getDocs(query(collection(db,'channels'), where('ownerId','==',user.uid)));
  const channel = owned.docs.map(item => ({id:item.id,...item.data()})).find(item => String(item.name||'').trim() === title);
  if (!channel) return toast('Vous n’êtes pas propriétaire de cette chaîne.');
  createPicker('image/*,video/*', async file => {
    const media = await uploadToCloudinary(file);
    if (!media) return;
    const text = String(window.prompt(`Texte de la publication dans « ${channel.name} » (facultatif) :`) || '').trim().slice(0,2000);
    try {
      await addDoc(collection(db,'channels',channel.id,'posts'), { text, authorId:user.uid, authorName:user.displayName || channel.ownerName || 'Utilisateur Vibe', authorPhotoURL:user.photoURL || channel.ownerPhotoURL || '', media, createdAt:serverTimestamp(), reactions:{} });
      await setDoc(doc(db,'channels',channel.id), {updatedAt:serverTimestamp()},{merge:true});
      toast('Publication média envoyée.');
    } catch (error) { console.error('[Vibe] Publication chaîne média:',error); toast('Impossible de publier le média.'); }
  });
}

function upgradeStatusAndChannelCards() {
  document.querySelectorAll('.status-card,.channel-post').forEach(card => {
    if (card.dataset.vibeMediaCardReady === 'true') return;
    const source = card.querySelector('[data-media-json]');
    if (!source) return;
    try {
      const media = JSON.parse(source.dataset.mediaJson || '{}');
      if (media.url) source.insertAdjacentHTML('afterend', mediaMarkup(media, card.classList.contains('channel-post') ? 'vibe-channel-media' : 'vibe-status-media'));
      source.remove();
      card.dataset.vibeMediaCardReady = 'true';
    } catch {}
  });
}

function installEventBridge() {
  document.addEventListener('click', event => {
    const attach = event.target.closest('#attach-btn');
    if (attach) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openMenu(attach);
      return;
    }
    const status = event.target.closest('#publish-status-btn');
    if (status) {
      event.preventDefault();
      event.stopImmediatePropagation();
      publishStatusWithMedia();
      return;
    }
    const channel = event.target.closest('#vibe-channel-publish');
    if (channel) {
      event.preventDefault();
      event.stopImmediatePropagation();
      publishChannelWithMedia();
    }
  }, true);
  document.addEventListener('click', event => {
    const menu = document.getElementById(MENU_ID);
    if (menu?.classList.contains('show') && !event.target.closest(`#${MENU_ID}`) && !event.target.closest('#attach-btn')) menu.classList.remove('show');
  });
}

function init() {
  injectStyles();
  installEventBridge();
  observeMediaRendering();
  console.info('[Vibe] Système média natif initialisé.');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
