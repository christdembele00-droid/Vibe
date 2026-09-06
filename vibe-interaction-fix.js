function $(id){return document.getElementById(id)}
function shell(){return $('appShell')}
function sidebar(){return $('sidebar')}
function chatPanel(){return $('chatPanel')}
const MODULE_IDS={status:'statusView',calls:'callsView',channels:'channelsView'}
function moveModuleToSidebar(id){const el=$(id),side=sidebar();if(!el||!side)return;el.classList.remove('hidden');el.dataset.vibeSidebarView='true';side.appendChild(el)}
function restoreModules(){const panel=chatPanel();if(!panel)return;Object.values(MODULE_IDS).forEach(id=>{const el=$(id);if(!el)return;el.dataset.vibeSidebarView='';el.classList.add('hidden');panel.appendChild(el)})}
function setRailActive(view){document.querySelectorAll('.rail-item[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view))}
function showWelcome(){const hasChat=Boolean(window.VibeApp?.currentChatId);$('chatView')?.classList.toggle('hidden',!hasChat);$('emptyState')?.classList.toggle('hidden',hasChat);if(hasChat)$('chatView')?.classList.remove('hidden')}
function setSidebarMode(view){const side=sidebar(),sh=shell();if(!side||!sh)return;side.classList.toggle('context-open',view!=='chats');side.dataset.view=view||'chats';sh.classList.toggle('module-open',view!=='chats');sh.classList.toggle('chat-open',view==='chats'&&Boolean(window.VibeApp?.currentChatId));setRailActive(view)}
function openView(view){
  const normalized=view==='status'||view==='calls'||view==='channels'?'status'===view?'status':view:'chats';
  const official=window.Vibe2026Theme?.setView;
  if(official)try{official(normalized)}catch(error){console.warn('Navigation Vibe:',error)}
  restoreModules();
  if(normalized==='chats'){
    setSidebarMode('chats');
    showWelcome();
    return;
  }
  const id=MODULE_IDS[normalized];
  moveModuleToSidebar(id);
  setSidebarMode(normalized);
  $('chatView')?.classList.add('hidden');
  $('emptyState')?.classList.remove('hidden');
  $('emptyState')?.classList.add('hidden');
}
function openSettings(){
  restoreModules();
  setSidebarMode('settings');
  $('chatView')?.classList.add('hidden');
  $('emptyState')?.classList.remove('hidden');
  window.VibeSettings?.openSettings?.();
}
function closeSettings(){window.VibeSettings?.closeSettings?.();setSidebarMode('chats');restoreModules();showWelcome()}
function enhanceMessages(){
  const container=$('messages');if(!container||container.dataset.vibeMetaBound)return;
  container.dataset.vibeMetaBound='true';
  const update=()=>container.querySelectorAll('.message').forEach(article=>{
    const bubble=article.querySelector('.message-bubble')||article;
    if(article.querySelector('.vibe-message-meta'))return;
    const ts=Number(article.dataset.createdAt||0);
    const meta=document.createElement('span');meta.className='vibe-message-meta';
    const time=ts?new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
    meta.innerHTML=`<time>${time}</time><span class="vibe-read-checks" aria-label="Envoyé">✓✓</span>`;
    bubble.appendChild(meta);
  });
  new MutationObserver(update).observe(container,{childList:true,subtree:true});
  update();
}
function enhanceComposer(){
  const input=$('messageInput'),send=$('messageForm')?.querySelector('.send-btn'),voice=$('voiceBtn');
  if(!input||!send||input.dataset.vibeComposerBound)return;
  input.dataset.vibeComposerBound='true';
  if(voice)voice.style.display='none';
  const icon=()=>send.querySelector('.svg-send,.svg-mic');
  const sync=()=>{
    const has=Boolean(input.value.trim());
    send.classList.toggle('is-mic',!has);send.setAttribute('aria-label',has?'Envoyer':'Message vocal');
    const old=icon();if(old)old.className=has?'svg-send':'svg-mic';
  };
  input.addEventListener('input',sync);sync();
  send.addEventListener('click',event=>{
    if(!input.value.trim()&&voice){event.preventDefault();voice.click()}
  });
}
function bindEmoji(){
  const form=$('messageForm');if(!form||$('emojiBtn'))return;
  const button=document.createElement('button');button.type='button';button.id='emojiBtn';button.className='composer-btn';button.title='Emoji et stickers';button.setAttribute('aria-label','Emoji et stickers');button.innerHTML='<span class="svg-emoji" aria-hidden="true">☺</span>';
  form.insertBefore(button,form.querySelector('#attachBtn')||form.firstChild);
  button.addEventListener('click',()=>{const input=$('messageInput');if(!input)return;const value=prompt('Emoji :','😀');if(value){input.value+=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}})
}
function initVibeInteractions(){
  if(document.documentElement.dataset.vibeInteractionInit)return;
  document.documentElement.dataset.vibeInteractionInit='true';
  document.addEventListener('click',event=>{
    const viewButton=event.target.closest('[data-view]');
    if(viewButton){event.preventDefault();event.stopPropagation();const view=viewButton.dataset.view||'chats';if(view==='settings')openSettings();else if(view==='chats')closeSettings();else openView(view);return}
    const settingsButton=event.target.closest('#settingsRailBtn');
    if(settingsButton){event.preventDefault();event.stopPropagation();openSettings();return}
    if(event.target.closest('#backBtn')){event.preventDefault();event.stopPropagation();closeSettings();return}
    if(event.target.closest('#vibeSettingsClose')){event.preventDefault();event.stopPropagation();closeSettings();return}
    if(event.target.closest('#vibeSettingsBack'))return;
    if(event.target.closest('.conversation-item')){closeSettings();setSidebarMode('chats');shell()?.classList.add('chat-open');return}
  },true);
  document.addEventListener('vibe:open-chat',()=>{closeSettings();setSidebarMode('chats');shell()?.classList.add('chat-open')});
  const list=$('conversationList');list?.addEventListener('click',()=>{closeSettings();setSidebarMode('chats');shell()?.classList.add('chat-open')});
  bindEmoji();enhanceComposer();enhanceMessages();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initVibeInteractions,{once:true});else initVibeInteractions();
window.VibeInteractionFix={openView,openSettings,closeSettings,syncMobilePanel:view=>{if(view==='settings')openSettings();else openView(view||'chats')}};
