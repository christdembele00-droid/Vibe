import { auth, db, collection, query, orderBy, getDocs } from './firebase-client.js';

const esc = (value = '') => String(value).replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
let timer = null;
let lastStatusKey = '';
let lastChannelKey = '';

function mediaMarkup(media) {
  if (!media?.url) return '';
  const url = esc(media.url);
  const name = esc(media.name || 'Média Vibe');
  if (media.resourceType === 'video' || String(media.type || '').startsWith('video/')) {
    return `<div class="vibe-status-media"><video class="vibe-media-video" controls preload="metadata" playsinline src="${url}"></video><span class="vibe-media-meta">${name}</span></div>`;
  }
  return `<div class="vibe-status-media"><img class="vibe-media-preview" loading="lazy" src="${url}" alt="${name}"><span class="vibe-media-meta">${name}</span></div>`;
}

async function decorateStatuses() {
  const container = document.getElementById('status-list-container');
  if (!container || !db || !auth?.currentUser) return;
  const cards = [...container.querySelectorAll('.status-card')];
  if (!cards.length) return;
  const snap = await getDocs(query(collection(db, 'statuses'), orderBy('timestamp', 'desc')));
  const recent = snap.docs.map(item => ({ id:item.id, ...item.data() })).filter(item => {
    const t = item.timestamp?.toDate?.()?.getTime?.() || 0;
    return !t || Date.now() - t <= 24 * 60 * 60 * 1000;
  }).slice(0, 100);
  const key = recent.map(item => `${item.id}:${item.media?.url || ''}`).join('|');
  if (key === lastStatusKey && cards.every(card => card.dataset.vibeMediaDecorated === 'true')) return;
  lastStatusKey = key;
  cards.forEach(card => {
    const author = card.querySelector('.status-body strong')?.textContent?.trim() || '';
    const text = card.querySelector('.status-body p')?.textContent?.trim() || '';
    const item = recent.find(status => String(status.authorName || '') === author && String(status.text || '') === text && status.media?.url);
    if (!item || card.dataset.vibeMediaDecorated === 'true') return;
    card.querySelector('.status-body')?.insertAdjacentHTML('beforeend', mediaMarkup(item.media));
    card.dataset.vibeMediaDecorated = 'true';
  });
}

async function decorateChannelPosts() {
  const container = document.getElementById('vibe-channel-posts');
  if (!container || !db || !auth?.currentUser) return;
  const cards = [...container.querySelectorAll('.channel-post')];
  if (!cards.length) return;
  const channelPosts = [];
  const source = container.closest('.feature-content') || document;
  const channelName = source.querySelector('.channel-identity h3')?.textContent?.trim() || '';
  const channelSnap = await getDocs(query(collection(db, 'channels'), orderBy('updatedAt', 'desc')));
  const channel = channelSnap.docs.map(item => ({id:item.id,...item.data()})).find(item => String(item.name || '') === channelName);
  if (!channel) return;
  const postsSnap = await getDocs(query(collection(db, 'channels', channel.id, 'posts'), orderBy('createdAt', 'desc')));
  postsSnap.docs.slice(0, 100).forEach(item => channelPosts.push({id:item.id,...item.data()}));
  const key = channelPosts.map(item => `${item.id}:${item.media?.url || ''}`).join('|');
  if (key === lastChannelKey && cards.every(card => card.dataset.vibeMediaDecorated === 'true')) return;
  lastChannelKey = key;
  cards.forEach(card => {
    const author = card.querySelector('.channel-post-author strong')?.textContent?.trim() || '';
    const text = card.querySelector('.channel-post-text')?.textContent?.trim() || '';
    const item = channelPosts.find(post => String(post.authorName || channel.name || '') === author && String(post.text || '') === text && post.media?.url);
    if (!item || card.dataset.vibeMediaDecorated === 'true') return;
    card.querySelector('.channel-post-text')?.insertAdjacentHTML('afterend', mediaMarkup(item.media));
    card.dataset.vibeMediaDecorated = 'true';
  });
}

async function decorate() {
  try { await decorateStatuses(); } catch (error) { console.warn('[Vibe] Rendu médias statuts:', error); }
  try { await decorateChannelPosts(); } catch (error) { console.warn('[Vibe] Rendu médias chaînes:', error); }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(decorate, 350);
}

function init() {
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList:true, subtree:true });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
