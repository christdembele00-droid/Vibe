import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, setDoc, serverTimestamp, arrayUnion, limit, getDocs } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const roomId=(a,b)=>[a,b].sort().join('__');
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR').trim().replace(/\s+/g,' ');
const toast=text=>{const el=$('toast');if(!el)return;el.textContent=text;el.style.display='block';clearTimeout(window.__vibeEnhToast);window.__vibeEnhToast=setTimeout(()=>el.style.display='none',2800)};
let uid=null,users=[],groups=[];let usersUnsub=null,groupsUnsub=null,roomsUnsub=null;const roomUnsubs=new Map();const unread=new Map();let filter='all',internalSearch=false,lastRoom=null,sorting=false,activeTimer=null;
let typingTimer=null,typingUnsub=null,typingRoom=null,replyDraft=null,replyObserver=null;

function unreadKey(room){return `vibe:unread:${uid}:${room}`}
function getUnread(room){return unread.has(room)?unread.get(room):Number(localStorage.getItem(unreadKey(room))||0)}
function setUnread(room,n){n=Math.max(0,Number(n)||0);unread.set(room,n);if(n)localStorage.setItem(unreadKey(room),String(n));else localStorage.removeItem(unreadKey(room))}
function clearUnread(room){if(room)setUnread(room,0)}
function activeTarget(){const t=window.VIBE_CURRENT_USER;return t&&!t.channel?t:null}
function activeRoom(){const t=activeTarget();if(!uid||!t)return null;return t.group?t.id:roomId(uid,t.uid)}

function rerenderDirectory(){
  const input=$('search');if(!input)return;
  const term=normalize(input.value);
  if(term){
    const byEmail=users.find(u=>normalize(u.email)===term||normalize(u.email).includes(term));
    if(byEmail&&normalize(byEmail.name)!==term&&!internalSearch){
      internalSearch=true;input.value=byEmail.name||'';input.dispatchEvent(new Event('input',{bubbles:true}));
      setTimeout(()=>{input.value=term;internalSearch=false},0);return
    }
  }
  if(filter!=='unread')return;
  const box=$('contacts');if(!box)return;
  [...box.querySelectorAll('.contact')].forEach(el=>{
    if(el.dataset.vibeChannel==='true')return;
    const id=el.dataset.id;const user=users.find(u=>u.uid===id);const room=user?roomId(uid,id):id;
    if(!getUnread(room))el.remove()
  })
}

function sortRenderedContacts(){
  if(sorting)return;
  const box=$('contacts');if(!box)return;
  const children=[...box.querySelectorAll(':scope > .contact')];
  if(children.length<2)return;
  const rank=el=>{if(el.dataset.vibeChannel==='true')return[-1,''];const id=el.dataset.id;const u=users.find(x=>x.uid===id);if(u)return[Number(!u.online),normalize(u.name)];const g=groups.find(x=>x.id===id);return[2,normalize(g?.name)]};
  children.sort((a,b)=>{const ra=rank(a),rb=rank(b);return ra[0]-rb[0]||ra[1].localeCompare(rb[1],'fr')});
  sorting=true;
  try{const frag=document.createDocumentFragment();children.forEach(el=>frag.appendChild(el));box.appendChild(frag)}finally{sorting=false}
  if(filter==='unread')rerenderDirectory()
}

function setupSearch(){
  const input=$('search');if(!input)return;
  input.addEventListener('input',()=>{if(internalSearch)return;rerenderDirectory()},true);
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';internalSearch=true;input.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>internalSearch=false,0)}},true);
  $('clearSearch')?.addEventListener('click',e=>{e.preventDefault();input.value='';internalSearch=true;input.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>{internalSearch=false;input.focus()},0)},true);
  document.querySelectorAll('.pill').forEach(p=>p.addEventListener('click',()=>{filter=p.dataset.filter||'all';setTimeout(rerenderDirectory,0)},true));
}

