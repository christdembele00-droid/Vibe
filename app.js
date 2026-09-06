const demoChats = [
  { id:'demo-amina', name:'Amina', initials:'A', presence:'en ligne', time:'21:42', unread:2, messages:[
    {text:'Salut 👋 Bienvenue sur Vibe !',direction:'in',time:'21:39'},
    {text:'Merci ! On construit une vraie messagerie ici.',direction:'out',time:'21:40'},
    {text:'Exactement 😄',direction:'in',time:'21:42'}
  ]},
  { id:'demo-groupe', name:'Groupe Vibe', initials:'V', presence:'5 participants', time:'20:18', unread:1, messages:[
    {text:'Le nouveau design est prêt.',direction:'in',time:'20:16'},
    {text:'Parfait, on continue !',direction:'out',time:'20:18'}
  ]},
  { id:'demo-moussa', name:'Moussa', initials:'M', presence:'vu récemment', time:'18:03', unread:0, messages:[
    {text:'À demain 👍',direction:'in',time:'18:03'}
  ]}
];

let chats = demoChats.map(c => ({...c, messages:c.messages.map(m=>({...m}))}));
let selectedId = null;
let currentUser = null;
let unsubscribeMessages = null;
let unsubscribeTyping = null;
let unsubscribePresence = null;
let unsubscribeUserChats = null;
let FIREBASE_ENABLED = false;
let auth = null, rtdb = null;
let fb = null;

const $ = s => document.querySelector(s);
const list = $('#conversationList');
const messages = $('#messages');
const chatPanel = $('#chatPanel');
const emptyState = $('#emptyState');
const chatView = $('#chatView');
const messageInput = $('#messageInput');
const toast = $('#toast');

function escapeHtml(v){return String(v).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}
function nowTime(){return new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}
function isDemo(id){return String(id).startsWith('demo-');}
function initials(name){return String(name||'V').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase().slice(0,2)||'V';}
function makeChatId(){return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;}
function showToast(text){
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove('show'),2800);
}

function renderChats(filter=''){
  const q=String(filter).trim().toLowerCase();
  const visible=chats.filter(c=>c.name.toLowerCase().includes(q));
  list.innerHTML=visible.length?visible.map(c=>{
    const last=c.messages[c.messages.length-1];
    return `<article class="conversation ${selectedId===c.id?'active':''}" data-chat="${escapeHtml(c.id)}">
      <div class="avatar">${escapeHtml(c.initials)}</div>
      <div class="conv-body"><div class="conv-row"><strong>${escapeHtml(c.name)}</strong><span class="conv-time">${escapeHtml(c.time||'')}</span></div>
      <div class="conv-row"><div class="conv-preview">${escapeHtml(last?.text??'')}</div>${c.unread?`<span class="unread">${c.unread}</span>`:''}</div></div>
    </article>`;
  }).join(''):'<div class="status-card"><p>Aucune discussion trouvée.</p></div>';
  const badge=$('#chatBadge');
  if(badge) badge.textContent=String(chats.filter(c=>c.unread>0).reduce((n,c)=>n+c.unread,0));
}

function renderMessages(items){
  messages.innerHTML=items.length?items.map(m=>{
    const mine=m.uid===currentUser?.uid||m.direction==='out';
    const reaction=m.reaction ? `<span class="message-reaction">${escapeHtml(m.reaction)}</span>`:'';
    const once=m.viewOnce ? ' 👁️' : '';
    return `<div class="message ${mine?'out':'in'}" data-message="${escapeHtml(m.id||'')}">${escapeHtml(m.text||'')}${once}${reaction}<span class="message-time">${escapeHtml(m.time||nowTime())} ${mine?'✓✓':''}</span></div>`;
  }).join(''):'<div class="status-card"><p>Commencez la conversation.</p></div>';
  messages.scrollTop=messages.scrollHeight;
}

