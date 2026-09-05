import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app = getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const CHANNEL_ID = 'vibe';
const CHANNEL_PATH = ['channels', CHANNEL_ID, 'messages'];
let currentUid = null;
let channelUnsub = null;
let channelActive = false;
let observer = null;
let booted = false;
let sending = false;

const $ = id => document.getElementById(id);
const fallback = 'https://i.pravatar.cc/150?img=12';
const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
const time = value => value?.toDate?.().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) || '…';
const toast = text => { const el=$('toast'); if(!el)return; el.textContent=text; el.style.display='block'; clearTimeout(window.__vibeChannelToast); window.__vibeChannelToast=setTimeout(()=>el.style.display='none',2800); };

function ensureChannelInSidebar(){
  const box=$('contacts'); if(!box||!currentUid||channelActive)return;
  if(box.querySelector('[data-vibe-channel="true"]'))return;
  box.querySelector('.empty')?.remove();
  const button=document.createElement('button'); button.type='button'; button.className='contact'; button.dataset.id=CHANNEL_ID; button.dataset.vibeChannel='true';
  button.innerHTML=`<img src="${esc($('meAvatar')?.src||fallback)}" alt=""><span><b>VIBE</b><small>Canal public</small></span>`;
  box.prepend(button);
}

function renderMessage(id,message,box){
  const ownerId=message.senderId||message.sender||'';
  const el=document.createElement('div'); el.className='msg '+(ownerId===currentUid?'sent':'received'); el.dataset.messageId=id;
  if(message.deleted){el.classList.add('deleted');el.innerHTML='<span>🚫 Message supprimé</span>';box.appendChild(el);return;}
  if(ownerId!==currentUid){const author=document.createElement('small');author.className='channel-author';author.textContent=message.senderName||'Utilisateur';el.appendChild(author);}
  if(message.text){const text=document.createElement('span');text.className='message-text';text.textContent=message.text;el.appendChild(text);}
  if(message.edited){const edited=document.createElement('em');edited.className='edited';edited.textContent='modifié';el.appendChild(edited);}
  const tm=document.createElement('span');tm.className='time';tm.textContent=time(message.createdAt)+(ownerId===currentUid?' ✓':'');el.appendChild(tm);
  if(ownerId===currentUid){
    const actions=document.createElement('div');actions.className='message-actions';
    const edit=document.createElement('button');edit.type='button';edit.textContent='✏️';edit.title='Modifier';
    edit.onclick=event=>{event.stopPropagation();const next=prompt('Modifier le message :',message.text||'');if(!next?.trim())return;updateDoc(doc(db,...CHANNEL_PATH,id),{text:next.trim().slice(0,4000),edited:true,editedAt:serverTimestamp()}).catch(error=>toast('Modification impossible : '+(error?.message||'erreur')));};
    const remove=document.createElement('button');remove.type='button';remove.textContent='🗑️';remove.title='Supprimer';
    remove.onclick=async event=>{event.stopPropagation();if(!confirm('Supprimer ce message pour tous ?'))return;try{await deleteDoc(doc(db,...CHANNEL_PATH,id));toast('Message supprimé pour tous.');}catch(error){toast('Suppression impossible : '+(error?.message||'erreur'));}};
    actions.append(edit,remove);el.appendChild(actions);
  }
  box.appendChild(el);
}

function listenChannel(){
  channelUnsub?.(); const box=$('messages'); if(!box||!currentUid)return;
  const q=query(collection(db,...CHANNEL_PATH),orderBy('createdAt','asc'),limit(300));
  channelUnsub=onSnapshot(q,snap=>{if(!channelActive)return;box.replaceChildren();snap.forEach(item=>renderMessage(item.id,item.data(),box));box.scrollTop=box.scrollHeight;},error=>toast('Canal VIBE indisponible : '+(error?.code||error?.message||'erreur')));
}

function openChannel(){
  if(!currentUid)return toast('Connecte-toi pour accéder au canal public.');
  channelActive=true;window.VIBE_CHANNEL_ACTIVE=true;window.VIBE_CURRENT_USER={id:CHANNEL_ID,name:'VIBE',group:false,channel:true};
  document.querySelector('.app')?.classList.add('chat-open');$('name').textContent='VIBE';$('status').textContent='Canal public · tous les utilisateurs';$('composer').hidden=false;$('typing').hidden=true;listenChannel();$('message')?.focus();
}
function closeChannel(){channelUnsub?.();channelUnsub=null;channelActive=false;window.VIBE_CHANNEL_ACTIVE=false;}

async function sendChannelMessage(event){
  event.preventDefault();
  event.stopPropagation();
  if(!channelActive||!currentUid||sending)return;
  const input=$('message'); const text=input?.value.trim(); if(!text)return;
  const user=auth.currentUser;
  if(!user||user.uid!==currentUid)return toast('Session Firebase indisponible. Reconnecte-toi.');
  sending=true;
  try{
    await addDoc(collection(db,...CHANNEL_PATH),{senderId:user.uid,senderName:(user.displayName||user.email?.split('@')[0]||'Utilisateur').trim().slice(0,120),senderAvatar:String(user.photoURL||fallback).slice(0,1000),text:text.slice(0,4000),createdAt:serverTimestamp()});
    input.value='';input.focus();
  }catch(error){console.error('[VIBE] public channel send',error);toast('Message non envoyé : '+(error?.code||error?.message||'erreur Firestore'));}
  finally{sending=false;}
}

function handleClicks(event){
  const target=event.target.closest?.('button,a,label');
  const channel=event.target.closest?.('[data-vibe-channel="true"]');
  if(channel){event.preventDefault();event.stopImmediatePropagation();openChannel();return;}
  if(channelActive&&target?.classList?.contains('contact')){closeChannel();return;}
  if(channelActive&&(target?.id==='ai'||target?.id==='audioCall'||target?.id==='videoCall'||target?.id==='mic'||target?.id==='file')){event.preventDefault();event.stopImmediatePropagation();toast('Cette action est disponible dans les discussions privées et les groupes.');return;}
  if(event.target.closest?.('#back')&&channelActive){event.preventDefault();event.stopImmediatePropagation();closeChannel();document.querySelector('.app')?.classList.remove('chat-open');window.VIBE_CURRENT_USER=null;}
}
function handleSubmit(event){if(event.target?.id==='composer'&&channelActive)sendChannelMessage(event);}
function boot(){
  if(booted)return;booted=true;
  document.addEventListener('click',handleClicks,true);
  document.addEventListener('submit',handleSubmit,true);
  document.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&document.activeElement?.id==='message'&&channelActive){event.preventDefault();$('composer')?.requestSubmit();}},true);
  observer=new MutationObserver(()=>ensureChannelInSidebar());const contacts=$('contacts');if(contacts)observer.observe(contacts,{childList:true});
  onAuthStateChanged(auth,user=>{currentUid=user?.uid||null;closeChannel();if(currentUid)setTimeout(ensureChannelInSidebar,100);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.VIBE_OPEN_CHANNEL=openChannel;window.VIBE_CLOSE_CHANNEL=closeChannel;