function watchRoom(room){
  if(roomUnsubs.has(room))return;
  const q=query(collection(db,'rooms',room,'messages'),orderBy('createdAt','desc'),limit(20));
  let initialized=false;
  const unsub=onSnapshot(q,snap=>{
    if(!initialized){initialized=true;return}
    snap.docChanges().filter(c=>c.type==='added').forEach(c=>{
      const m=c.doc.data();if(!m?.sender||m.sender===uid)return;
      if(activeRoom()===room){updateDoc(doc(db,'rooms',room,'messages',c.doc.id),{readBy:arrayUnion(uid)}).catch(()=>{});clearUnread(room)}
      else{setUnread(room,getUnread(room)+1);rerenderDirectory()}
    });
    if(activeRoom()===room){snap.forEach(c=>{const m=c.data();if(m.sender!==uid&&!m.readBy?.includes(uid))updateDoc(doc(db,'rooms',room,'messages',c.id),{readBy:arrayUnion(uid)}).catch(()=>{})});clearUnread(room)}
  },()=>{});
  roomUnsubs.set(room,unsub)
}

function setupRooms(){
  roomsUnsub?.();roomsUnsub=onSnapshot(query(collection(db,'rooms'),where('participants','array-contains',uid)),snap=>snap.docs.forEach(d=>watchRoom(d.id)),()=>{})
}

function stopTyping(){
  clearTimeout(typingTimer);typingTimer=null;
  const room=activeRoom();if(uid&&room)setDoc(doc(db,'rooms',room,'typing',uid),{active:false,updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});
}
function sendTyping(){
  const room=activeRoom();if(!uid||!room)return;
  setDoc(doc(db,'rooms',room,'typing',uid),{active:true,updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});
  clearTimeout(typingTimer);typingTimer=setTimeout(stopTyping,1800);
}
function setupTyping(){
  const input=$('message');if(!input)return;
  input.addEventListener('input',()=>{if(input.value.trim())sendTyping();else stopTyping()},true);
  input.addEventListener('blur',stopTyping,true);
}
function watchTyping(){
  typingUnsub?.();typingUnsub=null;typingRoom=null;
  const room=activeRoom();if(!room||!uid)return;
  typingRoom=room;
  typingUnsub=onSnapshot(collection(db,'rooms',room,'typing'),snap=>{
    const now=Date.now(),active=[];
    snap.forEach(d=>{const x=d.data();const ts=x.updatedAt?.toMillis?.()||0;if(d.id!==uid&&x.active&&now-ts<5000)active.push(d.id)});
    const el=$('typing');if(!el)return;
    if(!active.length){el.hidden=true;return}
    const names=active.map(id=>users.find(u=>u.uid===id)?.name||'Quelqu’un');
    el.textContent=names.length===1?`${names[0]} écrit…`:`${names.slice(0,3).join(', ')} écrivent…`;
    el.hidden=false;
  },()=>{});
}

