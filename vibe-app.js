import {
  auth, db, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp,
  onAuthStateChanged, signInWithGoogle, signInWithEmail, createEmailAccount, signInAsAnonymous,
  startPhoneSignIn, confirmPhoneSignIn, signInWithGithub, getAuthErrorMessage, logout,
  firebaseConfigured, query, where
} from './firebase-client.js';
import { ouvrirDiscussion } from './vibe-chat.js';
import { initWhatsAppNavigation } from './whatsapp-extra-features.js';
import { ensureVibeProfile } from './vibe-direct-chat.js';
import { afficherFenetreRechercheUtilisateurs } from './vibe-contacts.js';
import { creerAvatarPersonnalise, creerAvatarDepuisProfil } from './vibe-avatar.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));
const list = document.getElementById('chats-list-container');
const search = document.getElementById('search-chat');
const status = document.getElementById('connection-status');
const shell = document.getElementById('app-shell');
const toastElement = document.getElementById('toast');
const welcomeScreen = document.getElementById('welcome-screen');
const SEARCH_STORAGE_KEY = 'vibe-chat-search';
let allChats = [];
let currentUser = null;
let stopChats = null;
let toastTimer = null;
let favoriteChatIds = new Set();
let presenceTimer = null;
const longPressTimers = new WeakMap();

function showToast(message){
  if(!toastElement)return;
  toastElement.value=message;
  toastElement.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastElement.classList.remove('show'),2400);
}
function sortChats(items){return [...items].sort((a,b)=>{const favoriteDiff=Number(favoriteChatIds.has(b.id))-Number(favoriteChatIds.has(a.id));if(favoriteDiff)return favoriteDiff;return (b.lastUpdated?.toMillis?.()??0)-(a.lastUpdated?.toMillis?.()??0)})}
function isFavorite(chatId){return favoriteChatIds.has(chatId)}

async function toggleFavorite(chat,event){
  event?.stopPropagation();
  if(!currentUser||!db){showToast('Connectez-vous pour gérer les favoris.');return}
  const nextValue=!isFavorite(chat.id);const previous=new Set(favoriteChatIds);
  if(nextValue)favoriteChatIds.add(chat.id);else favoriteChatIds.delete(chat.id);
  allChats=sortChats(allChats);render(allChats);
  try{await setDoc(doc(db,'userFavorites',currentUser.uid),{[chat.id]:nextValue,updatedAt:serverTimestamp()},{merge:true});showToast(nextValue?'Discussion ajoutée aux favoris.':'Discussion retirée des favoris.')}catch(error){favoriteChatIds=previous;allChats=sortChats(allChats);render(allChats);console.error('[Vibe] Favori:',error);showToast('Impossible de modifier le favori.')}
}

async function supprimerDiscussion(chat){
  if(!currentUser||!db||!chat?.id)return;
  const confirmation=window.confirm(`Supprimer la discussion « ${chat.name||'Discussion'} » ?`);
  if(!confirmation)return;
  try{await deleteDoc(doc(db,'chats',chat.id));favoriteChatIds.delete(chat.id);allChats=allChats.filter(item=>item.id!==chat.id);render(allChats);shell?.classList.remove('chat-open');showToast('Discussion supprimée.')}catch(error){console.error('[Vibe] Suppression discussion:',error);showToast('Impossible de supprimer cette discussion.')}
}

function activerAppuiLong(button,item,onTriggered){
  let timer=null;let startX=0;let startY=0;let triggered=false;
  const clear=()=>{if(timer){clearTimeout(timer);timer=null}longPressTimers.delete(button)};
  button.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;triggered=false;startX=event.clientX;startY=event.clientY;clear();timer=setTimeout(()=>{timer=null;longPressTimers.delete(button);triggered=true;onTriggered();},650);longPressTimers.set(button,timer)});
  button.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-startX,event.clientY-startY)>12)clear()});button.addEventListener('pointerup',()=>clear());button.addEventListener('pointercancel',()=>clear());button.addEventListener('pointerleave',()=>clear());button.addEventListener('click',event=>{if(triggered){event.preventDefault();event.stopImmediatePropagation();triggered=false}},true);
}

