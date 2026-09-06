import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  linkWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant auth-ui.js');

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

function toast(message){
  const el=document.querySelector('#toast');
  if(!el)return;
  el.textContent=message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>el.classList.remove('show'),2800);
}

function openLogin(){
  if(document.querySelector('#vibeAuthDialog'))return;

  const dialog=document.createElement('div');
  dialog.id='vibeAuthDialog';
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.innerHTML=`
    <div class="vibe-auth-backdrop" data-close-auth></div>
    <section class="vibe-auth-card" aria-label="Connexion Vibe">
      <button class="vibe-auth-close" type="button" data-close-auth aria-label="Fermer">×</button>
      <div class="vibe-auth-icon">V</div>
      <h2>Se connecter à Vibe</h2>
      <p>Utilisez votre compte Google ou GitHub.</p>
      <button type="button" class="vibe-auth-provider" data-provider="google">Continuer avec Google</button>
      <button type="button" class="vibe-auth-provider" data-provider="github">Continuer avec GitHub</button>
    </section>`;

  document.body.appendChild(dialog);
  dialog.addEventListener('click',event=>{
    const close=event.target.closest('[data-close-auth]');
    if(close)dialog.remove();
    const provider=event.target.closest('[data-provider]')?.dataset.provider;
    if(provider)authenticate(provider,dialog);
  });
}

async function authenticate(providerName,dialog){
  const provider=providerName==='google'?googleProvider:githubProvider;
  const label=providerName==='google'?'Google':'GitHub';
  try{
    const user=auth.currentUser;
    if(user?.isAnonymous){
      await linkWithPopup(user,provider);
      toast(`Compte ${label} connecté. Votre session Vibe est conservée.`);
    }else{
      await signInWithPopup(auth,provider);
      toast(`Connexion ${label} réussie.`);
    }
    dialog.remove();
  }catch(error){
    if(error.code==='auth/popup-closed-by-user')return;
    if(error.code==='auth/credential-already-in-use'){
      try{
        await signInWithPopup(auth,provider);
        toast(`Connexion ${label} réussie.`);
        dialog.remove();
      }catch(retryError){toast(`Connexion ${label} impossible : ${retryError.message}`);}
      return;
    }
    if(error.code==='auth/account-exists-with-different-credential'){
      toast(`Ce compte utilise déjà une autre méthode de connexion.`);
      return;
    }
    toast(`Connexion ${label} impossible : ${error.message}`);
  }
}

const profileButton=document.querySelector('#profileBtn');
if(profileButton){
  profileButton.addEventListener('click',()=>{
    if(auth.currentUser?.isAnonymous)openLogin();
  });
}

onAuthStateChanged(auth,user=>{
  const profileCopy=document.querySelector('.profile-copy span');
  const profileName=document.querySelector('.profile-copy strong');
  const avatar=document.querySelector('.avatar-user');
  if(!user)return;

  if(user.isAnonymous){
    if(profileName)profileName.textContent='Mon profil';
    if(profileCopy)profileCopy.textContent='Invité · se connecter';
    return;
  }

  const provider=user.providerData?.find(p=>p.providerId==='google.com'||p.providerId==='github.com');
  const name=user.displayName||provider?.displayName||'Mon profil';
  if(profileName)profileName.textContent=name;
  if(profileCopy)profileCopy.textContent=provider?.providerId==='google.com'?'Google connecté':provider?.providerId==='github.com'?'GitHub connecté':'Connecté';
  if(avatar)avatar.textContent=(name.trim()[0]||'V').toUpperCase();
});
