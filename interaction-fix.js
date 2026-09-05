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

  const chatMenu=$('chatMenu');
  if(chatMenu){
    chatMenu.onclick=(ev)=>{
      ev.stopPropagation();
      document.querySelectorAll('.vibe-chat-menu').forEach(x=>x.remove());
      const head=document.querySelector('.chathead');
      if(!head)return;
      const menu=document.createElement('div');
      menu.className='vibe-chat-menu';
      const actions=[
        ['🔎','Rechercher dans la discussion',()=>{$('message')?.focus()}],
        ['🔔','Notifications',()=>toast('Les notifications sont gérées par ton navigateur.')],
        ['🖼️','Médias, liens et documents',()=>toast('Les médias et documents restent accessibles dans cette discussion.')]
      ];
      if(window.currentUser?.group) actions.push(['👥','Infos du groupe',()=>toast('Infos du groupe disponibles dans le profil du groupe.')]);
      actions.forEach(([icon,label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=`${icon}  ${label}`;b.onclick=()=>{fn();menu.remove()};menu.appendChild(b)});
      head.parentElement.style.position='relative';head.parentElement.appendChild(menu);
    };
  }

  const emoji=$('emoji');
  if(emoji) emoji.setAttribute('aria-label','Choisir un emoji');

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.vibe-chat-menu,.vibe-emoji-picker').forEach(x=>x.remove())}});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initInteractionFixes);else initInteractionFixes();