async function loadFavorites(user){
  favoriteChatIds=new Set();if(!db||!user)return;
  try{const snapshot=await getDoc(doc(db,'userFavorites',user.uid));if(!snapshot.exists())return;favoriteChatIds=new Set(Object.entries(snapshot.data()||{}).filter(([key,value])=>key!=='updatedAt'&&value===true).map(([key])=>key))}catch(error){console.error('[Vibe] Favoris:',error)}
}
function getSearchTerm(){try{return localStorage.getItem(SEARCH_STORAGE_KEY)||''}catch{return ''}}
function saveSearchTerm(value){try{if(value)localStorage.setItem(SEARCH_STORAGE_KEY,value);else localStorage.removeItem(SEARCH_STORAGE_KEY)}catch(error){console.warn('[Vibe] Recherche locale:',error)}}
function applySearch(term=''){const normalized=String(term).toLowerCase().trim();document.querySelectorAll('.chat-item').forEach(item=>{item.hidden=!item.textContent.toLowerCase().includes(normalized)})}
function isOwnChat(item){const ids=Array.isArray(item?.participantIds)?item.participantIds.map(value=>String(value).trim()).filter(Boolean):[];return Boolean(currentUser?.uid)&&ids.length===2&&ids[0]===String(currentUser.uid)&&ids[1]===String(currentUser.uid)}

function render(items=allChats){
  if(!list)return;list.innerHTML='';if(!currentUser){list.innerHTML='';return}
  const visibleItems=items.filter(item=>!isOwnChat(item));if(!visibleItems.length){list.innerHTML='<div class="empty-state">Aucune conversation.</div>';return}
  for(const item of sortChats(visibleItems)){
    const name=item.name||'Discussion';const favorite=isFavorite(item.id);const button=document.createElement('button');button.type='button';button.className='chat-item';button.dataset.chatId=item.id;
    const avatar=creerAvatarPersonnalise(name,{className:'chat-avatar'});const meta=document.createElement('div');meta.className='chat-meta';meta.innerHTML=`<strong>${escapeHtml(name)}</strong><p>${escapeHtml(item.lastMessage||'Appuyez pour commencer...')}</p>`;
    const favoriteButton=document.createElement('span');favoriteButton.className='chat-favorite';favoriteButton.setAttribute('role','button');favoriteButton.setAttribute('tabindex','0');favoriteButton.title=favorite?'Retirer des favoris':'Ajouter aux favoris';favoriteButton.setAttribute('aria-label',favorite?'Retirer des favoris':'Ajouter aux favoris');favoriteButton.textContent=favorite?'★':'☆';
    button.append(avatar,meta,favoriteButton);favoriteButton.addEventListener('click',event=>toggleFavorite(item,event));favoriteButton.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleFavorite(item,event)}});activerAppuiLong(button,item,()=>supprimerDiscussion(item));
    button.addEventListener('click',()=>{document.querySelectorAll('.chat-item.active').forEach(el=>el.classList.remove('active'));button.classList.add('active');shell?.classList.add('chat-open');ouvrirDiscussion(item.id,name,()=>shell?.classList.remove('chat-open'))});list.appendChild(button);
  }
  applySearch(search?.value||'');
}

