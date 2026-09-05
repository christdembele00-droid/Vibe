import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app=getApps()[0],auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
const fallback='./icons/icon.svg';
const CHANNELS=[
{id:'actualites',name:'VIBE — Actualités',subtitle:'Les informations et nouvelles du moment'},
{id:'cote-ivoire',name:'VIBE — Côte d’Ivoire',subtitle:'Actualités et informations ivoiriennes'},
{id:'monde',name:'VIBE — Monde',subtitle:'Actualités internationales'},
{id:'sports',name:'VIBE — Sports',subtitle:'Football, compétitions et sport'},
{id:'technologie',name:'VIBE — Technologie',subtitle:'IA, informatique et innovations'},
{id:'gaming',name:'VIBE — Gaming',subtitle:'Jeux vidéo et e-sport'},
{id:'musique',name:'VIBE — Musique',subtitle:'Musique et nouveautés'},
{id:'divertissement',name:'VIBE — Divertissement',subtitle:'Cinéma, séries et culture'},
{id:'science',name:'VIBE — Science',subtitle:'Sciences, découvertes et espace'},
{id:'vibe-ai',name:'VIBE — AI',subtitle:'Nouveautés et intelligence artificielle'}
];
let uid=null,current=null,unsub=null,booted=false,sending=false,building=false;
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR').trim();
const toast=text=>{const e=$('toast');if(!e)return;e.textContent=text;e.style.display='block';clearTimeout(window.__vibeChannelsToast);window.__vibeChannelsToast=setTimeout(()=>e.style.display='none',2800)};
const time=v=>v?.toDate?.().toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})||'…';

function filterChannels(){
 const box=$('contacts');if(!box)return;const term=norm($('search')?.value);box.querySelectorAll('[data-vibe-channel-item]').forEach(b=>{const ch=CHANNELS.find(x=>x.id===b.dataset.vibeChannelItem);b.hidden=!!term&&!norm(`${ch?.name} ${ch?.subtitle}`).includes(term)});
}
function ensureChannels(){
 const box=$('contacts');if(!box||!uid||building)return;
 const existing=new Set([...box.querySelectorAll('[data-vibe-channel-item]')].map(x=>x.dataset.vibeChannelItem));
 const missing=CHANNELS.filter(ch=>!existing.has(ch.id));if(!missing.length){filterChannels();return;}
 building=true;const frag=document.createDocumentFragment();missing.forEach(ch=>{const b=document.createElement('button');b.type='button';b.className='contact';b.dataset.id=`channel:${ch.id}`;b.dataset.vibeChannel='true';b.dataset.vibeChannelItem=ch.id;b.innerHTML=`<img src="${fallback}" alt=""><span><b>${esc(ch.name)}</b><small>${esc(ch.subtitle)}</small></span>`;b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openChannel(ch)},true);frag.appendChild(b)});box.prepend(frag);building=false;filterChannels();}
function header(ch){if($('avatar')){$('avatar').src=fallback;$('avatar').alt=ch.name}if($('name'))$('name').textContent=ch.name;if($('status'))$('status').textContent=ch.subtitle;if($('typing'))$('typing').hidden=true;if($('composer'))$('composer').hidden=false}
function renderPost(id,m,box){
 const mine=m.senderId===uid,el=document.createElement('div');el.className=`msg ${mine?'sent':'received'}`;el.dataset.channelMessage=id;
 if(!mine){const a=document.createElement('small');a.className='channel-author';a.textContent=m.senderName||'Utilisateur';el.appendChild(a)}
 const t=document.createElement('span');t.className='message-text';t.textContent=m.text||'';el.appendChild(t);if(m.edited){const e=document.createElement('em');e.className='edited';e.textContent='modifié';el.appendChild(e)}const tm=document.createElement('span');tm.className='time';tm.textContent=time(m.createdAt);el.appendChild(tm);
 if(mine){const actions=document.createElement('div');actions.className='message-actions';const edit=document.createElement('button');edit.type='button';edit.textContent='✏️';edit.title='Modifier';edit.onclick=e=>{e.stopPropagation();const n=prompt('Modifier la publication :',m.text||'');if(!n?.trim())return;updateDoc(doc(db,'channels',current.id,'messages',id),{text:n.trim().slice(0,4000),edited:true,editedAt:serverTimestamp()}).catch(x=>toast(x?.message||'Modification impossible'))};const del=document.createElement('button');del.type='button';del.textContent='🗑️';del.title='Supprimer';del.onclick=async e=>{e.stopPropagation();if(!confirm('Supprimer cette publication ?'))return;try{await deleteDoc(doc(db,'channels',current.id,'messages',id))}catch(x){toast(x?.message||'Suppression impossible')}};actions.append(edit,del);el.appendChild(actions)}box.appendChild(el)
}
function openChannel(ch){if(!uid)return toast('Connecte-toi pour accéder aux chaînes.');current=ch;unsub?.();window.VIBE_CHANNEL_ACTIVE=true;window.VIBE_CURRENT_USER={id:`channel:${ch.id}`,name:ch.name,channel:true,group:false};document.querySelector('.app')?.classList.add('chat-open');header(ch);const box=$('messages');box?.replaceChildren();const q=query(collection(db,'channels',ch.id,'messages'),orderBy('createdAt','asc'),limit(300));unsub=onSnapshot(q,s=>{if(!current)return;box?.replaceChildren();if(s.empty){const w=document.createElement('div');w.className='welcome';w.innerHTML=`<img src="${fallback}" alt="VIBE" style="width:72px;height:72px;border-radius:50%;object-fit:cover"><h2>${esc(ch.name)}</h2><p>${esc(ch.subtitle)}.</p><div class="welcome-features"><span>Temps réel</span><span>Communauté</span><span>VIBE AI</span></div>`;box?.appendChild(w)}else s.forEach(d=>renderPost(d.id,d.data(),box));if(box)box.scrollTop=box.scrollHeight},e=>toast('Chaîne indisponible : '+(e?.code||e?.message||'erreur')));$('message')?.focus()}
function closeChannel(){unsub?.();unsub=null;current=null;window.VIBE_CHANNEL_ACTIVE=false}
async function send(e){if(!current||!uid||sending)return;e.preventDefault();e.stopImmediatePropagation();const input=$('message'),text=input?.value.trim();if(!text)return;sending=true;try{const u=auth.currentUser;await addDoc(collection(db,'channels',current.id,'messages'),{senderId:uid,senderName:(u?.displayName||u?.email?.split('@')[0]||'Utilisateur').slice(0,120),senderAvatar:String(u?.photoURL||fallback).slice(0,1000),text:text.slice(0,4000),createdAt:serverTimestamp()});input.value='';input.focus()}catch(x){toast('Publication impossible : '+(x?.code||x?.message||'erreur'))}finally{sending=false}}
function boot(){if(booted)return;booted=true;document.addEventListener('submit',e=>{if(e.target?.id==='composer'&&current)send(e)},true);document.addEventListener('keydown',e=>{if(current&&e.key==='Enter'&&!e.shiftKey&&document.activeElement?.id==='message'){e.preventDefault();$('composer')?.requestSubmit()}},true);$('search')?.addEventListener('input',filterChannels,true);onAuthStateChanged(auth,u=>{uid=u?.uid||null;closeChannel();if(uid)setTimeout(ensureChannels,150)});const contacts=$('contacts');if(contacts)new MutationObserver(()=>{if(uid&&!building)ensureChannels()}).observe(contacts,{childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.VIBE_OPEN_CHANNEL=openChannel;window.VIBE_CLOSE_CHANNEL=closeChannel;window.VIBE_CHANNELS=CHANNELS;
