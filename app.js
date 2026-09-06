import {
  auth, db, storage, FIREBASE_ENABLED,
  onAuthStateChanged, signInAnonymously,
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc,
  ref, uploadBytes, getDownloadURL
} from './firebase-client.js';

const demoChats = [
  { id:'amina', name:'Amina', initials:'A', presence:'en ligne', time:'21:42', unread:2, messages:[
    {text:'Salut 👋 Bienvenue sur Vibe !',direction:'in',time:'21:39'},
    {text:'Merci ! On construit une vraie messagerie ici.',direction:'out',time:'21:40'},
    {text:'Exactement 😄',direction:'in',time:'21:42'}
  ]},
  { id:'groupe', name:'Groupe Vibe', initials:'V', presence:'5 participants', time:'20:18', unread:1, messages:[
    {text:'Le nouveau design est prêt.',direction:'in',time:'20:16'},
    {text:'Parfait, on continue !',direction:'out',time:'20:18'}
  ]},
  { id:'moussa', name:'Moussa', initials:'M', presence:'vu récemment', time:'18:03', unread:0, messages:[
    {text:'À demain 👍',direction:'in',time:'18:03'}
  ]}
];

let chats = structuredClone(demoChats);
let selectedId = null;
let currentUser = null;
let unsubscribeMessages = null;

const $ = s => document.querySelector(s);
const list = $('#conversationList');
const messages = $('#messages');
const chatPanel = $('#chatPanel');
const emptyState = $('#emptyState');
const chatView = $('#chatView');
const messageInput = $('#messageInput');
const toast = $('#toast');

function escapeHtml(v){
  return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function nowTime(){return new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}
function chatIdFor(a,b){return [a,b].sort().join('_');}
function initials(name){return String(name||'?').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase() || '?';}

function renderChats(filter=''){
  const q = filter.trim().toLowerCase();
  const visible = chats.filter(c => c.name.toLowerCase().includes(q));
  list.innerHTML = visible.length ? visible.map(c => {
    const last = c.messages.at(-1);
    return `<article class="conversation ${selectedId===c.id?'active':''}" data-chat="${escapeHtml(c.id)}">
      <div class="avatar">${escapeHtml(c.initials)}</div>
      <div class="conv-body"><div class="conv-row"><strong>${escapeHtml(c.name)}</strong><span class="conv-time">${escapeHtml(c.time||'')}</span></div>
      <div class="conv-row"><div class="conv-preview">${escapeHtml(last?.text??'')}</div>${c.unread?`<span class="unread">${c.unread}</span>`:''}</div></div>
    </article>`;
  }).join('') : '<div class="status-card"><p>Aucune discussion trouvée.</p></div>';
}

function renderMessages(items){
  messages.innerHTML = items.length ? items.map(m => `<div class="message ${m.uid===currentUser?.uid?'out':'in'}">${escapeHtml(m.text||'')}<span class="message-time">${escapeHtml(m.time||nowTime())} ${m.uid===currentUser?.uid?'✓✓':''}</span></div>`).join('') : '<div class="status-card"><p>Commencez la conversation.</p></div>';
  messages.scrollTop = messages.scrollHeight;
}

function subscribeToChat(chatId){
  if(unsubscribeMessages) unsubscribeMessages();
  if(!FIREBASE_ENABLED || !db || !currentUser) return;
  const q = query(collection(db,'chats',chatId,'messages'),orderBy('createdAt','asc'));
  unsubscribeMessages = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({id:d.id,...d.data()}));
    const chat = chats.find(c=>c.id===chatId);
    if(chat){
      chat.messages = items.map(m=>({text:m.text||'',uid:m.uid,time:m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : nowTime()}));
      chat.time = chat.messages.at(-1)?.time || chat.time;
    }
    renderMessages(items.map(m=>({text:m.text,uid:m.uid,time:m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : nowTime()})));
    renderChats($('#searchInput').value);
  }, error => showToast(`Firebase : ${error.message}`));
}

async function ensureUserProfile(user){
  if(!db || !user) return;
  await setDoc(doc(db,'users',user.uid),{
    uid:user.uid,
    displayName:user.displayName || 'Utilisateur Vibe',
    photoURL:user.photoURL || '',
    lastSeen:serverTimestamp()
  },{merge:true});
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
  if(FIREBASE_ENABLED && currentUser && !id.startsWith('demo-')) subscribeToChat(id);
  messageInput.focus();
}

