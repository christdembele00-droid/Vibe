const $=id=>document.getElementById(id);
const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.style.display='block';clearTimeout(window.__interactionToast);window.__interactionToast=setTimeout(()=>e.style.display='none',2800)};

function showTab(tab){
  const chats=$('contacts'),stories=$('stories');
  if(!chats||!stories)return;
  const isStories=tab==='stories';
  chats.hidden=isStories;
  stories.hidden=!isStories;
  document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  document.querySelectorAll('.rail-button').forEach(x=>x.classList.remove('active'));
  $(isStories?'railStories':'railChats')?.classList.add('active');
}

function initInteractionFixes(){
  const clear=$('clearSearch'),search=$('search');
  if(clear&&search){
    clear.onclick=()=>{search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()};
    const sync=()=>clear.hidden=!search.value.trim();
    search.addEventListener('input',sync);sync();
  }

  const newChat=$('newChat');
  if(newChat)newChat.onclick=()=>{showTab('chats');search?.focus();toast('Recherche un utilisateur pour démarrer une discussion.')};

  const theme=$('theme');
  if(theme)theme.onclick=()=>{document.body.classList.toggle('dark');toast(document.body.classList.contains('dark')?'Mode sombre activé.':'Mode clair activé.')};

  document.querySelectorAll('.tabs .tab').forEach(t=>t.addEventListener('click',()=>showTab(t.dataset.tab)));

  const newGroupQuick=$('newGroupQuick');
  if(newGroupQuick)newGroupQuick.onclick=()=>$('newGroup')?.click();
  const newStatusQuick=$('newStatusQuick');
  if(newStatusQuick)newStatusQuick.onclick=()=>{showTab('stories');toast('Onglet Statuts ouvert.')};

  const railChats=$('railChats');
  if(railChats)railChats.onclick=()=>showTab('chats');
  const railStories=$('railStories');
  if(railStories)railStories.onclick=()=>showTab('stories');
  const railCommunities=$('railCommunities');
  if(railCommunities)railCommunities.onclick=()=>toast('Communautés VIBE : bientôt disponibles.');
  const railFavorites=$('railFavorites');
  if(railFavorites)railFavorites.onclick=()=>toast('Favoris : sélectionne une discussion favorite pour la retrouver ici.');
  const railArchive=$('railArchive');
  if(railArchive)railArchive.onclick=()=>toast('Archivées : cette section sera disponible prochainement.');
  const railSettings=$('railSettings');
  if(railSettings)railSettings.onclick=()=>$('profile')?.click();
  const railProfile=$('railProfile');
  if(railProfile)railProfile.onclick=()=>$('profile')?.click();

  const meAvatar=$('meAvatar'),railAvatar=$('railAvatar');
  if(meAvatar&&railAvatar){
    const syncAvatar=()=>{if(meAvatar.src)railAvatar.src=meAvatar.src};
    syncAvatar();
    new MutationObserver(syncAvatar).observe(meAvatar,{attributes:true,attributeFilter:['src']});
  }

  document.querySelectorAll('.pill').forEach(p=>p.addEventListener('click',()=>{
    document.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));p.classList.add('active');
    const f=p.dataset.filter;
    if(f==='groups')toast('Filtre Groupes sélectionné.');
    else if(f==='unread')toast('Filtre Non lues sélectionné.');
    else if(f==='favorites')toast('Filtre Favoris sélectionné.');
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

  const emoji=$('emoji');if(emoji)emoji.setAttribute('aria-label','Choisir un emoji');
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.vibe-chat-menu,.vibe-emoji-picker').forEach(x=>x.remove())});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initInteractionFixes);else initInteractionFixes();
