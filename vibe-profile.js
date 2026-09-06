import { auth, db, doc, setDoc } from './firebase-client.js';
import { updateProfile } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const $ = id => document.getElementById(id);
const toast = message => { const el=$('toast'); if(!el)return; el.textContent=message; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2600); };

function syncUI(user){
  if(!user)return;
  const name=user.displayName||user.email?.split('@')[0]||'Mon profil';
  const profileName=document.querySelector('.profile-copy strong');
  const profileAvatar=document.querySelector('.avatar-user');
  if(profileName)profileName.textContent=name;
  if(profileAvatar){profileAvatar.textContent=name.trim().charAt(0).toUpperCase();profileAvatar.innerHTML=name.trim().charAt(0).toUpperCase();}
  const settingsName=$('vibeSettingsName');
  const settingsAvatar=$('vibeSettingsAvatar');
  if(settingsName)settingsName.textContent=name;
  if(settingsAvatar){settingsAvatar.textContent=name.trim().charAt(0).toUpperCase();settingsAvatar.innerHTML=name.trim().charAt(0).toUpperCase();}
}

async function editProfile(){
  const user=auth?.currentUser;
  if(!user)return toast('Connectez-vous pour modifier votre profil.');
  const current=user.displayName||user.email?.split('@')[0]||'';
  const next=prompt('Nouveau nom de profil :',current);
  if(next===null)return;
  const name=String(next).trim().slice(0,60);
  if(!name)return toast('Le nom ne peut pas être vide.');
  if(name===current)return;
  try{
    await updateProfile(user,{displayName:name});
    await setDoc(doc(db,'users',user.uid),{displayName:name,updatedAt:new Date()},{merge:true});
    await setDoc(doc(db,'userSearch',user.uid),{uid:user.uid,displayName:name,displayNameLower:name.toLocaleLowerCase('fr-FR'),email:user.email||null,photoURL:user.photoURL||null,updatedAt:new Date()},{merge:true});
    syncUI(user);
    document.dispatchEvent(new CustomEvent('vibe:profile-updated',{detail:{user}}));
    toast('Nom de profil mis à jour.');
  }catch(error){console.error('Profil Vibe:',error);toast(`Impossible de modifier le nom : ${error.message}`);}
}

document.addEventListener('vibe:edit-profile',()=>void editProfile());
document.addEventListener('vibe:auth-changed',e=>syncUI(e.detail?.user||auth?.currentUser));
document.addEventListener('click',event=>{
  if(event.target.closest('#profileBtn')||event.target.closest('[data-action="profile-edit"]')){
    event.preventDefault();
    document.dispatchEvent(new CustomEvent('vibe:edit-profile'));
  }
});

window.VibeProfile={editProfile};
