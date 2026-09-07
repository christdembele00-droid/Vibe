import { afficherFenetreRechercheUtilisateurs } from './vibe-contacts.js';
import { auth, onAuthStateChanged } from './firebase-client.js';

function setActive(button){
  document.querySelectorAll('.vibe-mobile-nav button').forEach(item => item.classList.remove('active'));
  button?.classList.add('active');
}

function openHome(){
  document.getElementById('app-shell')?.classList.remove('chat-open');
  document.querySelector('.left-sidebar')?.classList.remove('mobile-feature-open');
  setActive(document.getElementById('mobile-nav-chats'));
}

function openStatus(){
  setActive(document.getElementById('mobile-nav-status'));
  document.getElementById('btn-status')?.click();
}

function openCommunities(){
  setActive(document.getElementById('mobile-nav-communities'));
  document.getElementById('btn-channels')?.click();
}

function openCalls(){
  setActive(document.getElementById('mobile-nav-calls'));
  document.getElementById('btn-calls')?.click();
}

function installGoogleAvatar(user = auth?.currentUser){
  const header=document.querySelector('.sidebar-header');
  const actions=header?.querySelector('.sidebar-actions');
  if(!header||!actions)return;
  let avatar=document.getElementById('vibe-mobile-google-avatar');
  if(!avatar){
    avatar=document.createElement('div');
    avatar.id='vibe-mobile-google-avatar';
    avatar.className='vibe-mobile-google-avatar';
    avatar.setAttribute('aria-label','Photo du compte Google');
    avatar.title='Compte Google';
    actions.insertAdjacentElement('afterend',avatar);
  }
  const photoURL=String(user?.photoURL||'').trim();
  avatar.innerHTML='';
  if(!photoURL){avatar.style.display='none';return}
  const image=document.createElement('img');
  image.src=photoURL;
  image.alt='';
  image.referrerPolicy='no-referrer';
  image.addEventListener('error',()=>{avatar.style.display='none'}, {once:true});
  avatar.appendChild(image);
  avatar.style.display='flex';
}

function install(){
  if(document.getElementById('vibe-mobile-nav')) return;
  const shell=document.getElementById('app-shell');
  if(!shell) return;

  const nav=document.createElement('nav');
  nav.id='vibe-mobile-nav';
  nav.className='vibe-mobile-nav';
  nav.setAttribute('aria-label','Navigation principale');
  nav.innerHTML=`
    <button id="mobile-nav-chats" class="active" type="button" aria-label="Discussions"><span class="nav-pill"></span><span class="nav-icon">💬</span><span>Discussions</span></button>
    <button id="mobile-nav-status" type="button" aria-label="Actus"><span class="nav-pill"></span><span class="nav-icon">◉</span><span>Actus</span></button>
    <button id="mobile-nav-communities" type="button" aria-label="Communautés"><span class="nav-pill"></span><span class="nav-icon">👥</span><span>Communautés</span></button>
    <button id="mobile-nav-calls" type="button" aria-label="Appels"><span class="nav-pill"></span><span class="nav-icon">☎</span><span>Appels</span></button>`;
  document.body.appendChild(nav);

  const newChat=document.createElement('button');
  newChat.id='vibe-mobile-new-chat';
  newChat.className='vibe-mobile-new-chat';
  newChat.type='button';
  newChat.title='Nouvelle discussion';
  newChat.setAttribute('aria-label','Nouvelle discussion');
  newChat.textContent='✎';
  document.body.appendChild(newChat);

  document.getElementById('mobile-nav-chats')?.addEventListener('click',openHome);
  document.getElementById('mobile-nav-status')?.addEventListener('click',openStatus);
  document.getElementById('mobile-nav-communities')?.addEventListener('click',openCommunities);
  document.getElementById('mobile-nav-calls')?.addEventListener('click',openCalls);
  newChat.addEventListener('click',()=>{
    if(document.getElementById('vibe-new-discussion')) document.getElementById('vibe-new-discussion').click();
    else afficherFenetreRechercheUtilisateurs('chats-list-container');
  });

  installGoogleAvatar();
  if(auth && typeof onAuthStateChanged === 'function'){
    onAuthStateChanged(auth, user => installGoogleAvatar(user));
  }
  document.addEventListener('vibe:close-chat',openHome);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
