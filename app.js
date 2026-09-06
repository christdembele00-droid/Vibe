import { firebaseConfig, FIREBASE_ENABLED } from './firebase-config.js';

const demoChats=[
{id:'amina',name:'Amina',initials:'A',presence:'en ligne',time:'21:42',unread:2,messages:[{text:'Salut 👋 Bienvenue sur Vibe !',direction:'in',time:'21:39'},{text:'Merci ! On construit une vraie messagerie ici.',direction:'out',time:'21:40'},{text:'Exactement 😄',direction:'in',time:'21:42'}]},
{id:'groupe',name:'Groupe Vibe',initials:'V',presence:'5 participants',time:'20:18',unread:1,messages:[{text:'Le nouveau design est prêt.',direction:'in',time:'20:16'},{text:'Parfait, on continue !',direction:'out',time:'20:18'}]},
{id:'moussa',name:'Moussa',initials:'M',presence:'vu récemment',time:'18:03',unread:0,messages:[{text:'À demain 👍',direction:'in',time:'18:03'}]}
];
let chats=structuredClone(demoChats),selectedId=null;
const $=s=>document.querySelector(s),list=$('#conversationList'),messages=$('#messages'),chatPanel=$('#chatPanel'),emptyState=$('#emptyState'),chatView=$('#chatView'),messageInput=$('#messageInput'),toast=$('#toast');
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderChats(filter=''){
 const q=filter.trim().toLowerCase();const visible=chats.filter(c=>c.name.toLowerCase().includes(q));
 list.innerHTML=visible.length?visible.map(c=>{const last=c.messages.at(-1);return `<article class="conversation ${selectedId===c.id?'active':''}" data-chat="${escapeHtml(c.id)}"><div class="avatar">${escapeHtml(c.initials)}</div><div class="conv-body"><div class="conv-row"><strong>${escapeHtml(c.name)}</strong><span class="conv-time">${escapeHtml(c.time)}</span></div><div class="conv-row"><div class="conv-preview">${escapeHtml(last?.text??'')}</div>${c.unread?`<span class="unread">${c.unread}</span>`:''}</div></div></article>`}).join(''):'<div class="status-card"><p>Aucune discussion trouvée.</p></div>';
}
function openChat(id){
 const chat=chats.find(c=>c.id===id);if(!chat)return;selectedId=id;chat.unread=0;$('#chatName').textContent=chat.name;$('#chatPresence').textContent=chat.presence;$('#chatAvatar').textContent=chat.initials;
 messages.innerHTML=chat.messages.map(m=>`<div class="message ${m.direction}">${escapeHtml(m.text)}<span class="message-time">${escapeHtml(m.time)} ${m.direction==='out'?'✓✓':''}</span></div>`).join('');emptyState.classList.add('hidden');chatView.classList.remove('hidden');chatPanel.classList.add('open');renderChats($('#searchInput').value);messages.scrollTop=messages.scrollHeight;messageInput.focus();
}
function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200)}
$('#messageForm').addEventListener('submit',e=>{e.preventDefault();const text=messageInput.value.trim();if(!text||!selectedId)return;const chat=chats.find(c=>c.id===selectedId),now=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});chat.messages.push({text,direction:'out',time:now});chat.time=now;messageInput.value='';openChat(selectedId)});
list.addEventListener('click',e=>{const item=e.target.closest('[data-chat]');if(item)openChat(item.dataset.chat)});
$('#searchInput').addEventListener('input',e=>renderChats(e.target.value));
$('#backBtn').addEventListener('click',()=>chatPanel.classList.remove('open'));
$('#emojiBtn').addEventListener('click',()=>{messageInput.value+=(messageInput.value?' ':'')+'😊';messageInput.focus()});
$('#attachBtn').addEventListener('click',()=>$('#fileInput').click());
$('#fileInput').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)showToast(`Fichier sélectionné : ${f.name}`);e.target.value='' });
$('#newChatBtn').addEventListener('click',()=>showToast('Nouvelle discussion — contacts Firebase à brancher.'));
$('#menuBtn').addEventListener('click',()=>showToast('Menu Vibe'));$('#chatMenuBtn').addEventListener('click',()=>showToast('Options de discussion'));$('#profileBtn').addEventListener('click',()=>showToast('Profil Vibe'));
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active');const view=tab.dataset.view;if(view==='chats'){renderChats();return}list.innerHTML=view==='status'?'<div class="status-card"><h2>Actus</h2><div class="status-item"><strong>Votre actu</strong><span>Partagez une photo, une vidéo ou un texte.</span></div><div class="status-item"><strong>Amina</strong><span>Nouvelle actu il y a 12 min.</span></div></div>':'<div class="calls-card"><h2>Appels</h2><p>Vos appels récents apparaîtront ici.</p></div>'}));
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus()}});
renderChats();
if(FIREBASE_ENABLED)console.info('Vibe: Firebase configuration detected.',firebaseConfig.projectId);else console.info('Vibe: demo mode — firebase-config.js still contains placeholders.');
