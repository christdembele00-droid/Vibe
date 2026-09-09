import { afficherFenetreRechercheUtilisateurs } from './vibe-contacts.js';
import { auth, db, doc, getDoc, onAuthStateChanged, signInWithGoogle, firebaseConfigured } from './firebase-client.js';

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

async function getBestProfile(user){
  const profile = {
    name: String(user?.displayName || '').trim(),
    photoURL: String(user?.photoURL || '').trim()
  };
  if (profile.photoURL || !db || !user?.uid) return profile;

  try {
    const [profileSnapshot, userSnapshot] = await Promise.all([
      getDoc(doc(db, 'profiles', user.uid)),
      getDoc(doc(db, 'users', user.uid))
    ]);
    const savedProfile = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const savedUser = userSnapshot.exists() ? userSnapshot.data() : {};
    profile.photoURL = String(savedProfile.photoURL || savedUser.photoURL || '').trim();
    profile.name = String(profile.name || savedProfile.name || savedProfile.displayName || savedUser.name || savedUser.displayName || '').trim();
  } catch (error) {
    console.warn('[Vibe] Photo profil mobile:', error);
  }
  return profile;
}

async function handleMobileLogin(){
  if(!firebaseConfigured || !auth){
    alert('Firebase n’est pas configuré.');
    return;
  }
  const button=document.getElementById('vibe-mobile-google-login');
  if(button){button.disabled=true;button.textContent='Connexion…';}
  try{
    await signInWithGoogle();
  }catch(error){
    console.error('[Vibe] Connexion Google mobile:',error);
    if(button){button.disabled=false;button.textContent='Se connecter';}
    const message=error?.code==='auth/popup-closed-by-user'?'Connexion annulée.':'Connexion Google impossible.';
    alert(message);
  }
}

async function installGoogleAvatar(user = auth?.currentUser){
  const header=document.querySelector('.sidebar-header');
  const actions=header?.querySelector('.sidebar-actions');
  if(!header||!actions)return;

  let loginButton=document.getElementById('vibe-mobile-google-login');
  if(!loginButton){
    loginButton=document.createElement('button');
    loginButton.id='vibe-mobile-google-login';
    loginButton.type='button';
    loginButton.className='vibe-mobile-google-login';
    loginButton.textContent='Se connecter';
    loginButton.setAttribute('aria-label','Se connecter avec Google');
    loginButton.title='Se connecter avec Google';
    loginButton.addEventListener('click',handleMobileLogin);
    actions.insertAdjacentElement('afterend',loginButton);
  }

  let avatar=document.getElementById('vibe-mobile-google-avatar');
  if(!avatar){
    avatar=document.createElement('div');
    avatar.id='vibe-mobile-google-avatar';
    avatar.className='vibe-mobile-google-avatar';
    avatar.setAttribute('aria-label','Photo du compte Google');
    avatar.title='Compte Google';
    actions.insertAdjacentElement('afterend',avatar);
  }

  if(!user){
    avatar.style.display='none';
    loginButton.style.display='inline-flex';
    loginButton.disabled=false;
    loginButton.textContent='Se connecter';
    return;
  }

  loginButton.style.display='none';
  const profile = await getBestProfile(user);
  const photoURL=profile.photoURL;
  const fallback=String(profile.name || 'V').slice(0,1).toUpperCase();
  avatar.innerHTML='';
  avatar.style.display='flex';
  avatar.textContent=fallback;

  if(!photoURL)return;
  const image=document.createElement('img');
  image.src=photoURL;
  image.alt='';
  image.referrerPolicy='no-referrer';
  image.addEventListener('error',()=>{
    image.remove();
    avatar.textContent=fallback;
  }, {once:true});
  avatar.appendChild(image);
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
