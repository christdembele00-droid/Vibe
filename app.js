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
let FIREBASE_ENABLED = false;
let auth = null, db = null, storage = null, rtdb = null;
let fb = null;
let presenceConnectionRef = null;

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

function renderChats(filter=''){
  const q = String(filter).trim().toLowerCase();
  const visible = chats.filter(c => c.name.toLowerCase().includes(q));
  list.innerHTML = visible.length ? visible.map(c => {
    const last = c.messages[c.messages.length-1];
    return `<article class="conversation ${selectedId===c.id?'active':''}" data-chat="${escapeHtml(c.id)}">
      <div class="avatar">${escapeHtml(c.initials)}</div>
      <div class="conv-body"><div class="conv-row"><strong>${escapeHtml(c.name)}</strong><span class="conv-time">${escapeHtml(c.time||'')}</span></div>
      <div class="conv-row"><div class="conv-preview">${escapeHtml(last?.text??'')}</div>${c.unread?`<span class="unread">${c.unread}</span>`:''}</div></div>
    </article>`;
  }).join('') : '<div class="status-card"><p>Aucune discussion trouvée.</p></div>';
}

function renderMessages(items){
  messages.innerHTML = items.length ? items.map(m => `<div class="message ${m.uid===currentUser?.uid || m.direction==='out'?'out':'in'}">${escapeHtml(m.text||'')}<span class="message-time">${escapeHtml(m.time||nowTime())} ${m.uid===currentUser?.uid?'✓✓':''}</span></div>`).join('') : '<div class="status-card"><p>Commencez la conversation.</p></div>';
  messages.scrollTop = messages.scrollHeight;
}

function subscribeToChat(chatId){
  if(unsubscribeMessages) unsubscribeMessages();
  if(unsubscribeTyping) unsubscribeTyping();
  unsubscribeMessages = null;
  unsubscribeTyping = null;
  if(!FIREBASE_ENABLED || !rtdb || !currentUser || isDemo(chatId) || !fb) return;

  try {
    const messagesRef = fb.databaseRef(rtdb, `messages/${chatId}`);
    unsubscribeMessages = fb.onValue(messagesRef, snap => {
      const raw = snap.val() || {};
      const items = Object.entries(raw)
        .map(([id,data]) => ({id,...data}))
        .sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
      const chat = chats.find(c=>c.id===chatId);
      if(chat){
        chat.messages = items.map(m=>({text:m.text||'',uid:m.uid,time:m.createdAt?new Date(m.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):nowTime()}));
        chat.time = chat.messages[chat.messages.length-1]?.time || chat.time;
      }
      renderMessages(items);
      renderChats($('#searchInput').value);
    }, error => showToast(`Firebase : ${error.message}`));

    const typingRef = fb.databaseRef(rtdb, `typing/${chatId}`);
    unsubscribeTyping = fb.onValue(typingRef, snap => {
      const typing = snap.val() || {};
      const otherTyping = Object.entries(typing).some(([uid,value])=>uid!==currentUser.uid && value === true);
      $('#chatPresence').textContent = otherTyping ? 'écrit…' : (chats.find(c=>c.id===chatId)?.presence || 'en ligne');
    });
  } catch(error) {
    console.error('Vibe Realtime Database error:',error);
    showToast('Mode démo activé.');
  }
}