async function supprimerDiscussionGeneraleExistante(){if(!db||!currentUser)return;try{const reference=doc(db,'chats','general');const snapshot=await getDoc(reference);if(snapshot.exists())await deleteDoc(reference)}catch(error){console.warn('[Vibe] Suppression discussion générale:',error)}}
async function enregistrerUtilisateurActif(user,profile=null){if(!user||!db)return;const data=profile||{};const name=user.displayName||data.name||'Utilisateur';const photoURL=user.photoURL||data.photoURL||'';const vibeId=data.vibeId||`vibe-${user.uid.slice(-8).toLowerCase()}`;try{await setDoc(doc(db,'users',user.uid),{uid:user.uid,name,displayName:name,photoURL,vibeId,email:user.email||data.email||'',anonymous:Boolean(user.isAnonymous),lastSeen:serverTimestamp(),online:true},{merge:true});const currentAvatar=document.getElementById('current-user-avatar');if(currentAvatar){const avatar=creerAvatarDepuisProfil({name,photoURL},{className:'user-avatar'});avatar.id='current-user-avatar';avatar.style.width='40px';avatar.style.height='40px';avatar.style.minWidth='40px';currentAvatar.replaceWith(avatar)}const userName=document.getElementById('current-user-name');if(userName)userName.textContent=name}catch(error){console.error('[Vibe] Présence utilisateur:',error)}}
async function marquerUtilisateurHorsLigne(){if(!currentUser||!db)return;try{await updateDoc(doc(db,'users',currentUser.uid),{online:false,lastSeen:serverTimestamp()})}catch(error){console.warn('[Vibe] Déconnexion présence:',error)}}
function stopPresenceHeartbeat(){if(presenceTimer)clearInterval(presenceTimer);presenceTimer=null}
function startPresenceHeartbeat(user,profile){stopPresenceHeartbeat();enregistrerUtilisateurActif(user,profile);presenceTimer=setInterval(()=>enregistrerUtilisateurActif(user,profile),60000)}
function startPresenceLifecycle(){document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(currentUser)enregistrerUtilisateurActif(currentUser)}else if(currentUser){marquerUtilisateurHorsLigne()}});window.addEventListener('pagehide',()=>{marquerUtilisateurHorsLigne();stopPresenceHeartbeat()},{capture:true});window.addEventListener('beforeunload',()=>{marquerUtilisateurHorsLigne();stopPresenceHeartbeat()})}
function startChatsListener(){if(!db||!currentUser)return;stopChats?.();stopChats=null;const privateChatsQuery=query(collection(db,'chats'),where('participantIds','array-contains',currentUser.uid));const stopPrivateChats=onSnapshot(privateChatsQuery,snapshot=>{const privateChats=snapshot.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.id!=='general'&&!isOwnChat(item));allChats=privateChats;render(allChats)},error=>{console.error('[Vibe] Conversations privées:',error);allChats=[];render(allChats)});stopChats=()=>{stopPrivateChats?.()}}
async function loadCurrentProfile(user){if(!db||!user)return null;try{const profile=await ensureVibeProfile();const name=user.displayName||profile?.name||'Utilisateur';const photoURL=user.photoURL||profile?.photoURL||'';const currentAvatar=document.getElementById('current-user-avatar');const userName=document.getElementById('current-user-name');if(currentAvatar){const avatar=creerAvatarDepuisProfil({name,photoURL},{className:'user-avatar'});avatar.id='current-user-avatar';avatar.style.width='40px';avatar.style.height='40px';avatar.style.minWidth='40px';currentAvatar.replaceWith(avatar)}if(userName)userName.textContent=name;return {...profile,name,displayName:name,photoURL,email:user.email||''}}catch(error){console.error('[Vibe] Profil initial:',error);return {name:user.displayName||'Utilisateur',displayName:user.displayName||'Utilisateur',photoURL:user.photoURL||'',email:user.email||''}}}
function installNewDiscussionButton(){const searchContainer=document.querySelector('.search-container');if(!searchContainer||document.getElementById('vibe-new-discussion'))return;const button=document.createElement('button');button.id='vibe-new-discussion';button.type='button';button.title='Nouvelle discussion';button.setAttribute('aria-label','Nouvelle discussion');button.textContent='✎';button.style.cssText='position:absolute;right:18px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:#00a884;color:#fff;font-size:17px;display:grid;place-items:center;z-index:2;';searchContainer.style.position='relative';const wrapper=searchContainer.querySelector('.search-input-wrapper');if(wrapper)wrapper.style.paddingRight='52px';searchContainer.appendChild(button);button.addEventListener('click',()=>{if(!currentUser){showToast('Connectez-vous pour commencer.');return}afficherFenetreRechercheUtilisateurs('chats-list-container')})}

