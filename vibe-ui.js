const $=id=>document.getElementById(id);
const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.style.display='block';clearTimeout(window.__vibeToast);window.__vibeToast=setTimeout(()=>e.style.display='none',2800)};

function showTab(tab){
  const chats=$('contacts'),stories=$('stories');
  if(!chats||!stories)return;
  const isStories=tab==='stories';
  chats.hidden=isStories;stories.hidden=!isStories;
  document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  document.querySelectorAll('.rail-button').forEach(x=>x.classList.remove('active'));
  $(isStories?'railStories':'railChats')?.classList.add('active');
}
function initUI(){
  const search=$('search'),clear=$('clearSearch');
  if(search){
    const sync=()=>{if(clear)clear.hidden=!search.value.trim()};
    search.addEventListener('input',sync);sync();
    search.addEventListener('keydown',e=>{if(e.key==='Escape'){search.value='';search.dispatchEvent(new Event('input'));search.blur()}});
  }
  if(clear&&search)clear.onclick=()=>{search.value='';search.dispatchEvent(new Event('input'));search.focus()};
  $('newChat')?.addEventListener('click',()=>{showTab('chats');search?.focus();toast('Recherche un utilisateur pour démarrer une discussion.')});
  $('newGroupQuick')?.addEventListener('click',()=>$('newGroup')?.click());
  $('newStatusQuick')?.addEventListener('click',()=>{showTab('stories');toast('Onglet Statuts ouvert.')});
  $('railChats')?.addEventListener('click',()=>showTab('chats'));
  $('railStories')?.addEventListener('click',()=>showTab('stories'));
  $('railCommunities')?.addEventListener('click',()=>toast('Communautés : bientôt disponibles.'));
  $('railFavorites')?.addEventListener('click',()=>toast('Favoris : bientôt disponibles.'));
  $('railArchive')?.addEventListener('click',()=>toast('Archivées : bientôt disponibles.'));
  $('railSettings')?.addEventListener('click',()=>$('profile')?.click());
  $('railProfile')?.addEventListener('click',()=>$('profile')?.click());
  $('theme')?.addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('vibe_theme',document.body.classList.contains('dark')?'dark':'light');toast(document.body.classList.contains('dark')?'Mode sombre activé.':'Mode clair activé.')});
  if(localStorage.getItem('vibe_theme')==='dark')document.body.classList.add('dark');
  const input=$('message'),mic=$('mic'),send=$('composer')?.querySelector('button[type="submit"]');
  if(input&&mic&&send){const sync=()=>{const has=!!input.value.trim();mic.hidden=has;send.hidden=!has};input.addEventListener('input',sync);sync();input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('composer')?.requestSubmit()}})}
  document.querySelectorAll('.tabs .tab').forEach(t=>t.addEventListener('click',()=>showTab(t.dataset.tab)));
  const meAvatar=$('meAvatar'),railAvatar=$('railAvatar');
  if(meAvatar&&railAvatar){const sync=()=>{if(meAvatar.src)railAvatar.src=meAvatar.src};sync();new MutationObserver(sync).observe(meAvatar,{attributes:true,attributeFilter:['src']})}
  const labels={newGroup:'Nouveau groupe',newChat:'Nouvelle discussion',theme:'Changer le thème',profile:'Mon profil',google:'Continuer avec Google',github:'Continuer avec GitHub',logout:'Se déconnecter',ai:'Assistant Gemini',audioCall:'Appel audio',videoCall:'Appel vidéo',chatMenu:'Plus d’options',back:'Retour',emoji:'Emoji',mic:'Message vocal'};
  Object.entries(labels).forEach(([id,label])=>{const e=$(id);if(e){e.setAttribute('aria-label',label);if(!e.title)e.title=label}});
  window.addEventListener('online',()=>toast('Connexion rétablie.'));
  window.addEventListener('offline',()=>toast('Connexion Internet interrompue.'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initUI);else initUI();