async function setupPresence(){
  if(!rtdb || !currentUser || !fb) return;
  try {
    const uid = currentUser.uid;
    const connectionsRef = fb.databaseRef(rtdb, `presence/${uid}/connections`);
    const lastOnlineRef = fb.databaseRef(rtdb, `presence/${uid}/lastOnline`);
    const connectedRef = fb.databaseRef(rtdb, '.info/connected');
    const statusRef = fb.databaseRef(rtdb, `presence/${uid}/status`);

    if(unsubscribePresence) unsubscribePresence();
    unsubscribePresence = fb.onValue(connectionsRef, snap => {
      const connections = snap.val() || {};
      const online = Object.keys(connections).length > 0;
      const chat = selectedId && chats.find(c=>c.id===selectedId);
      if(chat && !isDemo(selectedId)) {
        chat.presence = online ? 'en ligne' : 'hors ligne';
        $('#chatPresence').textContent = chat.presence;
      }
    });

    fb.onValue(connectedRef, async snap => {
      if(snap.val() !== true) return;
      const connection = fb.push(connectionsRef);
      presenceConnectionRef = connection;

      // Queue the disconnect operations BEFORE marking this connection online.
      // This is the Firebase-recommended ordering for reliable presence.
      await fb.onDisconnect(connection).remove();
      await fb.onDisconnect(lastOnlineRef).set(fb.databaseServerTimestamp());
      await fb.onDisconnect(statusRef).set({
        state:'offline',
        updatedAt:fb.databaseServerTimestamp()
      });

      await fb.set(connection, {connectedAt:fb.databaseServerTimestamp()});
      await fb.set(statusRef, {
        state:'online',
        updatedAt:fb.databaseServerTimestamp(),
        connectionId:connection.key
      });
    });
  } catch(error){console.warn('Presence sync:',error);}
}

async function setTyping(isTyping){
  if(!rtdb || !currentUser || !selectedId || isDemo(selectedId) || !fb) return;
  try {
    const typingRef = fb.databaseRef(rtdb, `typing/${selectedId}/${currentUser.uid}`);
    if(isTyping){
      await fb.set(typingRef, true);
      await fb.onDisconnect(typingRef).remove();
    } else {
      await fb.remove(typingRef);
    }
  } catch(error){ console.warn('Typing sync:', error); }
}

async function ensureUserProfile(user){
  if(!db || !user || !fb) return;
  try {
    await fb.setDoc(fb.doc(db,'users',user.uid),{
      uid:user.uid,
      displayName:user.displayName || 'Utilisateur Vibe',
      photoURL:user.photoURL || '',
      lastSeen:fb.serverTimestamp()
    },{merge:true});
  } catch(error){ console.warn('Profile sync:', error); }
}

function openChat(id){
  const chat = chats.find(c=>c.id===id);
  if(!chat) return;
  selectedId=id;
  chat.unread=0;
  $('#chatName').textContent=chat.name;
  $('#chatPresence').textContent=chat.presence;
  $('#chatAvatar').textContent=chat.initials;
  emptyState.classList.add('hidden');
  chatView.classList.remove('hidden');
  chatPanel.classList.add('open');
  renderMessages(chat.messages);
  renderChats($('#searchInput').value);
  subscribeToChat(id);
  messageInput.focus();
}

async function sendMessage(){
  const text=messageInput.value.trim();
  if(!text || !selectedId) return;
  const chat=chats.find(c=>c.id===selectedId);
  if(!chat) return;

  if(FIREBASE_ENABLED && rtdb && currentUser && !isDemo(selectedId) && fb){
    try{
      const messageRef=fb.push(fb.databaseRef(rtdb,`messages/${selectedId}`));
      await fb.set(messageRef,{
        text,
        uid:currentUser.uid,
        createdAt:fb.databaseServerTimestamp(),
        type:'text'
      });
      await fb.set(fb.databaseRef(rtdb,`events/${currentUser.uid}/${messageRef.key}`),{
        type:'message_sent',chatId:selectedId,messageId:messageRef.key,createdAt:fb.databaseServerTimestamp()
      });
      await setTyping(false);
    }catch(error){showToast(`Impossible d'envoyer : ${error.message}`);return;}
  }else{
    chat.messages.push({text,direction:'out',time:nowTime(),uid:currentUser?.uid});
    chat.time=nowTime();
    renderMessages(chat.messages);
    renderChats($('#searchInput').value);
  }
  messageInput.value='';
}

function showToast(text){
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove('show'),2400);
}