function installAuthUI(){
  if(!welcomeScreen||document.getElementById('vibe-auth-panel'))return;
  const googleButton=document.getElementById('google-login-button');
  const panel=document.createElement('div');panel.id='vibe-auth-panel';panel.style.cssText='width:min(440px,92vw);margin:18px auto 0;display:grid;gap:10px;text-align:left;';
  const title=document.createElement('div');title.textContent='Autres méthodes de connexion';title.style.cssText='font-size:13px;color:#667781;text-align:center;margin:2px 0 4px;';
  const email=document.createElement('input');email.type='email';email.placeholder='E-mail';email.autocomplete='email';email.style.cssText='padding:12px;border:1px solid #d8dde0;border-radius:10px;font:inherit;';
  const password=document.createElement('input');password.type='password';password.placeholder='Mot de passe';password.autocomplete='current-password';password.style.cssText=email.style.cssText;
  const emailRow=document.createElement('div');emailRow.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;';
  const emailLogin=document.createElement('button');emailLogin.type='button';emailLogin.textContent='Se connecter par e-mail';
  const emailCreate=document.createElement('button');emailCreate.type='button';emailCreate.textContent='Créer un compte e-mail';
  [emailLogin,emailCreate].forEach(b=>b.style.cssText='padding:11px;border:0;border-radius:10px;background:#f0f2f5;color:#111b21;font-weight:600;cursor:pointer;');emailRow.append(emailLogin,emailCreate);
  const phone=document.createElement('input');phone.type='tel';phone.placeholder='+225 07 00 00 00 00';phone.autocomplete='tel';phone.style.cssText=email.style.cssText;
  const phoneCode=document.createElement('input');phoneCode.type='text';phoneCode.inputMode='numeric';phoneCode.placeholder='Code reçu par SMS';phoneCode.style.cssText=email.style.cssText;phoneCode.hidden=true;
  const phoneRow=document.createElement('div');phoneRow.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;';
  const phoneStart=document.createElement('button');phoneStart.type='button';phoneStart.textContent='Envoyer le code';
  const phoneConfirm=document.createElement('button');phoneConfirm.type='button';phoneConfirm.textContent='Valider le code';phoneConfirm.hidden=true;
  [phoneStart,phoneConfirm].forEach(b=>b.style.cssText='padding:11px;border:0;border-radius:10px;background:#f0f2f5;color:#111b21;font-weight:600;cursor:pointer;');phoneRow.append(phoneStart,phoneConfirm);
  const recaptcha=document.createElement('div');recaptcha.id='vibe-phone-recaptcha';recaptcha.style.cssText='min-height:1px;';
  const anonymous=document.createElement('button');anonymous.type='button';anonymous.textContent='Continuer anonymement';anonymous.style.cssText='padding:11px;border:0;border-radius:10px;background:#f0f2f5;color:#111b21;font-weight:600;cursor:pointer;';
  const github=document.createElement('button');github.type='button';github.textContent='Continuer avec GitHub';github.style.cssText='padding:11px;border:0;border-radius:10px;background:#24292f;color:#fff;font-weight:600;cursor:pointer;';
  panel.append(title,email,password,emailRow,phone,phoneCode,phoneRow,recaptcha,anonymous,github);
  googleButton?.insertAdjacentElement('afterend',panel);

  const busy=async(button,action)=>{button.disabled=true;try{await action()}catch(error){console.error('[Vibe] Auth:',error);showToast(getAuthErrorMessage(error));button.disabled=false}};
  emailLogin.addEventListener('click',()=>busy(emailLogin,async()=>{if(!firebaseConfigured||!auth)throw new Error('Firebase n’est pas configuré.');await signInWithEmail(email.value,password.value)}));
  emailCreate.addEventListener('click',()=>busy(emailCreate,async()=>{if(!firebaseConfigured||!auth)throw new Error('Firebase n’est pas configuré.');await createEmailAccount(email.value,password.value)}));
  anonymous.addEventListener('click',()=>busy(anonymous,async()=>{await signInAsAnonymous()}));
  github.addEventListener('click',()=>busy(github,async()=>{await signInWithGithub()}));
  phoneStart.addEventListener('click',()=>busy(phoneStart,async()=>{await startPhoneSignIn(phone.value,'vibe-phone-recaptcha');phoneCode.hidden=false;phoneConfirm.hidden=false;phoneStart.textContent='Code envoyé';showToast('Code SMS envoyé.')}));
  phoneConfirm.addEventListener('click',()=>busy(phoneConfirm,async()=>{await confirmPhoneSignIn(phoneCode.value)}));
}

function installGoogleLoginButton(){const button=document.getElementById('google-login-button');if(!button)return null;button.addEventListener('click',async()=>{if(!firebaseConfigured||!auth){showToast('Firebase n’est pas configuré.');return}button.disabled=true;button.textContent='Connexion Google…';try{await signInWithGoogle()}catch(error){console.error('[Vibe] Connexion Google:',error);showToast(getAuthErrorMessage(error));button.disabled=false;button.textContent='Continuer avec Google'}});return button}
if(search){search.value=getSearchTerm();search.addEventListener('input',event=>{saveSearchTerm(event.target.value);applySearch(event.target.value)})}
render();installNewDiscussionButton();startPresenceLifecycle();installGoogleLoginButton();installAuthUI();
if(!firebaseConfigured||!auth||!db){if(status)status.textContent='Firebase non configuré'}else{onAuthStateChanged(auth,async user=>{currentUser=user;stopChats?.();stopChats=null;stopPresenceHeartbeat();const loginButton=document.getElementById('google-login-button');const authPanel=document.getElementById('vibe-auth-panel');if(!user){if(status)status.textContent='Connexion requise';if(loginButton){loginButton.disabled=false;loginButton.textContent='Continuer avec Google';loginButton.style.display=''}if(authPanel)authPanel.style.display='';const userName=document.getElementById('current-user-name');if(userName)userName.textContent='Compte non connecté';render([]);return}if(status)status.textContent=user.isAnonymous?'Compte anonyme connecté':'Compte connecté';if(loginButton)loginButton.style.display='none';if(authPanel)authPanel.style.display='none';initWhatsAppNavigation();const profile=await loadCurrentProfile(user);await enregistrerUtilisateurActif(user,profile);startPresenceHeartbeat(user,profile);await loadFavorites(user);await supprimerDiscussionGeneraleExistante();render(allChats);installNewDiscussionButton();try{startChatsListener()}catch(error){console.error('[Vibe] Firestore après authentification:',error);if(status)status.textContent='Firestore refusé'}})}
document.addEventListener('vibe:logout',async()=>{try{await logout()}catch(error){console.error('[Vibe] Déconnexion:',error);showToast(getAuthErrorMessage(error))}});
document.addEventListener('vibe:close-chat',()=>shell?.classList.remove('chat-open'));
