/* VIBE SPA shell: keeps app actions inside the current document. */
(()=>{
 const $=id=>document.getElementById(id), app=()=>document.querySelector('.app'), modal=()=>$('modal'), body=()=>document.body;
 const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
 const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.style.display='block';clearTimeout(window.__vibeSpaToast);window.__vibeSpaToast=setTimeout(()=>e.style.display='none',2600)};
 const close=()=>{const m=modal();if(m?.open)m.close()};
 function setView(view){
  body().dataset.vibeView=view;
  document.querySelectorAll('[data-vibe-view]').forEach(x=>x.classList.toggle('active',x.dataset.vibeView===view));
  if(view==='chats') $('railChats')?.click();
  if(view==='stories') $('railStories')?.click();
  if(view==='communities') $('railCommunities')?.click();
  if(view==='favorites'){document.querySelector('[data-filter="favorites"]')?.click();$('railChats')?.click()}
  if(view==='archive'){toast('Les discussions archivées sont affichées depuis l’espace Discussions.');$('railChats')?.click()}
 }
 function showModal(title,html,wide=false){const m=modal(),c=$('modalContent');if(!m||!c)return;c.innerHTML=`<div class="vibe-spa-modal ${wide?'wide':''}"><div class="vibe-spa-head"><div><h2>${esc(title)}</h2><small>VIBE · vue interne</small></div><button id="vibeSpaClose" type="button" aria-label="Fermer">×</button></div><div class="vibe-spa-body">${html}</div></div>`;m.showModal();$('vibeSpaClose').onclick=close}
 function profile(){
  const u=window.firebase?.currentUser;
  const name=$('meName')?.textContent||'Utilisateur', avatar=$('meAvatar')?.src||'https://i.pravatar.cc/150?img=12';
  showModal('Mon profil',`<div class="spa-profile"><img src="${esc(avatar)}" alt=""><h3>${esc(name)}</h3><p>${esc(u?.email||'Compte VIBE')}</p><button id="spaProfileEdit" class="primary-action" type="button">Modifier mon nom</button></div>`);
  $('spaProfileEdit').onclick=()=>{close();setTimeout(()=>$('profile')?.click(),0)};
 }
 function settings(){
  showModal('Paramètres',`<div class="spa-settings"><button id="spaTheme" type="button"><b>🌙 Thème</b><span>${body().classList.contains('dark')?'Sombre':'Clair'}</span></button><button id="spaProfile" type="button"><b>👤 Mon profil</b><span>›</span></button><button id="spaClearSearch" type="button"><b>🔎 Effacer la recherche</b><span>›</span></button><button id="spaAbout" type="button"><b>ℹ️ À propos de VIBE</b><span>›</span></button></div>`);
  $('spaTheme').onclick=()=>{body().classList.toggle('dark');localStorage.setItem('vibe-theme',body().classList.contains('dark')?'dark':'light');settings()};
  $('spaProfile').onclick=()=>{close();setTimeout(profile,0)};
  $('spaClearSearch').onclick=()=>{$('search').value='';$('clearSearch')?.click();close();toast('Recherche effacée.')};
  $('spaAbout').onclick=()=>showModal('À propos de VIBE',`<div class="spa-about"><div class="spa-v">V</div><h3>VIBE</h3><p>Messagerie moderne en temps réel.</p><small>Application SPA · Firebase · VIBE AI</small></div>`);
 }
 function mediaViewer(el){
  const src=el.currentSrc||el.src||el.querySelector?.('source')?.src;if(!src)return;
  let content='';
  if(el.tagName==='IMG')content=`<div class="spa-media-stage"><img src="${esc(src)}" alt="Aperçu"></div>`;
  else if(el.tagName==='VIDEO')content=`<div class="spa-media-stage"><video src="${esc(src)}" controls autoplay playsinline></video></div>`;
  else if(el.tagName==='AUDIO')content=`<div class="spa-media-stage audio"><audio src="${esc(src)}" controls autoplay></audio></div>`;
  else return;
  showModal('Média',content,true);
 }
 function fileViewer(a){
  const src=a.href;if(!src)return;
  showModal(a.textContent?.trim()||'Fichier',`<div class="spa-file-stage"><iframe src="${esc(src)}" title="Aperçu du fichier"></iframe><p>Si ce format ne peut pas être prévisualisé, le fichier reste accessible dans VIBE.</p></div>`,true);
 }
 function bind(){
  document.addEventListener('click',e=>{
   const media=e.target.closest?.('#messages img.media,#messages video.media,#messages audio');
   if(media){e.preventDefault();e.stopImmediatePropagation();mediaViewer(media);return}
   const file=e.target.closest?.('#messages a.file-link');
   if(file){e.preventDefault();e.stopImmediatePropagation();fileViewer(file);return}
   const settingsBtn=e.target.closest?.('#railSettings');
   if(settingsBtn){e.preventDefault();e.stopImmediatePropagation();settings();return}
   const profileBtn=e.target.closest?.('#railProfile,#profile');
   if(profileBtn){e.preventDefault();e.stopImmediatePropagation();profile();return}
   const v=e.target.closest?.('[data-vibe-route]');
   if(v){e.preventDefault();e.stopImmediatePropagation();setView(v.dataset.vibeRoute)}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  window.addEventListener('beforeunload',e=>{if(document.visibilityState==='visible'&&body().dataset.vibeSpaBlockUnload==='true'){e.preventDefault();e.returnValue=''}});
  window.VIBE_SPA={setView,showModal,close,settings,profile,mediaViewer,fileViewer};
 }
 window.addEventListener('DOMContentLoaded',bind);
})();
