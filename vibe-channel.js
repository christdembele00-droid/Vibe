import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app=getApps()[0],auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
const fallback='./icons/icon.svg';
const CHANNELS=[
{id:'actualites',name:'VIBE — Actualités',subtitle:'Informations récentes vérifiées par VIBE AI',icon:'fa-newspaper'},
{id:'cote-ivoire',name:'VIBE — Côte d’Ivoire',subtitle:'Actualités ivoiriennes vérifiées par VIBE AI',icon:'fa-flag'},
{id:'monde',name:'VIBE — Monde',subtitle:'Actualités internationales vérifiées par VIBE AI',icon:'fa-earth-americas'},
{id:'sports',name:'VIBE — Sports',subtitle:'Sport et compétitions vérifiés par VIBE AI',icon:'fa-futbol'},
{id:'technologie',name:'VIBE — Technologie',subtitle:'IA, informatique et innovations',icon:'fa-microchip'},
{id:'gaming',name:'VIBE — Gaming',subtitle:'Jeux vidéo et e-sport',icon:'fa-gamepad'},
{id:'musique',name:'VIBE — Musique',subtitle:'Musique et nouveautés',icon:'fa-music'},
{id:'divertissement',name:'VIBE — Divertissement',subtitle:'Cinéma, séries et culture',icon:'fa-film'},
{id:'science',name:'VIBE — Science',subtitle:'Sciences, découvertes et espace',icon:'fa-flask'},
{id:'vibe-ai',name:'VIBE — AI',subtitle:'Assistant intelligent et recherche web en temps réel',icon:'fa-wand-magic-sparkles'}
];
const LIVE=new Set(['actualites','cote-ivoire','monde','sports','technologie','gaming','musique','divertissement','science']);
let uid=null,current=null,unsub=null,booted=false,sending=false,building=false,channelRailBound=false;
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR').trim();
const toast=text=>{const e=$('toast');if(!e)return;e.textContent=text;e.style.display='block';clearTimeout(window.__vibeChannelsToast);window.__vibeChannelsToast=setTimeout(()=>e.style.display='none',2800)};
const time=v=>v?.toDate?.().toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})||'…';
const channelIcon=ch=>`<span class="vibe-channel-logo vibe-channel-logo-${ch.id}" aria-hidden="true"><i class="fa-solid ${ch.icon}"></i></span>`;
function injectChannelUI(){
  if(!document.getElementById('vibeChannelsStyle')){
    const s=document.createElement('style');s.id='vibeChannelsStyle';s.textContent=`
      #channels{background:#fff;display:none;overflow:auto;min-height:0}
      #channels.vibe-channels-visible{display:block}
      .vibe-channels-title{padding:14px 14px 8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#667781}
      .vibe-channel-item{width:100%;height:72px;display:flex;align-items:center;gap:12px;padding:9px 14px;border:0;border-bottom:1px solid #f0f2f3;background:#fff;text-align:left;cursor:pointer}
      .vibe-channel-item:hover{background:#f6f8f9}
      .vibe-channel-item.active{background:var(--accent-soft,#e8f5f1)}
      .vibe-channel-item span.vibe-channel-logo{width:48px;height:48px;flex:0 0 48px;border-radius:50%;display:grid;place-items:center;font-size:21px;color:#fff;background:#00a884}
      .vibe-channel-logo-actualites{background:#1976d2!important}.vibe-channel-logo-cote-ivoire{background:#00897b!important}.vibe-channel-logo-monde{background:#5e35b1!important}.vibe-channel-logo-sports{background:#ef6c00!important}.vibe-channel-logo-technologie{background:#1565c0!important}.vibe-channel-logo-gaming{background:#6a1b9a!important}.vibe-channel-logo-musique{background:#d81b60!important}.vibe-channel-logo-divertissement{background:#c62828!important}.vibe-channel-logo-science{background:#00838f!important}.vibe-channel-logo-vibe-ai{background:#4527a0!important}
      .vibe-channel-item>span:last-child{min-width:0;display:flex;flex-direction:column;gap:3px}
      .vibe-channel-item b{font-size:14px;color:#172026;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .vibe-channel-item small{font-size:12px;color:#667781;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .vibe-channel-empty{padding:28px 18px;text-align:center;color:#667781}
      .vibe-channel-rail{position:relative}
      .vibe-channel-rail::after{content:'';position:absolute;left:5px;right:5px;bottom:-7px;height:1px;background:rgba(127,127,127,.16)}
      @media(max-width:800px){.vibe-channel-item{height:68px}.vibe-channel-item span.vibe-channel-logo{width:44px;height:44px;flex-basis:44px;font-size:19px}}
    `;document.head.appendChild(s);
  }
  const rail=document.querySelector('.rail-top');
  if(rail){
    let b=$('railChannels');
    if(!b){b=document.createElement('button');b.id='railChannels';b.className='rail-button vibe-channel-rail';b.type='button';b.title='Chaînes';b.setAttribute('aria-label','Chaînes');b.innerHTML='<i class="fa-solid fa-tower-broadcast"></i>';rail.appendChild(b)}
    if(!channelRailBound){channelRailBound=true;b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();showChannels()},true)}
  }
  if(!$('channels')){
    const box=document.createElement('div');box.id='channels';box.hidden=true;const contacts=$('contacts');
    if(contacts?.parentNode)contacts.parentNode.insertBefore(box,contacts);
  }
}
function setSection(section){
  const contacts=$('contacts'),stories=$('stories'),channels=$('channels');
  if(contacts)contacts.hidden=section!=='chats';
  if(stories)stories.hidden=section!=='stories';
  if(channels){channels.hidden=section!=='channels';channels.classList.toggle('vibe-channels-visible',section==='channels')}
  document.querySelectorAll('.rail-button').forEach(b=>b.classList.toggle('active',b.id===({chats:'railChats',stories:'railStories',channels:'railChannels'}[section])));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===section));
}
function showChannels(){if(!uid)return toast('Connecte-toi pour accéder aux chaînes.');injectChannelUI();setSection('channels');ensureChannels();closeChannel();}
function showChats(){injectChannelUI();setSection('chats');closeChannel();}
function filterChannels(){const box=$('channels');if(!box)return;const term=norm($('search')?.value);box.querySelectorAll('[data-vibe-channel-item]').forEach(b=>{const ch=CHANNELS.find(x=>x.id===b.dataset.vibeChannelItem);b.hidden=!!term&&!norm(`${ch?.name} ${ch?.subtitle}`).includes(term)})}
function ensureChannels(){injectChannelUI();const box=$('channels');if(!box||!uid||building)return;const existing=new Set([...box.querySelectorAll('[data-vibe-channel-item]')].map(x=>x.dataset.vibeChannelItem));const missing=CHANNELS.filter(ch=>!existing.has(ch.id));if(!missing.length){filterChannels();return}building=true;if(!box.querySelector('.vibe-channels-title')){const title=document.createElement('div');title.className='vibe-channels-title';title.textContent='Chaînes VIBE';box.appendChild(title)}const frag=document.createDocumentFragment();missing.forEach(ch=>{const b=document.createElement('button');b.type='button';b.className='vibe-channel-item';b.dataset.id=`channel:${ch.id}`;b.dataset.vibeChannel='true';b.dataset.vibeChannelItem=ch.id;b.innerHTML=`${channelIcon(ch)}<span><b>${esc(ch.name)}</b><small>${esc(ch.subtitle)}</small></span>`;b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openChannel(ch)},true);frag.appendChild(b)});box.appendChild(frag);building=false;filterChannels()}
function header(ch){if($('avatar')){$('avatar').src=fallback;$('avatar').alt=ch.name}if($('name'))$('name').textContent=ch.name;if($('status'))$('status').textContent=ch.subtitle;if($('typing'))$('typing').hidden=true;if($('composer'))$('composer').hidden=false}
function renderPost(id,m,box){const mine=m.senderId===uid,el=document.createElement('div');el.className=`msg ${mine?'sent':'received'}`;el.dataset.channelMessage=id;if(!mine){const a=document.createElement('small');a.className='channel-author';a.textContent=m.senderName||'VIBE AI';el.appendChild(a)}const t=document.createElement('span');t.className='message-text';t.textContent=m.text||'';el.appendChild(t);if(m.edited){const e=document.createElement('em');e.className='edited';e.textContent='modifié';el.appendChild(e)}const tm=document.createElement('span');tm.className='time';tm.textContent=time(m.createdAt);el.appendChild(tm);if(mine){const actions=document.createElement('div');actions.className='message-actions';const edit=document.createElement('button');edit.type='button';edit.textContent='✏️';edit.title='Modifier';edit.onclick=e=>{e.stopPropagation();const n=prompt('Modifier la publication :',m.text||'');if(!n?.trim())return;updateDoc(doc(db,'channels',current.id,'messages',id),{text:n.trim().slice(0,4000),edited:true,editedAt:serverTimestamp()}).catch(x=>toast(x?.message||'Modification impossible'))};const del=document.createElement('button');del.type='button';del.textContent='🗑️';del.title='Supprimer';del.onclick=async e=>{e.stopPropagation();if(!confirm('Supprimer cette publication ?'))return;try{await deleteDoc(doc(db,'channels',current.id,'messages',id))}catch(x){toast(x?.message||'Suppression impossible')}};actions.append(edit,del);el.appendChild(actions)}box.appendChild(el)}
function renderAI(text,sources,box,label='VIBE AI'){const el=document.createElement('div');el.className='msg received';const a=document.createElement('small');a.className='channel-author';a.textContent=label;el.appendChild(a);const t=document.createElement('span');t.className='message-text';t.textContent=text;el.appendChild(t);if(sources?.length){const s=document.createElement('div');s.className='channel-sources';s.innerHTML='<b>Sources :</b> '+sources.map(x=>`<a href="${esc(x.uri)}" target="_blank" rel="noopener noreferrer">${esc(x.title||x.uri)}</a>`).join(' · ');el.appendChild(s)}box.appendChild(el)}
async function generateLiveFeed(ch,box){if(!window.VIBE_AI_NEWS)return;const cacheKey=`vibe-ai-feed:${ch.id}:${new Date().toISOString().slice(0,10)}`;try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached?.text){renderAI(cached.text,cached.sources,box,'VIBE AI · édition du jour');return}}catch(_){}const loading=document.createElement('div');loading.className='msg received';loading.textContent='VIBE AI recherche les informations récentes…';box.appendChild(loading);try{const result=await window.VIBE_AI_NEWS(ch.name.replace('VIBE — ',''));loading.remove();localStorage.setItem(cacheKey,JSON.stringify(result));renderAI(result.text,result.sources,box,'VIBE AI · édition du jour')}catch(e){loading.textContent='VIBE AI ne peut pas récupérer les actualités pour le moment.';toast('Recherche VIBE AI indisponible')}}
function openChannel(ch){if(!uid)return toast('Connecte-toi pour accéder aux chaînes.');injectChannelUI();setSection('channels');current=ch;unsub?.();window.VIBE_CHANNEL_ACTIVE=true;window.VIBE_CURRENT_USER={id:`channel:${ch.id}`,name:ch.name,channel:true,group:false};document.querySelector('.app')?.classList.add('chat-open');header(ch);document.querySelectorAll('[data-vibe-channel-item]').forEach(x=>x.classList.toggle('active',x.dataset.vibeChannelItem===ch.id));const box=$('messages');box?.replaceChildren();const q=query(collection(db,'channels',ch.id,'messages'),orderBy('createdAt','asc'),limit(300));unsub=onSnapshot(q,async s=>{if(!current)return;box?.replaceChildren();if(s.empty){if(ch.id==='vibe-ai'){const w=document.createElement('div');w.className='welcome';w.innerHTML=`<span class="vibe-channel-logo vibe-channel-logo-vibe-ai vibe-channel-welcome-logo">${channelIcon(ch).replace(/^<span[^>]*>|<\/span>$/g,'')}</span><h2>VIBE AI</h2><p>Pose ta question. VIBE AI peut rechercher des informations récentes sur le Web et t’aider à comprendre les résultats.</p><div class="welcome-features"><span>IA</span><span>Recherche Web</span><span>Sources</span></div>`;box?.appendChild(w)}else{const w=document.createElement('div');w.className='welcome';w.innerHTML=`${channelIcon(ch).replace('aria-hidden="true"','aria-hidden="true" class="vibe-channel-welcome-logo"')}<h2>${esc(ch.name)}</h2><p>${esc(ch.subtitle)}.</p>`;box?.appendChild(w);if(LIVE.has(ch.id))await generateLiveFeed(ch,box)}}else s.forEach(d=>renderPost(d.id,d.data(),box));if(box)box.scrollTop=box.scrollHeight},e=>toast('Chaîne indisponible : '+(e?.code||e?.message||'erreur')));$('message')?.focus()}
function closeChannel(){unsub?.();unsub=null;current=null;window.VIBE_CHANNEL_ACTIVE=false;if(window.VIBE_CURRENT_USER?.channel)window.VIBE_CURRENT_USER=null}
async function send(e){if(!current||!uid||sending)return;e.preventDefault();e.stopImmediatePropagation();const input=$('message'),text=input?.value.trim();if(!text)return;sending=true;try{if(current.id==='vibe-ai'){if(!window.VIBE_AI_ASK)throw new Error('VIBE AI non chargée');const user=document.createElement('div');user.className='msg sent';user.textContent=text;$('messages')?.appendChild(user);input.value='';const result=await window.VIBE_AI_ASK(text);renderAI(result.text,result.sources,$('messages'),'VIBE AI');$('messages').scrollTop=$('messages').scrollHeight}else{const u=auth.currentUser;await addDoc(collection(db,'channels',current.id,'messages'),{senderId:uid,senderName:(u?.displayName||u?.email?.split('@')[0]||'Utilisateur').slice(0,120),senderAvatar:String(u?.photoURL||fallback).slice(0,1000),text:text.slice(0,4000),createdAt:serverTimestamp()});input.value='';input.focus()}}catch(x){toast('VIBE AI indisponible : '+(x?.message||'erreur'))}finally{sending=false}}
function boot(){if(booted)return;booted=true;injectChannelUI();document.addEventListener('submit',e=>{if(e.target?.id==='composer'&&current)send(e)},true);document.addEventListener('keydown',e=>{if(current&&e.key==='Enter'&&!e.shiftKey&&document.activeElement?.id==='message'){e.preventDefault();$('composer')?.requestSubmit()}},true);$('search')?.addEventListener('input',filterChannels,true);onAuthStateChanged(auth,u=>{uid=u?.uid||null;closeChannel();injectChannelUI();if(uid)setTimeout(ensureChannels,150)});const contacts=$('contacts');if(contacts)new MutationObserver(()=>{if(uid&&!building)ensureChannels()}).observe(contacts,{childList:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.VIBE_OPEN_CHANNEL=openChannel;window.VIBE_CLOSE_CHANNEL=closeChannel;window.VIBE_CHANNELS=CHANNELS;
