import { auth, db, doc, setDoc, serverTimestamp, ref, uploadBytes, getDownloadURL } from './firebase-client.js';
import { updateProfile } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const VERSION = '20260906a';
const CHAT_THEMES = {
  default: { name:'Vibe', background:'var(--chat-bg, #efeae2)', pattern:'none' },
  light: { name:'Clair', background:'#f7f8fa', pattern:'none' },
  dark: { name:'Sombre', background:'#111827', pattern:'none' },
  orange: { name:'Orange doux', background:'#fff3e8', pattern:'none' },
  blue: { name:'Bleu doux', background:'#eaf2ff', pattern:'none' },
  green: { name:'Vert doux', background:'#eaf8f1', pattern:'none' }
};

function injectStyles(){
  if(document.getElementById('vibeCustomizationStyles')) return;
  const style=document.createElement('style');
  style.id='vibeCustomizationStyles';
  style.textContent=`
    .vibe-profile-photo-action{width:100%;min-height:52px;display:flex;align-items:center;gap:10px;padding:10px 20px;border:0;border-bottom:1px solid #f0f2f5;background:#fff;color:#111b21;text-align:left;cursor:pointer;font-size:14px}
    .vibe-profile-photo-action:hover{background:#f5f6f6;color:#ff7a18}
    .vibe-profile-photo-action:disabled{opacity:.6;cursor:wait}
    .vibe-profile-photo-action .photo-icon{width:22px;text-align:center;font-size:17px}
    #vibeProfilePhotoInput{display:none}
    #chatView .messages{background:var(--vibe-chat-background, #efeae2);background-image:var(--vibe-chat-pattern, none);transition:background-color .2s ease}
    #chatView .chat-composer{background:color-mix(in srgb, var(--vibe-chat-background, #efeae2) 94%, #ffffff 6%)}
    html[data-chat-theme="light"] #chatView .messages{color:#111b21}
    html[data-chat-theme="dark"] #chatView .messages{color:#f3f4f6}
    html[data-chat-theme="dark"] #chatView .chat-composer{background:#172033}
  `;
  document.head.appendChild(style);
}

function applyChatTheme(value){
  const theme=CHAT_THEMES[value]||CHAT_THEMES.default;
  const root=document.documentElement;
  root.dataset.chatTheme=value||'default';
  root.style.setProperty('--vibe-chat-background',theme.background);
  root.style.setProperty('--vibe-chat-pattern',theme.pattern);
}

function readStoredTheme(){
  const user=auth?.currentUser;
  const key=`vibe-settings-${user?.uid||'guest'}`;
  try{
    const raw=localStorage.getItem(key);
    const settings=raw?JSON.parse(raw):null;
    applyChatTheme(settings?.chatTheme||'default');
  }catch{applyChatTheme('default')}
}

function syncThemeControl(){
  const select=document.querySelector('#vibeSettingsPageContent select[data-setting="chatTheme"]');
  if(!select)return;
  if(!select.dataset.vibeThemeBound){
    select.dataset.vibeThemeBound='1';
    select.addEventListener('change',()=>applyChatTheme(select.value));
  }
  applyChatTheme(select.value||'default');
}

function addThemeOptions(){
  const select=document.querySelector('#vibeSettingsPageContent select[data-setting="chatTheme"]');
  if(!select)return;
  const wanted=[['default','Vibe'],['light','Clair'],['dark','Sombre'],['orange','Orange doux'],['blue','Bleu doux'],['green','Vert doux']];
  wanted.forEach(([value,label])=>{
    if(!select.querySelector(`option[value="${value}"]`))select.insertAdjacentHTML('beforeend',`<option value="${value}">${label}</option>`);
  });
  syncThemeControl();
}

function addProfilePhotoControl(){
  const content=document.querySelector('#vibeSettingsPageContent');
  if(!content || content.dataset.photoControl==='1')return;
  if(!content.querySelector('[data-setting="chatTheme"]') && !content.textContent.includes('Profil')) return;
  if(!content.textContent.includes('Modifier mon profil'))return;
  content.dataset.photoControl='1';
  const action=document.createElement('button');
  action.type='button';
  action.className='vibe-profile-photo-action';
  action.innerHTML='<span class="photo-icon" aria-hidden="true">📷</span><span>Changer la photo de profil</span>';
  const input=document.createElement('input');
  input.type='file';input.accept='image/*';input.id='vibeProfilePhotoInput';input.setAttribute('aria-label','Choisir une photo de profil');
  action.addEventListener('click',()=>input.click());
  input.addEventListener('change',()=>void uploadProfilePhoto(input,action));
  const existing=content.querySelector('[data-action="profile-edit"]');
  if(existing)existing.insertAdjacentElement('afterend',action);else content.prepend(action);
  content.appendChild(input);
}

async function uploadProfilePhoto(input,button){
  const user=auth?.currentUser;
  const file=input.files?.[0];
  if(!user||!file)return;
  if(!file.type.startsWith('image/')){showToast('Choisissez une image.');input.value='';return}
  if(file.size>8*1024*1024){showToast('La photo doit faire 8 Mo maximum.');input.value='';return}
  button.disabled=true;
  try{
    showToast('Envoi de la photo…');
    const storageRef=ref(`profilePhotos/${user.uid}/avatar`);
    await uploadBytes(storageRef,file,{contentType:file.type,cacheControl:'public,max-age=3600'});
    const url=`${await getDownloadURL(storageRef)}${getDownloadURL?'':''}`;
    await updateProfile(user,{photoURL:url});
    await setDoc(doc(db,'users',user.uid),{photoURL:url,updatedAt:serverTimestamp()},{merge:true});
    await setDoc(doc(db,'presence',user.uid),{photoURL:url,updatedAt:serverTimestamp()},{merge:true});
    refreshAvatars(url);
    showToast('Photo de profil mise à jour.');
  }catch(error){
    console.error('Photo de profil Vibe:',error);
    showToast(`Photo impossible : ${error?.message||'erreur inconnue'}`);
  }finally{button.disabled=false;input.value=''}
}

function refreshAvatars(url){
  const selectors=['#vibeSettingsAvatar','.avatar-user'];
  selectors.forEach(selector=>document.querySelectorAll(selector).forEach(el=>{
    el.innerHTML=`<img src="${url}" alt="Photo de profil" loading="eager">`;
    el.style.backgroundImage='none';
  }));
}

function showToast(message){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=message;el.classList.add('show');
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),3000);
}

function watchSettings(){
  const observer=new MutationObserver(()=>{addThemeOptions();addProfilePhotoControl();});
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('vibe:auth-changed',event=>{
    const user=event.detail?.user;
    if(user?.photoURL)refreshAvatars(user.photoURL);
    readStoredTheme();
  });
  readStoredTheme();
  setTimeout(()=>{addThemeOptions();addProfilePhotoControl()},250);
}

injectStyles();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchSettings,{once:true});
else watchSettings();

export { applyChatTheme, uploadProfilePhoto };
