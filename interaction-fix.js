import{getApp}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import{getAuth}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import{getFirestore,doc,updateDoc,collection,getDocs}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.style.display='block';clearTimeout(window.__interactionToast);window.__interactionToast=setTimeout(()=>e.style.display='none',2400)};

function applyUserSearch(){const input=$('search'),box=$('contacts');if(!input||!box)return;const term=input.value.trim().toLowerCase();let visible=0;box.querySelectorAll('.contact').forEach(item=>{const text=(item.dataset.search||item.textContent||'').toLowerCase();const match=!term||text.includes(term);item.hidden=!match;if(match)visible++});let empty=box.querySelector('.vibe-search-empty');if(term&&visible===0){if(!empty){empty=document.createElement('div');empty.className='empty vibe-search-empty';box.appendChild(empty)}empty.innerHTML='<i class="fa-solid fa-magnifying-glass"></i><b>Aucun utilisateur trouvé</b><small>Essaie un autre nom.</small>';empty.style.display='grid'}else if(empty)empty.style.display='none'}

async function openVibeUsers(){
  const modal=$('modal'),content=$('modalContent');if(!modal||!content)return;
  content.innerHTML='<div class="vibe-users-panel"><div class="vibe-users-head"><div class="vibe-settings-icon"><i class="fa-solid fa-users"></i></div><div><h2>Utilisateurs VIBE</h2><p>Choisis une personne pour démarrer une discussion.</p></div></div><div id="vibeUsersList" class="vibe-users-list"><div class="empty">Chargement des utilisateurs…</div></div></div>';
  modal.showModal();
  const list=$('vibeUsersList');
  try{
    const auth=getAuth(getApp()),db=getFirestore(getApp()),me=auth.currentUser;
    const snap=await getDocs(collection(db,'users'));
    const users=[];snap.forEach(d=>{const u=d.data();if(!me||u.uid!==me.uid)users.push(u)});
    users.sort((a,b)=>(a.name||a.email||'').localeCompare(b.name||b.email||'','fr'));
    if(!users.length){list.innerHTML='<div class="empty"><i class="fa-solid fa-user-slash"></i><b>Aucun autre utilisateur VIBE</b><small>Lorsqu’une personne crée un compte VIBE, elle apparaîtra ici.</small></div>';return}
    list.innerHTML='';
    users.forEach(u=>{
      const item=document.createElement('button');item.type='button';item.className='vibe-user-item';
      const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      item.innerHTML=`<img src="${safe(u.avatar||'https://i.pravatar.cc/100?img=12')}" alt=""><span><b>${safe(u.name||'Utilisateur')}</b><small>${u.online?'🟢 En ligne':(u.email||'Hors ligne')}</small></span><i class="fa-solid fa-chevron-right"></i>`;
      item.onclick=()=>{modal.close();if(window.openChat)window.openChat({uid:u.uid,name:u.name||'Utilisateur',avatar:u.avatar,group:false});else document.querySelector(`.contact[data-id="${CSS.escape(u.uid)}"]`)?.click()};
      list.appendChild(item);
    });
  }catch(e){list.innerHTML='<div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><b>Impossible de charger les utilisateurs</b><small>Vérifie ta connexion et les règles Firestore.</small></div>';toast('Liste des utilisateurs indisponible.')}
}

