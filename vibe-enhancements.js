import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, setDoc, serverTimestamp, arrayUnion, limit } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const roomId=(a,b)=>[a,b].sort().join('__');
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR').trim().replace(/\s+/g,' ');
const toast=text=>{const el=$('toast');if(!el)return;el.textContent=text;el.style.display='block';clearTimeout(window.__vibeEnhToast);window.__vibeEnhToast=setTimeout(()=>el.style.display='none',2800)};
let uid=null,users=[],groups=[];let usersUnsub=null,groupsUnsub=null,roomsUnsub=null;const roomUnsubs=new Map();const unread=new Map();let filter='all',internalSearch=false,lastRoom=null,sorting=false;

function unreadKey(room){return `vibe:unread:${uid}:${room}`}
function getUnread(room){return unread.has(room)?unread.get(room):Number(localStorage.getItem(unreadKey(room))||0)}
function setUnread(room,n){n=Math.max(0,Number(n)||0);unread.set(room,n);if(n)localStorage.setItem(unreadKey(room),String(n));else localStorage.removeItem(unreadKey(room))}
function clearUnread(room){if(room)setUnread(room,0)}
function activeTarget(){const t=window.VIBE_CURRENT_USER;return t&&!t.channel?t:null}
function activeRoom(){const t=activeTarget();if(!uid||!t)return null;return t.group?t.id:roomId(uid,t.uid)}
function escapeHtml(value){return String(value??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}

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
  sorting=true;
  const rank=el=>{if(el.dataset.vibeChannel==='true')return[-1,''];const id=el.dataset.id;const u=users.find(x=>x.uid===id);if(u)return[Number(!u.online),normalize(u.name)];const g=groups.find(x=>x.id===id);return[2,normalize(g?.name)]};
  children.sort((a,b)=>{const ra=rank(a),rb=rank(b);return ra[0]-rb[0]||ra[1].localeCompare(rb[1],'fr')});
  children.forEach(el=>box.appendChild(el));
  sorting=false;
  if(filter==='unread')rerenderDirectory()
}

function observeDirectory(){
  const box=$('contacts');if(!box)return;
  const observer=new MutationObserver(()=>{if(!internalSearch)sortRenderedContacts()});
  observer.observe(box,{childList:true})
}

function setupSearch(){
  const input=$('search');if(!input)return;
  input.addEventListener('input',e=>{if(internalSearch)return;e.stopImmediatePropagation();rerenderDirectory()},true);
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';internalSearch=true;input.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>internalSearch=false,0)}},true);
  $('clearSearch')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();input.value='';internalSearch=true;input.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>{internalSearch=false;input.focus()},0)},true);
  document.querySelectorAll('.pill').forEach(p=>p.addEventListener('click',e=>{e.stopImmediatePropagation();filter=p.dataset.filter||'all';setTimeout(rerenderDirectory,0)},true))
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
      await addDoc(collection(db,'rooms',room,'messages'),{sender:uid,receiver:t.group?null:t.uid,text:text.slice(0,4000),createdAt:serverTimestamp(),readBy:[uid]});
      input.value='';input.focus();clearUnread(room)
    }catch(err){toast('Message non envoyé : '+(err?.code||err?.message||'erreur Firestore'))}
  },true)
}

function trackActiveRoom(){setInterval(()=>{const room=activeRoom();if(room!==lastRoom){lastRoom=room;if(room)clearUnread(room)}},500)}

function boot(){
  setupSearch();interceptPrivateSend();trackActiveRoom();observeDirectory();
  onAuthStateChanged(auth,user=>{
    usersUnsub?.();groupsUnsub?.();roomsUnsub?.();roomUnsubs.forEach(u=>u());roomUnsubs.clear();
    uid=user?.uid||null;users=[];groups=[];unread.clear();lastRoom=null;
    if(!uid)return;
    usersUnsub=onSnapshot(collection(db,'users'),snap=>{users=snap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>u.uid&&u.uid!==uid);rerenderDirectory();sortRenderedContacts()},()=>{});
    groupsUnsub=onSnapshot(query(collection(db,'groups'),where('participants','array-contains',uid)),snap=>{groups=snap.docs.map(d=>({id:d.id,...d.data()}));rerenderDirectory();sortRenderedContacts()},()=>{});
    setupRooms()
  })
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