async function ensureChatMembership(chatId){
  if(!FIREBASE_ENABLED||!rtdb||!currentUser||!fb||!chatId||isDemo(chatId)) return false;
  try{
    const memberRef=fb.databaseRef(rtdb,`chatMembers/${chatId}/${currentUser.uid}`);
    const snapshot=await new Promise((resolve,reject)=>fb.onValue(memberRef,resolve,reject,{onlyOnce:true}));
    if(snapshot.val()===true) return true;
    await fb.set(memberRef,true);
    await fb.set(fb.databaseRef(rtdb,`userChats/${currentUser.uid}/${chatId}`),true);
    return true;
  }catch(error){
    console.warn('Chat membership:',error);
    showToast(`Accès à la discussion impossible : ${error.message}`);
    return false;
  }
}

async function loadUserChats(){
  if(!FIREBASE_ENABLED||!rtdb||!currentUser||!fb) return;
  if(unsubscribeUserChats) unsubscribeUserChats();
  const userChatsRef=fb.databaseRef(rtdb,`userChats/${currentUser.uid}`);
  unsubscribeUserChats=fb.onValue(userChatsRef,async snap=>{
    const ids=Object.keys(snap.val()||{});
    const loaded=[];
    for(const id of ids){
      try{
        const chatSnap=await new Promise((resolve,reject)=>fb.onValue(fb.databaseRef(rtdb,`chats/${id}`),resolve,reject,{onlyOnce:true}));
        const data=chatSnap.val();
        if(data) loaded.push({id,name:data.name,initials:initials(data.name),presence:'en ligne',time:'',unread:0,messages:[]});
      }catch(error){console.warn('Load chat:',id,error);}
    }
    const demos=chats.filter(c=>isDemo(c.id));
    chats=[...demos,...loaded];
    renderChats($('#searchInput').value);
    if(selectedId && !chats.some(c=>c.id===selectedId)) selectedId=null;
  },error=>console.warn('User chats:',error));
}

async function createChat(){
  if(!FIREBASE_ENABLED||!currentUser||!fb){showToast('Firebase n’est pas disponible.');return;}
  const name=prompt('Nom de la discussion :');
  if(!name||!name.trim()) return;
  const clean=name.trim().slice(0,120);
  const chatId=makeChatId();
  const chatRef=fb.databaseRef(rtdb,`chats/${chatId}`);
  const memberRef=fb.databaseRef(rtdb,`chatMembers/${chatId}/${currentUser.uid}`);
  const userChatRef=fb.databaseRef(rtdb,`userChats/${currentUser.uid}/${chatId}`);
  try{
    await fb.set(chatRef,{name:clean,ownerUid:currentUser.uid,createdAt:fb.databaseServerTimestamp()});
    await fb.set(memberRef,true);
    await fb.set(userChatRef,true);
    const chat={id:chatId,name:clean,initials:initials(clean),presence:'en ligne',time:'',unread:0,messages:[]};
    chats=[...chats.filter(c=>c.id!==chatId),chat];
    renderChats($('#searchInput').value);
    openChat(chatId);
    showToast(`Discussion créée — ID : ${chatId}`);
  }catch(error){showToast(`Création impossible : ${error.message}`);}
}

async function joinChat(){
  if(!FIREBASE_ENABLED||!currentUser||!fb){showToast('Firebase n’est pas disponible.');return;}
  const chatId=prompt('Entrez l’identifiant de la discussion à rejoindre :');
  if(!chatId||!chatId.trim()) return;
  const id=chatId.trim();
  try{
    const chatSnap=await new Promise((resolve,reject)=>fb.onValue(fb.databaseRef(rtdb,`chats/${id}`),resolve,reject,{onlyOnce:true}));
    if(!chatSnap.exists()){showToast('Discussion introuvable.');return;}
    if(!await ensureChatMembership(id)) return;
    const data=chatSnap.val();
    if(!chats.some(c=>c.id===id)) chats.push({id,name:data.name,initials:initials(data.name),presence:'en ligne',time:'',unread:0,messages:[]});
    renderChats($('#searchInput').value);
    openChat(id);
    showToast('Discussion rejointe.');
  }catch(error){showToast(`Impossible de rejoindre : ${error.message}`);}
}