async function sendMessage(){
  const text=messageInput.value.trim();
  if(!text || !selectedId) return;
  const chat=chats.find(c=>c.id===selectedId);
  if(!chat) return;

  if(FIREBASE_ENABLED && db && currentUser && !selectedId.startsWith('demo-')){
    try{
      await addDoc(collection(db,'chats',selectedId,'messages'),{
        text,
        uid:currentUser.uid,
        createdAt:serverTimestamp()
      });
      await setDoc(doc(db,'chats',selectedId),{
        updatedAt:serverTimestamp(),
        lastMessage:text,
        lastSenderId:currentUser.uid
      },{merge:true});
    }catch(error){showToast(`Impossible d'envoyer : ${error.message}`);return;}
  }else{
    chat.messages.push({text,direction:'out',time:nowTime(),uid:currentUser?.uid});
    chat.time=nowTime();
    renderMessages(chat.messages);
    renderChats($('#searchInput').value);
  }
  messageInput.value='';
}

function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2400);}

$('#messageForm').addEventListener('submit',e=>{e.preventDefault();sendMessage();});
list.addEventListener('click',e=>{const item=e.target.closest('[data-chat]');if(item)openChat(item.dataset.chat);});
$('#searchInput').addEventListener('input',e=>renderChats(e.target.value));
$('#backBtn').addEventListener('click',()=>chatPanel.classList.remove('open'));
$('#emojiBtn').addEventListener('click',()=>{messageInput.value+=(messageInput.value?' ':'')+'😊';messageInput.focus();});
$('#attachBtn').addEventListener('click',()=>$('#fileInput').click());
$('#fileInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0]; e.target.value='';
  if(!file) return;
  if(!FIREBASE_ENABLED || !storage || !currentUser){showToast(`Fichier sélectionné : ${file.name}`);return;}
  try{
    const path=`users/${currentUser.uid}/uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const snapshot=await uploadBytes(ref(storage,path),file);
    const url=await getDownloadURL(snapshot.ref);
    if(selectedId && db){
      await addDoc(collection(db,'chats',selectedId,'messages'),{text:`📎 ${file.name}`,fileName:file.name,fileUrl:url,uid:currentUser.uid,createdAt:serverTimestamp()});
    }
    showToast('Fichier envoyé dans Firebase.');
  }catch(error){showToast(`Upload impossible : ${error.message}`);}
});
$('#newChatBtn').addEventListener('click',()=>showToast('Créez une discussion avec un utilisateur Firebase.'));
$('#menuBtn').addEventListener('click',()=>showToast('Menu Vibe'));
$('#chatMenuBtn').addEventListener('click',()=>showToast('Options de discussion'));
$('#profileBtn').addEventListener('click',()=>showToast(currentUser?`Connecté : ${currentUser.uid.slice(0,8)}…`:'Profil Vibe'));

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  tab.classList.add('active');
  const view=tab.dataset.view;
  if(view==='chats'){renderChats();return;}
  list.innerHTML=view==='status'?'<div class="status-card"><h2>Actus</h2><div class="status-item"><strong>Votre actu</strong><span>Partagez une photo, une vidéo ou un texte.</span></div><div class="status-item"><strong>Actualités</strong><span>Les publications de vos contacts apparaîtront ici.</span></div></div>':'<div class="calls-card"><h2>Appels</h2><p>Vos appels récents apparaîtront ici.</p></div>';
}));
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus();}});

async function bootFirebase(){
  if(!FIREBASE_ENABLED || !auth){
    renderChats();
    console.info('Vibe: Firebase config not active; demo mode.');
    return;
  }
  onAuthStateChanged(auth, async user=>{
    currentUser=user;
    if(user){
      await ensureUserProfile(user);
      showToast('Firebase connecté ✓');
    }
    renderChats($('#searchInput').value);
  });
  try{
    if(!auth.currentUser) await signInAnonymously(auth);
  }catch(error){
    console.error(error);
    showToast(`Auth Firebase : ${error.message}`);
  }
}

renderChats();
bootFirebase();
