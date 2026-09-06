let groupMenu=null;
function closeGroupMenu(){groupMenu?.remove();groupMenu=null}
function showGroupMenu(){
  if(groupMenu){closeGroupMenu();return}
  groupMenu=document.createElement('div');groupMenu.className='vibe-group-menu';
  groupMenu.innerHTML='<button type="button" data-action="create-group">Créer un groupe</button><button type="button" data-action="new-chat">Nouvelle discussion</button><button type="button" data-action="join-chat">Rejoindre une discussion</button>';
  document.body.appendChild(groupMenu);
  const anchor=document.getElementById('newChatBtn');
  const r=anchor?.getBoundingClientRect();
  if(r){groupMenu.style.position='fixed';groupMenu.style.top=`${r.bottom+8}px`;groupMenu.style.left=`${Math.max(8,r.right-220)}px`}
  groupMenu.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(!action)return;
    closeGroupMenu();
    if(action==='create-group')window.VibeApp?.createGroup?.();
    if(action==='new-chat')window.VibeApp?.createChat?.();
    if(action==='join-chat')window.VibeApp?.joinChat?.();
  });
}
function showMessagesView(){
  document.querySelectorAll('.tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.view==='chats'));
  document.getElementById('conversationList')?.classList.remove('hidden');
  document.getElementById('activeUsersList')?.classList.remove('hidden');
  document.getElementById('chatView')?.classList.remove('hidden');
  document.getElementById('vibeCallHistoryPanel')?.classList.add('hidden');
  document.getElementById('callHistoryPanel')?.classList.add('hidden');
  document.getElementById('callsView')?.classList.add('hidden');
}
document.addEventListener('click',event=>{
  const target=event.target.closest('#newChatBtn');
  if(target){event.preventDefault();event.stopImmediatePropagation();showGroupMenu();return}
  const group=event.target.closest('[data-action="group"],#groupBtn,[title*="groupe" i],[aria-label*="groupe" i]');
  if(group){event.preventDefault();event.stopImmediatePropagation();window.VibeApp?.createGroup?.();return}
  const tab=event.target.closest('.tab[data-view="chats"]');
  if(tab){event.preventDefault();event.stopImmediatePropagation();showMessagesView();window.VibeApp?.getChats?.();return}
  if(groupMenu&&!event.target.closest('.vibe-group-menu'))closeGroupMenu();
},true);
const style=document.createElement('style');style.textContent='.vibe-group-menu{z-index:9999;min-width:220px;padding:7px;border:1px solid rgba(127,127,127,.16);border-radius:16px;background:var(--panel-bg,#fff);box-shadow:0 18px 50px rgba(0,0,0,.16);display:grid;gap:4px}.vibe-group-menu button{border:0;background:transparent;color:inherit;text-align:left;padding:11px 13px;border-radius:11px;cursor:pointer;font:inherit}.vibe-group-menu button:hover{background:rgba(127,127,127,.10)}';document.head.appendChild(style);
