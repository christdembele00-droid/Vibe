import { FIREBASE_ENABLED, auth, db, collection, doc, addDoc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, serverTimestamp, onAuthStateChanged } from './firebase-client.js';
import { arrayUnion } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const state = { currentUser:null, currentChatId:null, stopChat:null, stopChats:null, chats:new Map(), favorites:new Set(), renderTimer:null, chatsSubscribed:false, renderingChats:false };
const $ = id => document.getElementById(id);
const uid = () => state.currentUser?.uid || auth?.currentUser?.uid || null;
const toast = message => { const el=$('toast'); if(!el)return; el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2600); };
const escapeHtml = value => String(value??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const escapeAttr = value => escapeHtml(value).replace(/`/g,'&#96;');
const conversationRef = chatId => doc(db,'conversations',chatId);
const messagesRef = chatId => collection(db,'conversations',chatId,'messages');
const favoriteRef = (userId,chatId) => doc(db,'users',userId,'favorites',chatId);

let presenceTimer=null;
let presenceGeneration=0;
let chatSubscribeFrame=0;

async function setPresence(user,online=true){
  if(!FIREBASE_ENABLED||!user)return;
  try{await setDoc(doc(db,'presence',user.uid),{uid:user.uid,state:online?'online':'offline',displayName:user.displayName||user.email?.split('@')[0]||'Utilisateur',photoURL:user.photoURL||null,updatedAt:serverTimestamp(),lastOnline:online?null:serverTimestamp()},{merge:true});}
  catch(error){console.warn('Présence Firestore:',error)}
}
function startPresence(user){presenceGeneration+=1;const generation=presenceGeneration;if(presenceTimer)clearInterval(presenceTimer);presenceTimer=null;if(!user)return;void setPresence(user,true);presenceTimer=setInterval(()=>{if(generation!==presenceGeneration||auth?.currentUser?.uid!==user.uid)return;void setPresence(user,true)},30000)}
function stopPresence(){presenceGeneration+=1;if(presenceTimer)clearInterval(presenceTimer);presenceTimer=null}
function stopSubscriptions(){state.stopChat?.();state.stopChat=null;state.stopChats?.();state.stopChats=null;state.chatsSubscribed=false;if(state.renderTimer)cancelAnimationFrame(state.renderTimer);state.renderTimer=null;cancelAnimationFrame(chatSubscribeFrame)}

async function loadFavorites(){const userId=uid();if(!userId)return;try{const snap=await getDocs(collection(db,'users',userId,'favorites'));state.favorites=new Set(snap.docs.map(x=>x.id));scheduleChatRender()}catch(e){console.warn('Favoris Firestore:',e)}}
async function toggleFavorite(chatId){const userId=uid();if(!userId||!chatId)return false;try{const ref=favoriteRef(userId,chatId);if(state.favorites.has(chatId)){const {deleteDoc}=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');await deleteDoc(ref);state.favorites.delete(chatId);toast('Retirée des favoris.')}else{const chat=state.chats.get(chatId)||{};await setDoc(ref,{chatId,name:chat.name||'Discussion',updatedAt:serverTimestamp()});state.favorites.add(chatId);toast('Ajoutée aux favoris.')}scheduleChatRender();return true}catch(e){toast(`Favori impossible : ${e.message}`);return false}}

function renderChats(loaded){
  const list=$('conversationList');if(!list||state.renderingChats)return;
  const chats=loaded.slice().sort((a,b)=>{const af=state.favorites.has(a.id)?1:0,bf=state.favorites.has(b.id)?1:0;if(af!==bf)return bf-af;return (b.updatedAt?.toMillis?.()||0)-(a.updatedAt?.toMillis?.()||0)});
  state.renderingChats=true;
  requestAnimationFrame(()=>{
    state.renderingChats=false;
    if(!list.isConnected)return;
    const fragment=document.createDocumentFragment();
    for(const chat of chats){
      const favorite=state.favorites.has(chat.id);
      const button=document.createElement('button');
      button.className=`conversation-item ${state.currentChatId===chat.id?'active':''}`;
      button.dataset.chatId=chat.id;
      const avatar=document.createElement('div');avatar.className='avatar';avatar.textContent=(chat.name||'V')[0].toUpperCase();
      const body=document.createElement('div');const strong=document.createElement('strong');strong.textContent=`${favorite?'★ ':''}${chat.name||'Discussion'}`;const span=document.createElement('span');span.textContent=`${favorite?'Favori · ':''}Discussion Vibe`;body.append(strong,span);button.append(avatar,body);fragment.appendChild(button);
    }
    list.replaceChildren(fragment);
  });
}
let chatRenderFrame=0;
function scheduleChatRender(){cancelAnimationFrame(chatRenderFrame);chatRenderFrame=requestAnimationFrame(()=>{chatRenderFrame=0;renderChats([...state.chats.values()])})}
function makeInviteToken(){return crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')}
async function createChat(){const userId=uid();if(!userId)return toast('Connectez-vous pour créer une discussion.');const name=prompt('Nom de la discussion :','Nouvelle discussion');if(!name?.trim())return;try{const cleanName=name.trim().slice(0,120),inviteToken=makeInviteToken();const ref=await addDoc(collection(db,'conversations'),{name:cleanName,ownerId:userId,participantIds:[userId],inviteToken,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),type:'private'});await setDoc(doc(db,'conversationInvites',inviteToken),{token:inviteToken,chatId:ref.id,name:cleanName,ownerId:userId,createdAt:serverTimestamp()});await setDoc(doc(db,'users',userId,'conversations',ref.id),{chatId:ref.id,updatedAt:serverTimestamp()});const chat={id:ref.id,name:cleanName,ownerId:userId,participantIds:[userId],inviteToken};state.chats.set(ref.id,chat);scheduleChatRender();openChat(ref.id,chat);toast(`Discussion créée. ID : ${ref.id}\nCode : ${inviteToken}`)}catch(e){toast(`Création impossible : ${e.message}`)}}
async function createGroup(){const userId=uid();if(!userId)return toast('Connectez-vous pour créer un groupe.');const name=prompt('Nom du groupe :','Nouveau groupe');if(!name?.trim())return;try{const cleanName=name.trim().slice(0,100),inviteToken=makeInviteToken();const ref=await addDoc(collection(db,'conversations'),{name:cleanName,ownerId:userId,participantIds:[userId],inviteToken,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),type:'group',admins:[userId]});await setDoc(doc(db,'conversationInvites',inviteToken),{token:inviteToken,chatId:ref.id,name:cleanName,ownerId:userId,createdAt:serverTimestamp()});await setDoc(doc(db,'users',userId,'conversations',ref.id),{chatId:ref.id,updatedAt:serverTimestamp()});const chat={id:ref.id,name:cleanName,ownerId:userId,participantIds:[userId],inviteToken,type:'group'};state.chats.set(ref.id,chat);scheduleChatRender();openChat(ref.id,chat);toast('Groupe créé. Vous pourrez ensuite inviter des membres.')}catch(e){toast(`Création du groupe impossible : ${e.message}`)}}
async function createChannel(){const userId=uid();if(!userId)return toast('Connectez-vous pour créer une chaîne.');const name=prompt('Nom de la chaîne :','Nouvelle chaîne');if(!name?.trim())return;const description=prompt('Description (facultative) :','')||'';try{const cleanName=name.trim().slice(0,100),cleanDescription=description.trim().slice(0,500),inviteToken=makeInviteToken();const ref=await addDoc(collection(db,'channels'),{name:cleanName,description:cleanDescription,ownerId:userId,adminIds:[userId],followerIds:[userId],inviteToken,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),type:'channel'});await setDoc(doc(db,'channelInvites',inviteToken),{token:inviteToken,channelId:ref.id,name:cleanName,ownerId:userId,createdAt:serverTimestamp()});toast('Chaîne créée. Elle pourra publier des mises à jour à ses abonnés.')}catch(e){toast(`Création de la chaîne impossible : ${e.message}`)}}
function showCreateMenu(){const choice=prompt('Créer :\n1 = Discussion\n2 = Groupe\n3 = Chaîne');if(choice==='1')return createChat();if(choice==='2')return createGroup();if(choice==='3')return createChannel()}
async function joinChat(){const userId=uid();if(!userId)return toast('Connectez-vous pour rejoindre une discussion.');const chatId=String(prompt('ID de la discussion :')||'').trim().replace(/[^A-Za-z0-9_-]/g,'').slice(0,100);if(!chatId)return;const token=String(prompt('Code d’invitation :')||'').trim();if(token.length<32)return toast('Code d’invitation invalide.');try{const inviteSnap=await getDoc(doc(db,'conversationInvites',token));if(!inviteSnap.exists())return toast('Code d’invitation invalide.');const invite=inviteSnap.data();if(invite.chatId!==chatId)return toast('Le code ne correspond pas à cette discussion.');const ref=conversationRef(chatId);await (await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')).updateDoc(ref,{participantIds:arrayUnion(userId),inviteToken:token,updatedAt:serverTimestamp()});await setDoc(doc(db,'users',userId,'conversations',chatId),{chatId,updatedAt:serverTimestamp()},{merge:true});const updated={id:chatId,name:invite.name||'Discussion',ownerId:invite.ownerId,participantIds:[userId],inviteToken:token};state.chats.set(chatId,updated);scheduleChatRender();openChat(chatId,updated);toast('Discussion rejointe.')}catch(e){console.error(e);toast(`Impossible de rejoindre : ${e.message}`)}}

function subscribeChats(){const userId=uid();if(!FIREBASE_ENABLED||!userId||state.chatsSubscribed)return;state.stopChats?.();const q=query(collection(db,'conversations'),where('participantIds','array-contains',userId),limit(100));state.chatsSubscribed=true;state.stopChats=onSnapshot(q,snap=>{snap.docChanges().forEach(change=>{const chat={id:change.doc.id,...change.doc.data()};if(change.type==='removed')state.chats.delete(chat.id);else state.chats.set(chat.id,chat)});scheduleChatRender()},e=>{state.chatsSubscribed=false;toast(`Impossible de charger vos discussions : ${e.message}`)})}
function scheduleChatsSubscription(){cancelAnimationFrame(chatSubscribeFrame);chatSubscribeFrame=requestAnimationFrame(()=>{chatSubscribeFrame=0;subscribeChats()})}

function openChat(chatId,chat={}){if(state.currentChatId===chatId)return;state.currentChatId=chatId;document.querySelectorAll('.conversation-item').forEach(el=>{const active=el.dataset.chatId===chatId;if(el.classList.contains('active')!==active)el.classList.toggle('active',active)});$('emptyState')?.classList.add('hidden');$('chatView')?.classList.remove('hidden');const name=chat.name||'Discussion';if($('chatName'))$('chatName').textContent=name;if($('chatAvatar'))$('chatAvatar').textContent=name[0].toUpperCase();if($('chatPresence'))$('chatPresence').textContent='discussion';requestAnimationFrame(()=>subscribeToChat(chatId))}
function renderMessage(m){const own=m.uid===uid(),type=String(m.type||'text');let body='';if(type==='media'&&m.dataUrl){const url=escapeAttr(m.dataUrl),name=escapeHtml(m.fileName||'Fichier'),mime=String(m.mimeType||'');if(mime.startsWith('image/'))body=`<img class="message-media" src="${url}" alt="${name}" loading="lazy">`;else if(mime.startsWith('video/'))body=`<video class="message-media" src="${url}" controls preload="metadata"></video>`;else if(mime.startsWith('audio/'))body=`<audio src="${url}" controls preload="metadata"></audio>`;else body=`<a class="message-file" href="${url}" download="${escapeAttr(m.fileName||'fichier')}">📎 ${name}</a>`}else body=escapeHtml(m.text||'');if(!body)return '';const timestamp=m.createdAt?.toMillis?m.createdAt.toMillis():Number(m.createdAt||0);return `<article class="message ${own?'mine':''}" data-message="${escapeAttr(m.id)}" data-view-once="${m.viewOnce?'true':'false'}" data-created-at="${timestamp}"><div class="message-bubble">${body}</div></article>`}
function renderMessagesInChunks(container,rows,chatId){if(state.renderTimer)cancelAnimationFrame(state.renderTimer);container.replaceChildren();let index=0;const chunkSize=40;const renderChunk=()=>{state.renderTimer=null;if(state.currentChatId!==chatId)return;const fragment=document.createDocumentFragment();for(let i=index;i<Math.min(index+chunkSize,rows.length);i++){const wrapper=document.createElement('div');wrapper.innerHTML=renderMessage(rows[i]);if(wrapper.firstElementChild)fragment.appendChild(wrapper.firstElementChild)}container.appendChild(fragment);index+=chunkSize;if(index<rows.length)state.renderTimer=requestAnimationFrame(renderChunk);else container.scrollTop=container.scrollHeight};renderChunk()}
function subscribeToChat(chatId){state.stopChat?.();if(!FIREBASE_ENABLED||!uid())return;const q=query(messagesRef(chatId),orderBy('createdAt','asc'),limit(200));state.stopChat=onSnapshot(q,snap=>{const container=$('messages');if(!container||state.currentChatId!==chatId)return;const rows=[];snap.forEach(item=>rows.push({id:item.id,...item.data()}));requestAnimationFrame(()=>renderMessagesInChunks(container,rows,chatId))},e=>toast(`Impossible de charger les messages : ${e.message}`))}
async function sendMessage(event){event?.preventDefault();const input=$('messageInput'),text=input?.value?.trim(),userId=uid(),chatId=state.currentChatId;if(!text||!userId||!chatId)return;if(text.length>20000)return toast('Message trop long.');try{await addDoc(messagesRef(chatId),{uid:userId,text,type:'text',viewOnce:false,createdAt:serverTimestamp()});await setDoc(conversationRef(chatId),{updatedAt:serverTimestamp()},{merge:true});if(input)input.value=''}catch(e){toast(`Message non envoyé : ${e.message}`)}}
function addEmoji(){const input=$('messageInput');if(!input)return;const emojis=['😀','😂','😍','👍','❤️','🙏','🔥','😎','😢','😮','🎉','👏'];const current=prompt(`Choisir un emoji :\n${emojis.join('  ')}`);if(!current)return;const emoji=[...current].find(c=>emojis.includes(c));if(!emoji)return toast('Emoji non reconnu.');const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;input.value=input.value.slice(0,start)+emoji+input.value.slice(end);input.focus();input.selectionStart=input.selectionEnd=start+emoji.length}
async function createStory(){const userId=uid();if(!userId)return toast('Connexion Firebase requise.');const text=prompt('Votre actu :');if(!text?.trim())return;try{await addDoc(collection(db,'stories'),{uid:userId,text:text.trim().slice(0,2000),type:'text',createdAt:serverTimestamp(),expiresAt:new Date(Date.now()+86400000)});toast('Actu publiée pour 24 h.')}catch(e){toast(`Publication impossible : ${e.message}`)}}

function bindUI(){
  $('newChatBtn')?.addEventListener('click',showCreateMenu);
  $('messageForm')?.addEventListener('submit',sendMessage);
  $('emojiBtn')?.addEventListener('click',addEmoji);
  $('profileBtn')?.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('vibe:open-auth')));
  $('backBtn')?.addEventListener('click',()=>{state.currentChatId=null;$('chatView')?.classList.add('hidden');$('emptyState')?.classList.remove('hidden');state.stopChat?.();state.stopChat=null;scheduleChatsSubscription()});
  $('conversationList')?.addEventListener('click',event=>{const item=event.target.closest('[data-chat-id]');if(!item)return;const chatId=item.dataset.chatId;if(state.currentChatId===chatId)return;openChat(chatId,state.chats.get(chatId))});
  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>{const active=x===tab;if(x.classList.contains('active')!==active)x.classList.toggle('active',active)});if(tab.dataset.view==='chats')scheduleChatsSubscription()}));
}
bindUI();

function applyAuthUser(user){stopSubscriptions();state.currentUser=user||null;state.favorites=new Set();if(state.currentUser){startPresence(state.currentUser);loadFavorites();scheduleChatsSubscription()}else stopPresence()}
onAuthStateChanged(auth,applyAuthUser);
document.addEventListener('vibe:auth-changed',event=>{const user=event.detail?.user||auth?.currentUser||null;if(user?.uid!==state.currentUser?.uid||!user)applyAuthUser(user)});
window.addEventListener('pagehide',()=>{const user=state.currentUser;if(user){stopPresence();void setPresence(user,false)}});
window.addEventListener('beforeunload',()=>{const user=state.currentUser;if(user)void setPresence(user,false)});
window.VibeApp={createChat,createGroup,createChannel,joinChat,createStory,openChat,toggleFavorite,isFavorite:chatId=>state.favorites.has(chatId),get currentChatId(){return state.currentChatId},getChats:()=>[...state.chats.values()],refreshChats:()=>scheduleChatRender()};