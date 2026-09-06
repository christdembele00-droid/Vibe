const channelButton=document.querySelector('.rail-item[data-view="channels"]');
const chatButton=document.querySelector('.rail-item[data-view="chats"]');
const channelPanel=document.getElementById('channelsView');
const chatView=document.getElementById('chatView');

function showChannelPane(){
  channelPanel?.classList.add('hidden');
  chatView?.classList.add('hidden');
  document.getElementById('emptyState')?.classList.remove('hidden');
  window.VibeChannelChat?.openView?.();
}

channelButton?.addEventListener('click',showChannelPane);

document.getElementById('backBtn')?.addEventListener('click',()=>{
  if(channelButton?.classList.contains('active')){
    window.VibeChannelChat?.closeView?.();
    chatButton?.click();
  }
},true);
