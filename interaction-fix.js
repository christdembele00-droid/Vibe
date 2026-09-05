const $=id=>document.getElementById(id);
const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.style.display='block';clearTimeout(window.__interactionToast);window.__interactionToast=setTimeout(()=>e.style.display='none',2800)};

function initInteractionFixes(){
  const clear=$('clearSearch'),search=$('search');
  if(clear&&search){
    clear.onclick=()=>{search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()};
    const sync=()=>clear.hidden=!search.value.trim();
    search.addEventListener('input',sync);sync();
  }

  const newChat=$('newChat');
  if(newChat) newChat.onclick=()=>{search?.focus();toast('Recherche un utilisateur pour démarrer une discussion.')};

  const theme=$('theme');
  if(theme) theme.onclick=()=>document.body.classList.toggle('dark');

  const railProfile=$('railProfile'),profile=$('profile');
  if(railProfile&&profile) railProfile.onclick=()=>profile.click();
  const railSettings=$('railSettings');
  if(railSettings&&profile) railSettings.onclick=()=>profile.click();

  const railChats=$('railChats'),railStories=$('railStories'),railCommunities=$('railCommunities'),railFavorites=$('railFavorites'),railArchive=$('railArchive');
  if(railChats) railChats.onclick=()=>document.querySelector('.tab[data-tab="chats"]')?.click();
  if(railStories) railStories.onclick=()=>document.querySelector('.tab[data-tab="stories"]')?.click();
  if(railCommunities) railCommunities.onclick=()=>toast('Les communautés VIBE arrivent bientôt.');
  if(railFavorites) railFavorites.onclick=()=>{document.querySelector('.pill[data-filter="favorites"]')?.click();toast('Affichage des favoris.')};
  if(railArchive) railArchive.onclick=()=>toast('Aucune discussion archivée.');

  const newGroupQuick=$('newGroupQuick'),newGroup=$('newGroup');
  if(newGroupQuick&&newGroup) newGroupQuick.onclick=()=>newGroup.click();
  const newStatusQuick=$('newStatusQuick');
  if(newStatusQuick) newStatusQuick.onclick=()=>toast('Création de statut bientôt disponible.');

  const tabs=[...document.querySelectorAll('.tabs .tab')];
  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    const chats=t.dataset.tab==='chats';
    if($('contacts')) $('contacts').hidden=!chats;
    if($('stories')) $('stories').hidden=chats;
    if(!chats&&$('stories')) $('stories').innerHTML='<div class="empty">Aucun statut pour le moment.</div>';
  }));

  document.querySelectorAll('.filter-pills .pill').forEach(p=>p.addEventListener('click',()=>{
    document.querySelectorAll('.filter-pills .pill').forEach(x=>x.classList.remove('active'));p.classList.add('active');
    const f=p.dataset.filter;
    if(f==='all') document.querySelectorAll('#contacts .contact').forEach(x=>x.hidden=false);
    else if(f==='groups') document.querySelectorAll('#contacts .contact').forEach(x=>x.hidden=!x.textContent.includes('👥'));
    else if(f==='favorites') toast('Les favoris seront disponibles avec les favoris de discussion.');
    else if(f==='unread') toast('Les discussions non lues seront affichées ici.');
  }));

  const chatMenu=$('chatMenu');
  if(chatMenu){
    chatMenu.onclick=(ev)=>{
      ev.stopPropagation();
      document.querySelectorAll('.vibe-chat-menu').forEach(x=>x.remove());
      const head=document.querySelector('.chathead');
      if(!head)return;
      const menu=document.createElement('div');menu.className='vibe-chat-menu';
      const actions=[
        ['🔎','Rechercher dans la discussion',()=>{$('message')?.focus()}],
        ['🔔','Notifications',()=>toast('Les notifications sont gérées par ton navigateur.')],
        ['🖼️','Médias, liens et documents',()=>toast('Les médias et documents restent accessibles dans cette discussion.')]
      ];
      actions.forEach(([icon,label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=`${icon}  ${label}`;b.onclick=()=>{fn();menu.remove()};menu.appendChild(b)});
      head.parentElement.style.position='relative';head.parentElement.appendChild(menu);
    };
  }

  const emoji=$('emoji');
  if(emoji) emoji.setAttribute('aria-label','Choisir un emoji');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.vibe-chat-menu,.vibe-emoji-picker').forEach(x=>x.remove())}});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initInteractionFixes);else initInteractionFixes();