async function subscribeToChat(chatId){
  if(unsubscribeMessages) unsubscribeMessages();
  if(unsubscribeTyping) unsubscribeTyping();
  unsubscribeMessages=null;unsubscribeTyping=null;
  if(!FIREBASE_ENABLED||!rtdb||!currentUser||isDemo(chatId)||!fb) return;
  if(!await ensureChatMembership(chatId)) return;
  try{
    const messagesRef=fb.databaseRef(rtdb,`messages/${chatId}`);
    unsubscribeMessages=fb.onValue(messagesRef,snap=>{
      const raw=snap.val()||{};
      const items=Object.entries(raw).map(([id,data])=>({id,...data})).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
      const chat=chats.find(c=>c.id===chatId);
      if(chat){
        chat.messages=items.map(m=>({id:m.id,text:m.text||'',uid:m.uid,type:m.type,viewOnce:Boolean(m.viewOnce),reaction:m.reaction,time:m.createdAt?new Date(m.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):nowTime()}));
        chat.time=chat.messages.at(-1)?.time||chat.time;
      }
      renderMessages(items);renderChats($('#searchInput').value);
    },error=>showToast(`Realtime Database : ${error.message}`));

    const typingRef=fb.databaseRef(rtdb,`typing/${chatId}`);
    unsubscribeTyping=fb.onValue(typingRef,snap=>{
      const typing=snap.val()||{};
      const otherTyping=Object.entries(typing).some(([uid,value])=>uid!==currentUser.uid&&value===true);
      $('#chatPresence').textContent=otherTyping?'écrit…':(chats.find(c=>c.id===chatId)?.presence||'en ligne');
    });
  }catch(error){console.error('Realtime Database:',error);showToast('Realtime Database indisponible.');}
}

async function setupPresence(){
  if(!rtdb||!currentUser||!fb)return;
  try{
    const uid=currentUser.uid;
    const connectionsRef=fb.databaseRef(rtdb,`presence/${uid}/connections`);
    const lastOnlineRef=fb.databaseRef(rtdb,`presence/${uid}/lastOnline`);
    const connectedRef=fb.databaseRef(rtdb,'.info/connected');
    const statusRef=fb.databaseRef(rtdb,`presence/${uid}/status`);
    if(unsubscribePresence)unsubscribePresence();
    unsubscribePresence=fb.onValue(connectionsRef,snap=>{
      const online=Object.keys(snap.val()||{}).length>0;
      const profileCopy=document.querySelector('.profile-copy span');
      if(profileCopy)profileCopy.textContent=online?'Disponible':'Hors ligne';
    });
    fb.onValue(connectedRef,async snap=>{
      if(snap.val()!==true)return;
      const connection=fb.push(connectionsRef);
      await fb.onDisconnect(connection).remove();
      await fb.onDisconnect(lastOnlineRef).set(fb.databaseServerTimestamp());
      await fb.onDisconnect(statusRef).set({state:'offline',updatedAt:fb.databaseServerTimestamp()});
      await fb.set(connection,{connectedAt:fb.databaseServerTimestamp()});
      await fb.set(statusRef,{state:'online',updatedAt:fb.databaseServerTimestamp(),connectionId:connection.key});
    });
  }catch(error){console.warn('Presence sync:',error);}
}

async function setTyping(isTyping){
  if(!rtdb||!currentUser||!selectedId||isDemo(selectedId)||!fb)return;
  try{
    const typingRef=fb.databaseRef(rtdb,`typing/${selectedId}/${currentUser.uid}`);
    if(isTyping){await fb.set(typingRef,true);await fb.onDisconnect(typingRef).remove();}
    else await fb.remove(typingRef);
  }catch(error){console.warn('Typing sync:',error);}
}

function openChat(id){
  const chat=chats.find(c=>c.id===id);if(!chat)return;
  selectedId=id;chat.unread=0;
  $('#chatName').textContent=chat.name;$('#chatPresence').textContent=chat.presence;$('#chatAvatar').textContent=chat.initials;
  emptyState.classList.add('hidden');chatView.classList.remove('hidden');chatPanel.classList.add('open');
  renderMessages(chat.messages);renderChats($('#searchInput').value);subscribeToChat(id);messageInput.focus();
}