function initInteractionFixes(){
  const search=$('search'),clear=$('clearSearch');
  if(search){const sync=()=>{if(clear)clear.hidden=!search.value.trim();applyUserSearch()};search.addEventListener('input',sync);search.addEventListener('keyup',applyUserSearch);sync();search.addEventListener('keydown',e=>{if(e.key==='Escape'){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.blur()}})}
  if(clear&&search)clear.onclick=()=>{search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()};
  const contacts=$('contacts');if(contacts)new MutationObserver(()=>applyUserSearch()).observe(contacts,{childList:true});

  const theme=$('theme');
  if(theme)theme.onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('vibe-theme',document.body.classList.contains('dark')?'dark':'light')};
  if(localStorage.getItem('vibe-theme')==='dark')document.body.classList.add('dark');

  const railProfile=$('railProfile'),profile=$('profile'),railSettings=$('railSettings');
  if(railProfile&&railSettings)railProfile.onclick=()=>railSettings.click();
  if(profile)profile.onclick=()=>railSettings?.click();
  if(railSettings)railSettings.onclick=()=>{
    const modal=$('modal'),content=$('modalContent');if(!modal||!content)return;
    const name=$('meName')?.textContent||'Utilisateur',avatar=$('meAvatar')?.src||$('railAvatar')?.src||'https://i.pravatar.cc/150?img=12',status=$('meStatus')?.textContent||'● En ligne';
    const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    content.innerHTML=`<div class="vibe-settings-panel"><div class="vibe-settings-head"><img class="vibe-settings-avatar" src="${safe(avatar)}" alt="Profil"><div><h2>${safe(name)}</h2><p class="vibe-settings-online">${safe(status)}</p></div></div><div class="vibe-settings-title">Paramètres</div><button class="vibe-setting-row" id="settingsProfile" type="button"><i class="fa-solid fa-user"></i><span>Mon profil</span><small>Modifier</small></button><button class="vibe-setting-row" id="settingsTheme" type="button"><i class="fa-solid fa-moon"></i><span>Apparence</span><small>${document.body.classList.contains('dark')?'Sombre':'Clair'}</small></button><button class="vibe-setting-row vibe-setting-danger" id="settingsLogout" type="button"><i class="fa-solid fa-right-from-bracket"></i><span>Se déconnecter</span><small>Quitter ce compte</small></button></div>`;
    modal.showModal();
    $('settingsProfile').onclick=()=>openModernProfile();
    $('settingsTheme').onclick=()=>{theme?.click();const s=$('settingsTheme')?.querySelector('small');if(s)s.textContent=document.body.classList.contains('dark')?'Sombre':'Clair'};
    $('settingsLogout').onclick=()=>{$('settingsLogout').disabled=true;toast('Déconnexion…');$('logout')?.click()};
  };

  const newChat=$('newChat');if(newChat)newChat.onclick=()=>openVibeUsers();
  const chats=$('railChats'),stories=$('railStories'),communities=$('railCommunities'),favorites=$('railFavorites'),archive=$('railArchive');
  const activateTab=name=>document.querySelector(`.tab[data-tab="${name}"]`)?.click();
  if(chats)chats.onclick=()=>activateTab('chats');
  if(stories)stories.onclick=()=>activateTab('stories');
  if(communities)communities.onclick=()=>{document.querySelectorAll('.rail-button').forEach(x=>x.classList.remove('active'));communities.classList.add('active');const box=$('contacts');if(box){box.hidden=false;box.innerHTML='<div class="empty">Aucune communauté pour le moment.</div>'}toast('Communautés')};
  if(favorites)favorites.onclick=()=>{activateTab('chats');setTimeout(()=>document.querySelector('.pill[data-filter="favorites"]')?.click(),0)};
  if(archive)archive.onclick=()=>{activateTab('chats');document.querySelectorAll('#contacts .contact').forEach(x=>x.hidden=!x.dataset.archived);toast('Discussions archivées')};

  const newGroupQuick=$('newGroupQuick'),newGroup=$('newGroup');if(newGroupQuick&&newGroup)newGroupQuick.onclick=()=>newGroup.click();
  const newStatusQuick=$('newStatusQuick');if(newStatusQuick)newStatusQuick.onclick=()=>{const text=prompt('Écris ton statut :');if(!text?.trim())return;localStorage.setItem('vibe-status',text.trim());const storiesBox=$('stories');if(storiesBox){storiesBox.innerHTML=`<div class="empty">Ton statut : <b>${text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c))}</b></div>`;storiesBox.hidden=false}activateTab('stories');toast('Statut publié')};

  document.querySelectorAll('.tabs .tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');const chatsActive=t.dataset.tab==='chats';if($('contacts'))$('contacts').hidden=!chatsActive;if($('stories'))$('stories').hidden=chatsActive;if(!chatsActive&&$('stories')&&!$('stories').innerHTML.trim())$('stories').innerHTML='<div class="empty">Aucun statut pour le moment.</div>'}));
  document.querySelectorAll('.filter-pills .pill').forEach(p=>p.addEventListener('click',()=>{document.querySelectorAll('.filter-pills .pill').forEach(x=>x.classList.remove('active'));p.classList.add('active');const f=p.dataset.filter;document.querySelectorAll('#contacts .contact').forEach(x=>{if(f==='all')x.hidden=false;else if(f==='groups')x.hidden=!x.textContent.includes('👥');else if(f==='favorites')x.hidden=!x.dataset.favorite;else if(f==='unread')x.hidden=!x.dataset.unread})}));

  const chatMenu=$('chatMenu');if(chatMenu)chatMenu.onclick=ev=>{ev.stopPropagation();document.querySelectorAll('.vibe-chat-menu').forEach(x=>x.remove());const head=document.querySelector('.chathead');if(!head)return;const menu=document.createElement('div');menu.className='vibe-chat-menu';[['🔎','Rechercher dans la discussion',()=>{$('message')?.focus()}],['🔔','Notifications',()=>toast('Notifications activées pour cette discussion.')],['🖼️','Médias, liens et documents',()=>toast('Les médias de cette discussion sont disponibles dans la conversation.')],['⭐','Ajouter aux favoris',()=>toast('Option de favori prête à être reliée à la discussion.')]].forEach(([icon,label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=`${icon}  ${label}`;b.onclick=()=>{fn();menu.remove()};menu.appendChild(b)});head.parentElement.style.position='relative';head.parentElement.appendChild(menu)};
  const emoji=$('emoji');if(emoji)emoji.setAttribute('aria-label','Choisir un emoji');
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.vibe-chat-menu,.vibe-emoji-picker').forEach(x=>x.remove())});
}