function clearReply(){
  replyDraft=null;
  document.getElementById('vibeReplyBar')?.remove();
}
function setReply(id,messageEl){
  const text=messageEl.querySelector('.message-text')?.textContent||messageEl.querySelector('.reply')?.textContent||'Message';
  const sender=messageEl.classList.contains('sent')?'Vous':'Contact';
  replyDraft={id,text:text.slice(0,500),sender};
  let bar=document.getElementById('vibeReplyBar');
  if(!bar){
    bar=document.createElement('div');bar.id='vibeReplyBar';bar.className='vibe-reply-bar';
    const composer=$('composer');composer?.parentNode?.insertBefore(bar,composer);
  }
  bar.innerHTML=`<div><strong>↩ Répondre</strong><span>${escapeHtml(text.slice(0,160))}</span></div><button type="button" aria-label="Annuler la réponse">×</button>`;
  bar.querySelector('button')?.addEventListener('click',clearReply);
  $('message')?.focus();
}
function escapeHtml(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function decorateReplies(){
  const box=$('messages');if(!box)return;
  box.querySelectorAll('.msg:not([data-vibe-advanced])').forEach(el=>{
    el.dataset.vibeAdvanced='1';
    if(el.classList.contains('deleted'))return;
    const actions=el.querySelector('.message-actions');if(!actions)return;
    const b=document.createElement('button');b.type='button';b.textContent='↩';b.title='Répondre';b.setAttribute('aria-label','Répondre');
    b.addEventListener('click',e=>{e.stopPropagation();setReply(el.dataset.messageId,el)});
    actions.prepend(b);
  });
}
function setupReplyObserver(){
  const box=$('messages');if(!box)return;
  replyObserver?.disconnect();replyObserver=new MutationObserver(decorateReplies);replyObserver.observe(box,{childList:true});decorateReplies();
}

function interceptPrivateSend(){
  document.addEventListener('submit',async e=>{
    if(e.target?.id!=='composer'||window.VIBE_CHANNEL_ACTIVE)return;
    const t=activeTarget();if(!uid||!t)return;
    e.preventDefault();e.stopImmediatePropagation();
    const input=$('message'),text=input?.value.trim();if(!text)return;
    const room=activeRoom();if(!room)return toast('Ouvre une discussion avant d’envoyer un message.');
    const participants=t.group?[...new Set(t.participants||[])]:[...new Set([uid,t.uid])];
    if(!participants.includes(uid))participants.push(uid);
    try{
      await setDoc(doc(db,'rooms',room),{participants,group:!!t.group,groupName:t.group?(t.name||'Groupe'):null,updatedAt:serverTimestamp()},{merge:true});
      const payload={sender:uid,receiver:t.group?null:t.uid,text:text.slice(0,4000),createdAt:serverTimestamp(),readBy:[uid]};
      if(replyDraft){payload.replyTo=replyDraft.id;payload.replyText=replyDraft.text.slice(0,500);payload.replySender=replyDraft.sender}
      await addDoc(collection(db,'rooms',room,'messages'),payload);
      input.value='';clearReply();stopTyping();input.focus();clearUnread(room)
    }catch(err){toast('Message non envoyé : '+(err?.code||err?.message||'erreur Firestore'))}
  },true)
}

function openGlobalSearch(){
  let dialog=document.getElementById('vibeGlobalSearch');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='vibeGlobalSearch';dialog.className='vibe-global-search';
    dialog.innerHTML='<div class="vgs-head"><div><strong>Recherche globale</strong><small>Recherche dans les messages récents de tes conversations</small></div><button type="button" data-close>×</button></div><div class="vgs-form"><input id="vgsInput" placeholder="Rechercher un mot ou une phrase…" autocomplete="off"><button id="vgsRun" type="button"><i class="fa-solid fa-magnifying-glass"></i></button></div><div id="vgsResults" class="vgs-results"><div class="empty"><b>Recherche dans VIBE</b><small>Entre au moins 2 caractères.</small></div></div>';
    document.body.appendChild(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
    dialog.querySelector('#vgsRun').onclick=runGlobalSearch;dialog.querySelector('#vgsInput').addEventListener('keydown',e=>{if(e.key==='Enter')runGlobalSearch()});
  }
  dialog.showModal();dialog.querySelector('#vgsInput')?.focus();
}
async function runGlobalSearch(){
  const input=$('vgsInput'),box=$('vgsResults'),term=normalize(input?.value);
  if(!uid||term.length<2)return toast('Entre au moins 2 caractères.');
  box.innerHTML='<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i><b>Recherche…</b><small>Analyse des messages récents.</small></div>';
  try{
    const roomsSnap=await getDocs(query(collection(db,'rooms'),where('participants','array-contains',uid)));
    const results=[];
    await Promise.all(roomsSnap.docs.slice(0,80).map(async rd=>{
      const rs=await getDocs(query(collection(db,'rooms',rd.id,'messages'),orderBy('createdAt','desc'),limit(100)));
      rs.forEach(md=>{const m=md.data();if(normalize(m.text).includes(term))results.push({id:md.id,room:rd.id,roomName:rd.data().group?rd.data().groupName:null,m});});
    }));
    results.sort((a,b)=>(b.m.createdAt?.toMillis?.()||0)-(a.m.createdAt?.toMillis?.()||0));
    if(!results.length){box.innerHTML='<div class="empty"><b>Aucun résultat</b><small>Aucun message récent ne correspond à ta recherche.</small></div>';return}
    box.replaceChildren();results.slice(0,80).forEach(r=>{
      const item=document.createElement('button');item.type='button';item.className='vgs-result';
      const sender=users.find(u=>u.uid===r.m.sender)?.name||(r.m.sender===uid?'Vous':'Utilisateur');
      item.innerHTML=`<strong>${escapeHtml(r.roomName||sender)}</strong><small>${escapeHtml(sender)} · ${escapeHtml(r.m.text||'')}</small>`;
      item.onclick=()=>{document.getElementById('vibeGlobalSearch')?.close();openResultRoom(r)};box.appendChild(item);
    });
  }catch(e){box.innerHTML='<div class="empty"><b>Recherche indisponible</b><small>Vérifie ta connexion puis réessaie.</small></div>';toast('Recherche impossible : '+(e?.message||'erreur'))}
}
function openResultRoom(r){
  const current=activeTarget();
  if(r.room===activeRoom())return highlightResult(r.id);
  if(r.roomName){toast('Résultat trouvé dans '+r.roomName+'. Ouvre ce groupe depuis Discussions pour le consulter.');return}
  const otherId=r.m.sender===uid?null:r.m.sender;
  if(otherId){const u=users.find(x=>x.uid===otherId);if(u){document.querySelector(`.contact[data-id="${CSS.escape(u.uid)}"]`)?.click();setTimeout(()=>highlightResult(r.id),500)}}
  else if(current)highlightResult(r.id);
}
function highlightResult(id){
  const el=document.querySelector(`.msg[data-message-id="${CSS.escape(id)}"]`);if(!el)return toast('Message hors de la fenêtre chargée.');
  el.classList.add('vibe-search-hit');el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.classList.remove('vibe-search-hit'),2200);
}
function setupGlobalSearch(){
  $('chatMenu')?.addEventListener('click',e=>{e.preventDefault();openGlobalSearch()},true);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'&&activeRoom()){e.preventDefault();openGlobalSearch()}});
}