$('#messageForm').addEventListener('submit',e=>{e.preventDefault();sendMessage();});
list.addEventListener('click',e=>{const item=e.target.closest('[data-chat]');if(item)openChat(item.dataset.chat);});
$('#searchInput').addEventListener('input',e=>renderChats(e.target.value));
$('#backBtn').addEventListener('click',()=>chatPanel.classList.remove('open'));
$('#emojiBtn').addEventListener('click',()=>{messageInput.value+=(messageInput.value?' ':'')+'😊';messageInput.focus();});
messageInput.addEventListener('input',()=>setTyping(messageInput.value.trim().length>0));
$('#attachBtn').addEventListener('click',()=>$('#fileInput').click());
$('#fileInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0]; e.target.value='';
  if(!file) return;
  if(!FIREBASE_ENABLED || !storage || !currentUser || !fb){showToast(`Fichier sélectionné : ${file.name}`);return;}
  try{
    const path=`users/${currentUser.uid}/uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const snapshot=await fb.uploadBytes(fb.ref(storage,path),file);
    const url=await fb.getDownloadURL(snapshot.ref);
    if(selectedId && rtdb && !isDemo(selectedId)){
      const messageRef=fb.push(fb.databaseRef(rtdb,`messages/${selectedId}`));
      await fb.set(messageRef,{text:`📎 ${file.name}`,fileName:file.name,fileUrl:url,uid:currentUser.uid,createdAt:fb.databaseServerTimestamp(),type:'file'});
      await fb.set(fb.databaseRef(rtdb,`events/${currentUser.uid}/${messageRef.key}`),{type:'file_sent',chatId:selectedId,messageId:messageRef.key,createdAt:fb.databaseServerTimestamp()});
    }
    showToast('Fichier envoyé dans Firebase.');
  }catch(error){showToast(`Upload impossible : ${error.message}`);}
});
$('#newChatBtn').addEventListener('click',()=>showToast('Nouvelle discussion bientôt disponible.'));
$('#menuBtn').addEventListener('click',()=>showToast('Menu Vibe'));
$('#chatMenuBtn').addEventListener('click',()=>showToast('Options de discussion'));
$('#profileBtn').addEventListener('click',()=>showToast(currentUser?`Connecté : ${currentUser.uid.slice(0,8)}…`:'Profil Vibe'));

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  tab.classList.add('active');
  const view=tab.dataset.view;
  if(view==='chats'){renderChats($('#searchInput').value);return;}
  list.innerHTML=view==='status'?'<div class="status-card"><h2>Actus</h2><div class="status-item"><strong>Votre actu</strong><span>Partagez une photo, une vidéo ou un texte.</span></div><div class="status-item"><strong>Actualités</strong><span>Les publications de vos contacts apparaîtront ici.</span></div></div>':'<div class="calls-card"><h2>Appels</h2><p>Vos appels récents apparaîtront ici.</p></div>';
}));
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus();}});

async function loadFirebase(){
  try{
    const config = await import('./firebase-config.js');
    if(!config.FIREBASE_ENABLED) return;
    const mod = await import('./firebase-client.js');
    fb = mod;
    FIREBASE_ENABLED = Boolean(mod.FIREBASE_ENABLED && mod.auth && mod.rtdb);
    auth = mod.auth; db = mod.db; storage = mod.storage; rtdb = mod.rtdb;
    if(!FIREBASE_ENABLED) return;
    mod.onAuthStateChanged(auth, async user=>{
      currentUser=user;
      if(user){
        await ensureUserProfile(user);
        await setupPresence();
      }
      renderChats($('#searchInput').value);
      if(selectedId) subscribeToChat(selectedId);
    });
    if(!auth.currentUser) await mod.signInAnonymously(auth);
  }catch(error){
    FIREBASE_ENABLED=false;
    auth=null; db=null; storage=null; rtdb=null;
    console.warn('Vibe Firebase indisponible, mode démo:',error);
    showToast('Vibe est prêt en mode démo.');
  }
}

renderChats();
loadFirebase();