async function sendMessage(){
  const text=messageInput.value.trim();if(!text||!selectedId)return;
  const chat=chats.find(c=>c.id===selectedId);if(!chat)return;
  if(FIREBASE_ENABLED&&rtdb&&currentUser&&!isDemo(selectedId)&&fb){
    if(!await ensureChatMembership(selectedId))return;
    try{
      const messageRef=fb.push(fb.databaseRef(rtdb,`messages/${selectedId}`));
      await fb.set(messageRef,{text,uid:currentUser.uid,createdAt:fb.databaseServerTimestamp(),type:'text',viewOnce:false});
      await fb.set(fb.databaseRef(rtdb,`events/${currentUser.uid}/${messageRef.key}`),{type:'message_sent',chatId:selectedId,messageId:messageRef.key,createdAt:fb.databaseServerTimestamp()});
      await setTyping(false);
    }catch(error){showToast(`Impossible d'envoyer : ${error.message}`);return;}
  }else{
    chat.messages.push({text,direction:'out',time:nowTime(),uid:currentUser?.uid});chat.time=nowTime();renderMessages(chat.messages);renderChats($('#searchInput').value);
  }
  messageInput.value='';
}

async function reactToLastMessage(){
  if(!selectedId||!currentUser||!fb||isDemo(selectedId)){showToast('Les réactions sont disponibles dans les discussions synchronisées.');return;}
  const chat=chats.find(c=>c.id===selectedId);const last=chat?.messages?.at(-1);if(!last?.id)return;
  const reaction=prompt('Réaction : ❤️ 👍 😂 😮 😢 🙏');if(!reaction)return;
  try{await fb.set(fb.databaseRef(rtdb,`reactions/${selectedId}/${last.id}/${currentUser.uid}`),reaction.slice(0,16));showToast('Réaction enregistrée.');}
  catch(error){showToast(`Réaction impossible : ${error.message}`);}
}

async function sendSpecialMessage(type){
  if(!selectedId||!currentUser||!fb||isDemo(selectedId)){showToast('Fonction disponible dans les discussions synchronisées.');return;}
  const text=prompt(type==='view_once'?'Texte du message à vue unique :':'Texte du message :');if(!text?.trim())return;
  try{
    const messageRef=fb.push(fb.databaseRef(rtdb,`messages/${selectedId}`));
    await fb.set(messageRef,{text:text.trim().slice(0,2000),uid:currentUser.uid,createdAt:fb.databaseServerTimestamp(),type:'text',viewOnce:type==='view_once'});
    showToast(type==='view_once'?'Message à vue unique envoyé.':'Message envoyé.');
  }catch(error){showToast(`Envoi impossible : ${error.message}`);}
}

async function createStory(){
  if(!currentUser||!fb){showToast('Firebase n’est pas disponible.');return;}
  const text=prompt('Texte de votre actu (24 h) :');if(!text?.trim())return;
  const storyRef=fb.push(fb.databaseRef(rtdb,`stories/${currentUser.uid}`));
  const now=Date.now();
  try{await fb.set(storyRef,{text:text.trim().slice(0,2000),type:'text',createdAt:fb.databaseServerTimestamp(),expiresAt:now+86400000});showToast('Actu publiée pour 24 h.');renderStatus();}
  catch(error){showToast(`Publication impossible : ${error.message}`);}
}

async function renderStatus(){
  const now=Date.now();
  const cards=[];
  if(currentUser&&fb){
    try{
      const snap=await new Promise((resolve,reject)=>fb.onValue(fb.databaseRef(rtdb,`stories/${currentUser.uid}`),resolve,reject,{onlyOnce:true}));
      const raw=snap.val()||{};
      Object.entries(raw).filter(([,s])=>(s.expiresAt||0)>now).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).forEach(([id,s])=>cards.push(`<div class="status-item" data-story="${escapeHtml(id)}"><strong>Votre actu</strong><span>${escapeHtml(s.text||'')} · expire dans moins de 24 h</span></div>`));
    }catch(error){console.warn('Stories:',error);}
  }
  list.innerHTML=`<div class="status-card"><h2>Actus</h2><div class="status-item" id="createStory"><strong>+ Votre actu</strong><span>Publier un texte qui disparaît après 24 h.</span></div>${cards.join('')||'<div class="status-item"><strong>Aucune actu active</strong><span>Votre prochaine publication apparaîtra ici.</span></div>'}</div>`;
  $('#createStory')?.addEventListener('click',createStory);
}