async function openModernProfile(){
  const modal=$('modal'),content=$('modalContent');if(!modal||!content)return;
  const name=$('meName')?.textContent||'Utilisateur',avatar=$('meAvatar')?.src||$('railAvatar')?.src||'https://i.pravatar.cc/150?img=12';
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  content.innerHTML=`<div class="vibe-profile-card"><div class="vibe-profile-hero"><img class="vibe-profile-avatar" src="${safe(avatar)}" alt="Profil"><div><h2>${safe(name)}</h2><p>Compte VIBE</p><span class="vibe-profile-status"><i class="fa-solid fa-circle"></i> En ligne</span></div></div><div class="vibe-profile-actions"><button class="vibe-profile-action" id="rename" type="button"><i class="fa-solid fa-pen"></i><span>Modifier mon nom</span></button><button class="vibe-profile-action" id="backSettings" type="button"><i class="fa-solid fa-gear"></i><span>Paramètres du compte</span></button></div></div>`;
  modal.showModal();
  $('rename').onclick=async()=>{const n=prompt('Nouveau nom :',$('meName')?.textContent||'Utilisateur');if(!n?.trim())return;const button=$('rename');if(button)button.disabled=true;try{const auth=getAuth(getApp()),user=auth.currentUser;if(user?.uid){await updateDoc(doc(getFirestore(getApp()),'users',user.uid),{name:n.trim()})}$('meName').textContent=n.trim();$('railAvatar')?.setAttribute('title',n.trim());toast('Profil mis à jour.')}catch(e){toast('Impossible de modifier le profil.')}finally{if(button)button.disabled=false}};
  $('backSettings').onclick=()=>{modal.close();$('railSettings')?.click()};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initInteractionFixes);else initInteractionFixes();