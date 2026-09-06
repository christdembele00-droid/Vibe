import { auth, db, doc, getDoc, setDoc, serverTimestamp, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, googleProvider, githubProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase-client.js';
import { updateProfile, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const $ = (s) => document.querySelector(s);
let modal = null;
let authBusy = false;
let persistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => { console.warn('Vibe Auth persistence:', error); return null; });
const ERROR_MESSAGES = {
  'auth/popup-closed-by-user':'La fenêtre de connexion a été fermée.',
  'auth/popup-blocked':'La fenêtre Google/GitHub a été bloquée. Redirection utilisée.',
  'auth/account-exists-with-different-credential':'Cette adresse possède déjà un compte avec un autre mode de connexion. Utilisez le mode déjà associé au compte.',
  'auth/unauthorized-domain':'Ce domaine doit être autorisé dans Firebase Authentication.',
  'auth/operation-not-allowed':'Ce moyen de connexion n’est pas activé dans Firebase.',
  'auth/network-request-failed':'Connexion réseau impossible. Vérifiez votre connexion puis réessayez.',
  'auth/invalid-credential':'Identifiants OAuth invalides ou expirés.',
  'auth/invalid-login-credentials':'E-mail ou mot de passe incorrect.',
  'auth/invalid-email':'Adresse e-mail invalide.',
  'auth/weak-password':'Le mot de passe doit comporter au moins 6 caractères.',
  'auth/email-already-in-use':'Cette adresse e-mail est déjà utilisée.',
  'auth/user-not-found':'Aucun compte ne correspond à cette adresse e-mail.',
  'auth/wrong-password':'E-mail ou mot de passe incorrect.',
  'auth/too-many-requests':'Trop de tentatives. Réessayez plus tard.',
  'auth/internal-error':'Le service de connexion a rencontré une erreur. Réessayez.'
};
function showError(error){const el=$('#authError');if(!el)return;const code=error?.code||'';el.textContent=ERROR_MESSAGES[code]||error?.message||'Connexion impossible.'}
async function syncUserProfile(user){
  if(!user?.uid)return;
  const ref=doc(db,'users',user.uid);
  try{
    const existing=await getDoc(ref);
    const data={uid:user.uid,displayName:user.displayName||user.email?.split('@')[0]||'Utilisateur',email:user.email||null,photoURL:user.photoURL||null,updatedAt:serverTimestamp()};
    if(!existing.exists()) data.createdAt=serverTimestamp();
    await setDoc(ref,data,{merge:true});
  }catch(error){console.warn('Vibe: impossible de synchroniser le profil Firestore.',error)}
}
function ensureModal(){
  if(modal)return modal;
  modal=document.createElement('div');modal.className='auth-modal';modal.hidden=true;
  modal.innerHTML=`<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle"><button class="glass-btn auth-close" id="authClose" type="button" aria-label="Fermer">×</button><h2 id="authTitle">Connexion à Vibe</h2><p id="authCopy">Choisissez votre moyen de connexion.</p><div class="auth-actions"><button type="button" id="googleLogin">Continuer avec Google</button><button type="button" id="githubLogin">Continuer avec GitHub</button><button type="button" id="emailMode">Continuer avec e-mail</button><form id="emailForm" hidden><input id="authEmail" type="email" placeholder="Adresse e-mail" autocomplete="email"><input id="authPassword" type="password" placeholder="Mot de passe" autocomplete="current-password"><button type="submit" id="emailLogin">Se connecter</button><button type="button" id="emailRegister">Créer un compte</button></form><button type="button" id="logoutBtn" hidden>Se déconnecter</button></div><div class="auth-error" id="authError" role="alert" aria-live="polite"></div></div>`;
  document.body.appendChild(modal);
  $('#authClose').onclick=closeLogin;
  modal.addEventListener('click',e=>{if(e.target===modal)closeLogin()});
  $('#googleLogin').onclick=()=>void loginWithProvider(googleProvider);
  $('#githubLogin').onclick=()=>void loginWithProvider(githubProvider);
  $('#emailMode').onclick=()=>{$('#emailForm').hidden=!$('#emailForm').hidden};
  $('#emailForm').onsubmit=e=>{e.preventDefault();void emailAuth(false)};
  $('#emailRegister').onclick=()=>void emailAuth(true);
  $('#logoutBtn').onclick=async()=>{try{await signOut(auth);closeLogin()}catch(e){showError(e)}};
  return modal;
}
async function loginWithProvider(provider){
  if(authBusy)return;
  authBusy=true;
  const error=$('#authError');if(error)error.textContent='';
  try{
    await persistenceReady;
    await signInWithPopup(auth,provider);
    closeLogin();
  }catch(e){
    if(e?.code==='auth/popup-blocked'){
      try{await signInWithRedirect(auth,provider);return}catch(redirectError){showError(redirectError)}
    }else if(e?.code==='auth/popup-closed-by-user'){
      showError(e);
    }else{
      showError(e);
    }
  }finally{
    authBusy=false;
  }
}
async function emailAuth(register){
  if(authBusy)return;
  authBusy=true;
  const error=$('#authError');if(error)error.textContent='';
  const email=$('#authEmail')?.value.trim();const password=$('#authPassword')?.value||'';
  if(!email){authBusy=false;return showError({code:'auth/invalid-email'})}
  if(!password){authBusy=false;return showError({code:'auth/invalid-login-credentials'})}
  try{
    await persistenceReady;
    const result=register?await createUserWithEmailAndPassword(auth,email,password):await signInWithEmailAndPassword(auth,email,password);
    if(register&&result.user&&!result.user.displayName)await updateProfile(result.user,{displayName:email.split('@')[0]});
    closeLogin();
  }catch(e){showError(e)}finally{authBusy=false}
}
function openLogin(){const m=ensureModal();const user=auth.currentUser;m.hidden=false;$('#googleLogin').hidden=!!user;$('#githubLogin').hidden=!!user;$('#emailMode').hidden=!!user;$('#emailForm').hidden=true;$('#logoutBtn').hidden=!user;$('#authTitle').textContent=user?'Mon compte Vibe':'Connexion à Vibe';$('#authCopy').textContent=user?(user.displayName||user.email||'Compte connecté'):'Choisissez votre moyen de connexion.';$('#authError').textContent=''}
function closeLogin(){if(modal)modal.hidden=true}
function publishAuth(user){const n=document.querySelector('.profile-copy strong');const c=document.querySelector('.profile-copy span');const a=document.querySelector('.avatar-user');if(!user){if(n)n.textContent='Mon profil';if(c)c.textContent='Se connecter';if(a)a.textContent='V'}else{if(n)n.textContent=user.displayName||user.email||'Mon profil';if(c)c.textContent='Connecté';if(a)a.textContent=(user.displayName||user.email||'V').trim().charAt(0).toUpperCase();void syncUserProfile(user)}document.dispatchEvent(new CustomEvent('vibe:auth-changed',{detail:{user}}))}
onAuthStateChanged(auth,publishAuth);
document.addEventListener('vibe:open-auth',()=>setTimeout(openLogin,0));
getRedirectResult(auth).then(result=>{if(result?.user){publishAuth(result.user);closeLogin()}}).catch(showError);
export { openLogin, closeLogin, syncUserProfile };
