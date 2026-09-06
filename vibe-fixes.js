import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc, getDoc, onSnapshot, query, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant vibe-fixes.js');
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (selector) => document.querySelector(selector);
let user = null, selected = null, stopReactions = null, stopPeerPresence = null;
const consumed = new Set();
const toast = (message) => { const el = $('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2800); };
const currentChatId = () => window.VibeApp?.currentChatId || selected;
const messagesRef = (id) => collection(db, 'conversations', id, 'messages');
function cleanup() { stopReactions?.(); stopPeerPresence?.(); stopReactions = stopPeerPresence = null; }
function makeInviteToken() { return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''); }
function clean(value, max = 2000) { return String(value || '').trim().slice(0, max); }

async function createPrivateChat() {
  if (!user) return toast('Connexion Firebase requise.');
  const name = clean(prompt('Nom de la discussion :'), 120); if (!name) return;
  try { const ref = await addDoc(collection(db, 'conversations'), { name, ownerId: user.uid, participantIds: [user.uid], inviteToken: makeInviteToken(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), type: 'private' }); await setDoc(doc(db, 'users', user.uid, 'conversations', ref.id), { chatId: ref.id, updatedAt: serverTimestamp() }); toast('Discussion créée.'); window.VibeApp?.openChat(ref.id, { id: ref.id, name, ownerId: user.uid, participantIds: [user.uid] }); }
  catch (error) { toast(`Création impossible : ${error.message}`); }
}
async function joinPrivateChat() {
  if (!user) return toast('Connexion Firebase requise.');
  const id = clean(prompt('Identifiant de la discussion :'), 120); if (!id) return;
  try { const ref = doc(db, 'conversations', id); const snap = await getDoc(ref); if (!snap.exists()) return toast('Discussion introuvable.'); const chat = snap.data(); const token = chat.ownerId === user.uid ? chat.inviteToken : clean(prompt('Code d’invitation :'), 128); if (chat.ownerId !== user.uid && token !== String(chat.inviteToken || '')) return toast('Code d’invitation invalide.'); const participants = Array.isArray(chat.participantIds) ? chat.participantIds : []; if (!participants.includes(user.uid)) { const { updateDoc } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js'); await updateDoc(ref, { participantIds: [...participants, user.uid], updatedAt: serverTimestamp() }); } await setDoc(doc(db, 'users', user.uid, 'conversations', id), { chatId: id, updatedAt: serverTimestamp() }, { merge: true }); window.VibeApp?.openChat(id, { id, ...chat, participantIds: [...new Set([...participants, user.uid])] }); toast('Accès privé autorisé.'); }
  catch (error) { toast(`Impossible de rejoindre : ${error.message}`); }
}
function decorateReactions(data) { const map = {}; for (const [messageId, users] of Object.entries(data || {})) { const counts = {}; for (const value of Object.values(users || {})) counts[value] = (counts[value] || 0) + 1; map[messageId] = Object.entries(counts).map(([emoji, count]) => emoji + (count > 1 ? ` ${count}` : '')).join(' '); } document.querySelectorAll('#messages [data-message]').forEach((el) => { el.querySelector('.message-reaction')?.remove(); if (map[el.dataset.message]) { const badge = document.createElement('span'); badge.className = 'message-reaction'; badge.textContent = map[el.dataset.message]; el.appendChild(badge); } }); }
function watchReactions(id) { stopReactions?.(); const q = query(collection(db, 'conversations', id, 'reactions'), limit(500)); stopReactions = onSnapshot(q, (snap) => { const data = {}; snap.forEach((item) => { const d = item.data(); if (!data[d.messageId]) data[d.messageId] = {}; data[d.messageId][d.uid] = d.emoji; }); setTimeout(() => decorateReactions(data), 0); }, () => {}); }
async function watchPresence(id) { stopPeerPresence?.(); const snap = await getDoc(doc(db, 'conversations', id)); const chat = snap.data() || {}; const peers = (chat.participantIds || []).filter((x) => x !== user?.uid); const el = $('#chatPresence'); if (!peers.length) { if (el) el.textContent = 'vous êtes le seul membre'; return; } const states = new Map(); const listeners = []; const paint = () => { const online = [...states.values()].filter((s) => s === 'online').length; if (el) el.textContent = peers.length === 1 ? (online ? 'en ligne' : 'hors ligne') : `${online}/${peers.length} en ligne`; }; for (const peerId of peers) listeners.push(onSnapshot(doc(db, 'presence', peerId), (s) => { states.set(peerId, s.data()?.state || 'offline'); paint(); })); stopPeerPresence = () => listeners.forEach((unsubscribe) => unsubscribe()); }
async function toggleReaction(messageId, emoji) { if (!user || !currentChatId() || !messageId) return; const reactionId = `${messageId}_${user.uid}`; await setDoc(doc(db, 'conversations', currentChatId(), 'reactions', reactionId), { messageId, uid: user.uid, emoji: clean(emoji, 16), createdAt: serverTimestamp() }); }
async function viewOnceClick(event) { const el = event.target.closest('#messages [data-message]'); if (!el || el.dataset.viewOnce !== 'true' || !user) return; const messageId = el.dataset.message, chatId = currentChatId(); if (!messageId || consumed.has(messageId) || !chatId) return; try { const snap = await getDoc(doc(db, 'conversations', chatId, 'messages', messageId)); const m = snap.data(); if (!m?.viewOnce || m.uid === user.uid) return; consumed.add(messageId); await deleteDoc(snap.ref); toast('Message à vue unique consommé.'); } catch (error) { consumed.delete(messageId); toast(`Impossible : ${error.message}`); } }
async function handleFile(event) { if (event.target?.id !== 'fileInput') return; const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; const allowed = file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type === 'application/pdf'; if (!allowed) return toast('Type de fichier non pris en charge.'); if (file.size > 750 * 1024) return toast('Fichier trop volumineux : 750 Ko maximum.'); const chatId = currentChatId(); if (!chatId || !user) return toast('Ouvrez une discussion.'); try { const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); const { addDoc: add, collection: col } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js'); await add(col(db, 'conversations', chatId, 'messages'), { uid: user.uid, text: file.name, type: 'media', fileName: file.name.slice(0, 180), mimeType: file.type, dataUrl, viewOnce: false, createdAt: serverTimestamp() }); toast('Fichier envoyé.'); } catch (error) { toast(`Envoi impossible : ${error.message}`); } }
function handleClick(event) {
  const reactionTarget = event.target.closest('#messages [data-message]');
  if (reactionTarget && event.detail === 2) { const emoji = prompt('Réaction : ❤️ 👍 😂 😮 😢 🙏'); if (emoji) setTimeout(() => toggleReaction(reactionTarget.dataset.message, emoji).catch(() => {}), 0); }
  if (reactionTarget?.dataset.viewOnce === 'true') setTimeout(() => viewOnceClick(event), 0);
  const newChat = event.target.closest('#newChatBtn'); if (newChat) { event.preventDefault(); event.stopImmediatePropagation(); setTimeout(() => createPrivateChat(), 0); return; }
  const menu = event.target.closest('#chatMenuBtn'); if (menu) { event.preventDefault(); event.stopImmediatePropagation(); setTimeout(() => { const choice = prompt('Vibe :\n1. Rejoindre une discussion privée\n2. Message à vue unique'); if (choice === '1') joinPrivateChat(); if (choice === '2') { const text = clean(prompt('Message à vue unique :')); const chatId = currentChatId(); if (text && chatId && user) addDoc(messagesRef(chatId), { uid: user.uid, text, type: 'text', viewOnce: true, createdAt: serverTimestamp() }).then(() => toast('Message à vue unique envoyé.')).catch(error => toast(`Envoi impossible : ${error.message}`)); } }, 0); return; }
  if (event.target.closest('#attachBtn')) { event.preventDefault(); event.stopImmediatePropagation(); setTimeout(() => $('#fileInput')?.click(), 0); }
}
onAuthStateChanged(auth, (nextUser) => { user = nextUser; cleanup(); selected = null; if (!user) return; });
document.addEventListener('click', handleClick, true);
document.addEventListener('change', handleFile, true);
document.addEventListener('vibe:auth-changed', () => { const id = currentChatId(); if (!id) return; selected = id; watchReactions(id); watchPresence(id).catch(() => {}); });
window.VibeFixes = { createPrivateChat, joinPrivateChat, toggleReaction };