function renderCalls(){list.innerHTML='<div class="calls-card"><h2>Appels</h2><p>Les appels audio et vidéo sont prêts à être branchés sur un service de signalisation WebRTC. La base temps réel reste Firebase Realtime Database.</p></div>';}

function openMenu(){
  const action=prompt('Menu Vibe :\n1. Rejoindre une discussion\n2. Publier une actu\n3. Envoyer une vue unique\n4. Réagir au dernier message\n5. Actualiser les données');
  if(action==='1')joinChat();
  else if(action==='2')createStory();
  else if(action==='3')sendSpecialMessage('view_once');
  else if(action==='4')reactToLastMessage();
  else if(action==='5'){loadUserChats();if(selectedId)subscribeToChat(selectedId);showToast('Données actualisées.');}
}

$('#messageForm').addEventListener('submit',e=>{e.preventDefault();sendMessage();});
list.addEventListener('click',e=>{const item=e.target.closest('[data-chat]');if(item)openChat(item.dataset.chat);});
$('#searchInput').addEventListener('input',e=>renderChats(e.target.value));
$('#backBtn').addEventListener('click',()=>chatPanel.classList.remove('open'));
$('#emojiBtn').addEventListener('click',()=>{messageInput.value+=(messageInput.value?' ':'')+'😊';messageInput.focus();});
messageInput.addEventListener('input',()=>setTyping(messageInput.value.trim().length>0));
$('#attachBtn').addEventListener('click',()=>showToast('Les pièces jointes binaires nécessitent un stockage média dédié ; RTDB gère ici les métadonnées temps réel.'));
$('#fileInput').addEventListener('change',e=>{e.target.value='';showToast('Aucun fichier n’a été envoyé : le stockage média n’est pas activé.');});
$('#newChatBtn').addEventListener('click',createChat);
$('#menuBtn').addEventListener('click',openMenu);
$('#chatMenuBtn').addEventListener('click',openMenu);
$('#profileBtn').addEventListener('click',()=>showToast(currentUser?`Connecté : ${currentUser.uid.slice(0,8)}…`:'Profil Vibe'));

document.querySelectorAll('.chat-actions .glass-btn').forEach((button,index)=>{
  if(button.id==='chatMenuBtn')return;
  button.addEventListener('click',()=>showToast(index===0?'Appel audio : signalisation à connecter.':'Appel vidéo : signalisation à connecter.'));
});

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active');
  const view=tab.dataset.view;
  if(view==='chats'){renderChats($('#searchInput').value);return;}
  if(view==='status'){renderStatus();return;}
  renderCalls();
}));
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus();}});

async function loadFirebase(){
  try{
    const config=await import('./firebase-config.js');if(!config.FIREBASE_ENABLED)return;
    const mod=await import('./firebase-client.js');fb=mod;
    FIREBASE_ENABLED=Boolean(mod.FIREBASE_ENABLED&&mod.auth&&mod.rtdb);auth=mod.auth;rtdb=mod.rtdb;if(!FIREBASE_ENABLED)return;
    mod.onAuthStateChanged(auth,async user=>{
      currentUser=user;
      if(user){await setupPresence();await loadUserChats();}
      renderChats($('#searchInput').value);
      if(selectedId)subscribeToChat(selectedId);
    });
    if(!auth.currentUser)await mod.signInAnonymously(auth);
  }catch(error){
    FIREBASE_ENABLED=false;auth=null;rtdb=null;console.warn('Vibe Realtime Database indisponible:',error);showToast('Vibe est prêt en mode démo.');
  }
}

renderChats();
loadFirebase();