function trackActiveRoom(){
  clearInterval(activeTimer);
  activeTimer=setInterval(()=>{const room=activeRoom();if(room!==lastRoom){stopTyping();lastRoom=room;if(room){clearUnread(room);watchTyping()}}},500);
}
function cleanup(){
  stopTyping();clearInterval(activeTimer);activeTimer=null;typingUnsub?.();typingUnsub=null;
  usersUnsub?.();groupsUnsub?.();roomsUnsub?.();roomUnsubs.forEach(u=>u());roomUnsubs.clear();usersUnsub=groupsUnsub=roomsUnsub=null;users=[];groups=[];unread.clear();lastRoom=null;clearReply()
}

function boot(){
  setupSearch();setupTyping();interceptPrivateSend();setupReplyObserver();setupGlobalSearch();trackActiveRoom();
  onAuthStateChanged(auth,user=>{
    cleanup();uid=user?.uid||null;
    if(!uid)return;
    usersUnsub=onSnapshot(collection(db,'users'),snap=>{users=snap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>u.uid&&u.uid!==uid);rerenderDirectory();sortRenderedContacts()},()=>{});
    groupsUnsub=onSnapshot(query(collection(db,'groups'),where('participants','array-contains',uid)),snap=>{groups=snap.docs.map(d=>({id:d.id,...d.data()}));rerenderDirectory();sortRenderedContacts()},()=>{});
    setupRooms();
  })
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
