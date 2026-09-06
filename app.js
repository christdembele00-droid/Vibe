import { FIREBASE_ENABLED, auth, db, collection, doc, addDoc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, serverTimestamp, onAuthStateChanged } from './firebase-client.js';
import { arrayUnion } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const state = { currentUser: null, currentChatId: null, stopChat: null, stopChats: null, chats: new Map(), favorites: new Set(), renderTimer: null };
const $ = (id) => document.getElementById(id);
const uid = () => state.currentUser?.uid || auth?.currentUser?.uid || null;
const toast = (message) => { const el = $('toast'); if (!el) return; el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2600); };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
const escapeAttr = (value) => escapeHtml(value).replace(/`/g, '&#96;');
const conversationRef = (chatId) => doc(db, 'conversations', chatId);
const messagesRef = (chatId) => collection(db, 'conversations', chatId, 'messages');
const favoriteRef = (userId, chatId) => doc(db, 'users', userId, 'favorites', chatId);

let presenceTimer = null;
let presenceGeneration = 0;
async function setPresence(user, online = true) {
  if (!FIREBASE_ENABLED || !user) return;
  try {
    await setDoc(doc(db, 'presence', user.uid), {
      uid: user.uid,
      state: online ? 'online' : 'offline',
      displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
      photoURL: user.photoURL || null,
      updatedAt: serverTimestamp(),
      lastOnline: online ? null : serverTimestamp()
    }, { merge: true });
  } catch (error) { console.warn('Présence Firestore:', error); }
}
function startPresence(user) {
  presenceGeneration += 1;
  const generation = presenceGeneration;
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
  if (!user) return;
  void setPresence(user, true);
  presenceTimer = setInterval(() => {
    if (generation !== presenceGeneration || auth?.currentUser?.uid !== user.uid) return;
    void setPresence(user, true);
  }, 30000);
}
function stopPresence() {
  presenceGeneration += 1;
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
}
function stopSubscriptions(){ state.stopChat?.(); state.stopChat=null; state.stopChats?.(); state.stopChats=null; if(state.renderTimer)clearTimeout(state.renderTimer); state.renderTimer=null; }
async function loadFavorites(){const userId=uid();if(!userId)return;try{const snap=await getDocs(collection(db,'users',userId,'favorites'));state.favorites=new Set(snap.docs.map(x=>x.id));renderChats([...state.chats.values()]);}catch(e){console.warn('Favoris Firestore:',e)}}
async function toggleFavorite(chatId){const userId=uid();if(!userId||!chatId)return false;try{const ref=favoriteRef(userId,chatId);if(state.favorites.has(chatId)){const {deleteDoc}=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');await deleteDoc(ref);state.favorites.delete(chatId);toast('Retirée des favoris.')}else{const chat=state.chats.get(chatId)||{};await setDoc(ref,{chatId,name:chat.name||'Discussion',updatedAt:serverTimestamp()});state.favorites.add(chatId);toast('Ajoutée aux favoris.')}renderChats([...state.chats.values()]);return true}catch(e){toast(`Favori impossible : ${e.message}`);return false}}
function renderChats(loaded){const list=$('conversationList');if(!list)return;loaded.sort((a,b)=>{const af=state.favorites.has(a.id)?1:0,bf=state.favorites.has(b.id)?1:0;if(af!==bf)return bf-af;return (b.updatedAt?.toMillis?.()||0)-(a.updatedAt?.toMillis?.()||0)});setTimeout(()=>{if(!list.isConnected)return;list.innerHTML=loaded.map(chat=>{const favorite=state.favorites.has(chat.id);return `<button class="conversation-item ${state.currentChatId===chat.id?'active':''}" data-chat-id="${escapeAttr(chat.id)}"><div class="avatar">${escapeHtml((chat.name||'V')[0].toUpperCase())}</div><div><strong>${favorite?'★ ':''}${escapeHtml(chat.name||'Discussion')}</strong><span>${favorite?'Favori · ':''}Discussion Vibe</span></div></button>`}).join('')},0)}
function makeInviteToken(){return crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')}
async function createChat(){const userId=uid();if(!userId)return toast('Connectez-vous pour créer une discussion.');const name=prompt('Nom de la discussion :','Nouvelle discussion');if(!name?.trim())return;try{const cleanName=name.trim().slice(0,120),inviteToken=makeInviteToken();const ref=await addDoc(collection(db,'conversations'),{name:cleanName,ownerId:userId,participantIds:[userId],inviteToken,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),type:'private'});await setDoc(doc(db,'conversationInvites',inviteToken),{token:inviteToken,chatId:ref.id,name:cleanName,ownerId:userId,createdAt:serverTimestamp()});await setDoc(doc(db,'users',userId,'conversations',ref.id),{chatId:ref.id,updatedAt:serverTimestamp()});const chat={id:ref.id,name:cleanName,ownerId:userId,participantIds:[userId],inviteToken};state.chats.set(ref.id,chat);openChat(ref.id,chat);toast(`Discussion créée. ID : ${ref.id}\nCode : ${inviteToken}`)}catch(e){toast(`Création impossible : ${e.message}`)}}
async function joinChat(){const userId=uid();if(!userId)return toast('Connectez-vous pour rejoindre une discussion.');const chatId=String(prompt('ID de la discussion :')||'').trim().replace(/[^A-Za-z0-9_-]/g,'').slice(0,100);if(!chatId)return;const token=String(prompt('Code d’invitation :')||'').trim();if(token.length<32)return toast('Code d’invitation invalide.');try{const inviteSnap=await getDoc(doc(db,'conversationInvites',token));if(!inviteSnap.exists())return toast('Code d’invitation invalide.');const invite=inviteSnap.data();if(invite.chatId!==chatId)return toast('Le code ne correspond pas à cette discussion.');const ref=conversationRef(chatId);await (await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')).updateDoc(ref,{participantIds:arrayUnion(userId),inviteToken:token,updatedAt:serverTimestamp()});await setDoc(doc(db,'users',userId,'conversations',chatId),{chatId,updatedAt:serverTimestamp()},{merge:true});const updated={id:chatId,name:invite.name||'Discussion',ownerId:invite.ownerId,participantIds:[userId],inviteToken:token};state.chats.set(chatId,updated);openChat(chatId,updated);toast('Discussion rejointe.')}catch(e){console.error(e);toast(`Impossible de rejoindre : ${e.message}`)}}
function subscribeChats(){const userId=uid();if(!FIREBASE_ENABLED||!userId)return;state.stopChats?.();const q=query(collection(db,'conversations'),where('participantIds','array-contains',userId),limit(100));state.stopChats=onSnapshot(q,snap=>{const loaded=[];snap.forEach(item=>{const chat={id:item.id,...item.data()};state.chats.set(item.id,chat);loaded.push(chat)});renderChats(loaded)},e=>toast(`Impossible de charger vos discussions : ${e.message}`))}
function openChat(chatId,chat={}){state.currentChatId=chatId;document.querySelectorAll('.conversation-item').forEach(el=>el.classList.toggle('active',el.dataset.chatId===chatId));$('emptyState')?.classList.add('hidden');$('chatView')?.classList.remove('hidden');if($('chatName'))$('chatName').textContent=chat.name||'Discussion';if($('chatAvatar'))$('chatAvatar').textContent=(chat.name||'V')[0].toUpperCase();if($('chatPresence'))$('chatPresence').textContent='discussion';setTimeout(()=>subscribeToChat(chatId),0)}
function renderMessage(m){const own=m.uid===uid(),type=String(m.type||'text');let body='';if(type==='media'&&m.dataUrl){const url=escapeAttr(m.dataUrl),name=escapeHtml(m.fileName||'Fichier'),mime=String(m.mimeType||'');if(mime.startsWith('image/'))body=`<img class="message-media" src="${url}" alt="${name}" loading="lazy">`;else if(mime.startsWith('video/'))body=`<video class="message-media" src="${url}" controls preload="metadata"></video>`;else if(mime.startsWith('audio/'))body=`<audio src="${url}" controls preload="metadata"></audio>`;else body=`<a class="message-file" href="${url}" download="${escapeAttr(m.fileName||'fichier')}">📎 ${name}</a>`}else body=escapeHtml(m.text||'');if(!body)return '';const timestamp=m.createdAt?.toMillis?m.createdAt.toMillis():Number(m.createdAt||0);return `<article class="message ${own?'mine':''}" data-message="${escapeAttr(m.id)}" data-view-once="${m.viewOnce?'true':'false'}" data-created-at="${timestamp}"><div class="message-bubble">${body}</div></article>`}
function renderMessagesInChunks(container,rows,chatId){if(state.renderTimer)clearTimeout(state.renderTimer);container.innerHTML='';let index=0;const chunkSize=5;const renderChunk=()=>{if(state.currentChatId!==chatId)return;const fragment=document.createDocumentFragment(),html=rows.slice(index,index+chunkSize).map(renderMessage).join('');if(html){const wrapper=document.createElement('div');wrapper.innerHTML=html;while(wrapper.firstChild)fragment.appendChild(wrapper.firstChild);container.appendChild(fragment)}index+=chunkSize;if(index<rows.length)state.renderTimer=setTimeout(renderChunk,16);else{state.renderTimer=null;container.scrollTop=container.scrollHeight}};renderChunk()}
function subscribeToChat(chatId){state.stopChat?.();if(!FIREBASE_ENABLED||!uid())return;const q=query(messagesRef(chatId),orderBy('createdAt','asc'),limit(200));state.stopChat=onSnapshot(q,snap=>{const container=$('messages');if(!container||state.currentChatId!==chatId)return;const rows=[];snap.forEach(item=>rows.push({id:item.id,...item.data()}));setTimeout(()=>renderMessagesInChunks(container,rows,chatId),0)},e=>toast(`Impossible de charger les messages : ${e.message}`))}
async function sendMessage(event){event?.preventDefault();const text=$('messageInput')?.value?.trim(),userId=uid(),chatId=state.currentChatId;if(!text||!userId||!chatId)return;if(text.length>20000)return toast('Message trop long.');try{await addDoc(messagesRef(chatId),{uid:userId,text,type:'text',viewOnce:false,createdAt:serverTimestamp()});await setDoc(conversationRef(chatId),{updatedAt:serverTimestamp()},{merge:true});$('messageInput').value=''}catch(e){toast(`Message non envoyé : ${e.message}`)}}
function addEmoji(){const input=$('messageInput');if(!input)return;const emojis=['😀','😂','😍','👍','❤️','🙏','🔥','😎','😢','😮','🎉','👏'];const current=prompt(`Choisir un emoji :\n${emojis.join('  ')}`);if(!current)return;const emoji=[...current].find(c=>emojis.includes(c));if(!emoji)return toast('Emoji non reconnu.');const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;input.value=input.value.slice(0,start)+emoji+input.value.slice(end);input.focus();input.selectionStart=input.selectionEnd=start+emoji.length}
async function createStory(){const userId=uid();if(!userId)return toast('Connexion Firebase requise.');const text=prompt('Votre actu :');if(!text?.trim())return;try{await addDoc(collection(db,'stories'),{uid:userId,text:text.trim().slice(0,2000),type:'text',createdAt:serverTimestamp(),expiresAt:new Date(Date.now()+86400000)});toast('Actu publiée pour 24 h.')}catch(e){toast(`Publication impossible : ${e.message}`)}}
function bindUI(){$('newChatBtn')?.addEventListener('click',createChat);$('messageForm')?.addEventListener('submit',sendMessage);$('emojiBtn')?.addEventListener('click',addEmoji);$('profileBtn')?.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('vibe:open-auth')));$('backBtn')?.addEventListener('click',()=>{state.currentChatId=null;$('chatView')?.classList.add('hidden');$('emptyState')?.classList.remove('hidden');state.stopChat?.();state.stopChat=null;setTimeout(subscribeChats,0)});$('conversationList')?.addEventListener('click',event=>{const item=event.target.closest('[data-chat-id]');if(!item)return;const chat=state.chats.get(item.dataset.chatId);setTimeout(()=>openChat(item.dataset.chatId,chat),0)});document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active');if(tab.dataset.view==='chats')setTimeout(subscribeChats,0)}))}
bindUI();
function applyAuthUser(user) {
  stopSubscriptions();
  state.currentUser = user || null;
  state.favorites = new Set();
  if (state.currentUser) {
    startPresence(state.currentUser);
    loadFavorites();
    setTimeout(subscribeChats,0);
  } else {
    stopPresence();
  }
}
onAuthStateChanged(auth, applyAuthUser);
document.addEventListener('vibe:auth-changed', event => {
  const user = event.detail?.user || auth?.currentUser || null;
  if (user?.uid !== state.currentUser?.uid || !user) applyAuthUser(user);
});
window.addEventListener('pagehide',()=>{const user=state.currentUser;if(user){stopPresence();void setPresence(user,false)}});
window.addEventListener('beforeunload',()=>{const user=state.currentUser;if(user)void setPresence(user,false)});
window.VibeApp={createChat,joinChat,createStory,openChat,toggleFavorite,isFavorite:chatId=>state.favorites.has(chatId),get currentChatId(){return state.currentChatId},getChats:()=>[...state.chats.values()],refreshChats:()=>renderChats([...state.chats.values()])};
