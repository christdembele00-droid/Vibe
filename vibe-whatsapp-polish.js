const root=document.getElementById('appShell');
const railItems=[...document.querySelectorAll('.rail-item[data-view]')];
const views={chats:document.getElementById('emptyState'),status:document.getElementById('statusView'),calls:document.getElementById('callsView'),channels:document.getElementById('channelsView')};
function markTransition(el){if(!el)return;el.classList.remove('is-transitioning');void el.offsetWidth;el.classList.add('is-transitioning');window.setTimeout(()=>el.classList.remove('is-transitioning'),320)}
function activeView(){return railItems.find(x=>x.classList.contains('active'))?.dataset.view||'chats'}
function syncNavigation(view){railItems.forEach(item=>item.classList.toggle('active',item.dataset.view===view));root?.setAttribute('data-vibe-view',view)}
function transitionTopLevel(view){const current=activeView();if(current===view)return;const target=views[view];if(target)markTransition(target)}
document.addEventListener('click',event=>{
 const item=event.target.closest('.rail-item[data-view],.quick-card[data-view],.secondary-action[data-view]');
 if(item?.dataset.view){transitionTopLevel(item.dataset.view)}
});
document.addEventListener('vibe:open-channels',()=>{syncNavigation('channels');markTransition(document.getElementById('chatView')||views.channels)});
document.addEventListener('vibe:open-chat',()=>{markTransition(document.getElementById('chatView'));root?.classList.add('chat-open')});
document.addEventListener('vibe:close-chat',()=>{root?.classList.remove('chat-open');markTransition(document.getElementById('emptyState'))});
window.addEventListener('resize',()=>{root?.style.setProperty('--vibe-width',`${window.innerWidth}px`)});
root?.style.setProperty('--vibe-width',`${window.innerWidth}px`);
window.VibeWhatsAppPolish={markTransition,syncNavigation};
