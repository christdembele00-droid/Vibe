const $=id=>document.getElementById(id);
const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.style.display='block';clearTimeout(window.__interactionToast);window.__interactionToast=setTimeout(()=>e.style.display='none',2400)};

function initInteractionFixes(){
  const search=$('search'),clear=$('clearSearch');
  if(search){const sync=()=>{if(clear)clear.hidden=!search.value.trim()};search.addEventListener('input',sync);sync();search.addEventListener('keydown',e=>{if(e.key==='Escape'){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.blur()}})}
  if(clear&&search)clear.onclick=()=>{search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()};

  const theme=$('theme');
  if(theme)theme.onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('vibe-theme',document.body.classList.contains('dark')?'dark':'light')};
  if(localStorage.getItem('vibe-theme')==='dark')document.body.classList.add('dark');

  const railProfile=$('railProfile'),profile=$('profile'),railSettings=$('railSettings');
  if(railProfile&&profile)railProfile.onclick=()=>profile.click();

  // La déconnexion est volontairement disponible uniquement dans Paramètres.
  if(railSettings)railSettings.onclick=()=>{
    const modal=$('modal'),content=$('modalContent');if(!modal||!content)return;
    const name=$('meName')?.textContent||'Utilisateur';
    content.innerHTML=`<div class="vibe-settings-panel"><div class="vibe-settings-head"><div class="vibe-settings-icon"><i class="fa-solid fa-gear"></i></div><div><h2>Paramètres</h2><p>Gère ton compte et tes préférences</p></div></div><button class="vibe-setting-row" id="settingsProfile" type="button"><i class="fa-solid fa-user"></i><span>Mon profil</span><small>${String(name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</small></button><button class="vibe-setting-row" id="settingsTheme" type="button"><i class="fa-solid fa-moon"></i><span>Apparence</span><small>${document.body.classList.contains('dark')?'Sombre':'Clair'}</small></button><button class="vibe-setting-row vibe-setting-danger" id="settingsLogout" type="button"><i class="fa-solid fa-right-from-bracket"></i><span>Se déconnecter</span><small>Quitter ce compte</small></button></div>`;
    modal.showModal();
    $('settingsProfile').onclick=()=>{modal.close();profile?.click()};
    $('settingsTheme').onclick=()=>{theme?.click();const s=$('settingsTheme small');if(s)s.textContent=document.body.classList.contains('dark')?'Sombre':'Clair'};
    $('settingsLogout').onclick=()=>{$('settingsLogout').disabled=true;toast('Déconnexion…');$('logout')?.click()};
  };

  const chats=$('railChats'),stories=$('railStories'),communities=$('railCommunities'),favorites=$('railFavorites'),archive=$('railArchive');
  const activateTab=name=>document.querySelector(`.tab[data-tab="${name}"]`)?.click();
  if(chats)chats.onclick=()=>activateTab('chats');
  if(stories)stories.onclick=()=>activateTab('stories');
  if(communities)communities.onclick=()=>{document.querySelectorAll('.rail-button').forEach(x=>x.classList.remove('active'));communities.classList.add('active');const box=$('contacts');if(box){box.hidden=false;box.innerHTML='<div class="empty">Aucune communauté pour le moment.</div>'}toast('Communautés')};
  if(favorites)favorites.onclick=()=>{activateTab('chats');setTimeout(()=>document.querySelector('.pill[data-filter="favorites"]')?.click(),0)};
  if(archive)archive.onclick=()=>{activateTab('chats');document.querySelectorAll('#contacts .contact').forEach(x=>x.hidden=!x.dataset.archived);toast('Discussions archivées')};

  const newGroupQuick=$('newGroupQuick'),newGroup=$('newGroup');
  if(newGroupQuick&&newGroup)newGroupQuick.onclick=()=>newGroup.click();
  const newStatusQuick=$('newStatusQuick');
  if(newStatusQuick)newStatusQuick.onclick=()=>{const text=prompt('Écris ton statut :');if(!text?.trim())return;localStorage.setItem('vibe-status',text.trim());const storiesBox=$('stories');if(storiesBox){storiesBox.innerHTML=`<div class="empty">Ton statut : <b>${text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</b></div>`;storiesBox.hidden=false}activateTab('stories');toast('Statut publié')};

  document.querySelectorAll('.tabs .tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');const chatsActive=t.dataset.tab==='chats';if($('contacts'))$('contacts').hidden=!chatsActive;if($('stories'))$('stories').hidden=chatsActive;if(!chatsActive&&$('stories')&&!$('stories').innerHTML.trim())$('stories').innerHTML='<div class="empty">Aucun statut pour le moment.</div>'}));

  document.querySelectorAll('.filter-pills .pill').forEach(p=>p.addEventListener('click',()=>{document.querySelectorAll('.filter-pills .pill').forEach(x=>x.classList.remove('active'));p.classList.add('active');const f=p.dataset.filter;document.querySelectorAll('#contacts .contact').forEach(x=>{if(f==='all')x.hidden=false;else if(f==='groups')x.hidden=!x.textContent.includes('👥');else if(f==='favorites')x.hidden=!x.dataset.favorite;else if(f==='unread')x.hidden=!x.dataset.unread})}));

  const chatMenu=$('chatMenu');
  if(chatMenu)chatMenu.onclick=ev=>{ev.stopPropagation();document.querySelectorAll('.vibe-chat-menu').forEach(x=>x.remove());const head=document.querySelector('.chathead');if(!head)return;const menu=document.createElement('div');menu.className='vibe-chat-menu';[['🔎','Rechercher dans la discussion',()=>{$('message')?.focus()}],['🔔','Notifications',()=>toast('Notifications activées pour cette discussion.')],['🖼️','Médias, liens et documents',()=>toast('Les médias de cette discussion sont disponibles dans la conversation.')],['⭐','Ajouter aux favoris',()=>toast('Option de favori prête à être reliée à la discussion.')]].forEach(([icon,label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=`${icon}  ${label}`;b.onclick=()=>{fn();menu.remove()};menu.appendChild(b)});head.parentElement.style.position='relative';head.parentElement.appendChild(menu)};

  const emoji=$('emoji');if(emoji)emoji.setAttribute('aria-label','Choisir un emoji');
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.vibe-chat-menu,.vibe-emoji-picker').forEach(x=>x.remove())});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initInteractionFixes);else initInteractionFixes();