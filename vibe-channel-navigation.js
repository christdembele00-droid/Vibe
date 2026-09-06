const channelButton=document.querySelector('.rail-item[data-view="channels"]');
const chatButton=document.querySelector('.rail-item[data-view="chats"]');
const channelPanel=document.getElementById('channelsView');
const chatView=document.getElementById('chatView');
const emptyState=document.getElementById('emptyState');

function showChannelPane(){
  channelPanel?.classList.add('hidden');
  chatView?.classList.add('hidden');
  emptyState?.classList.remove('hidden');
  window.VibeWhatsAppPolish?.syncNavigation?.('channels');
  window.VibeWhatsAppPolish?.markTransition?.(emptyState);
  window.VibeChannelChat?.openView?.();
}

channelButton?.addEventListener('click',showChannelPane);

document.getElementById('backBtn')?.addEventListener('click',()=>{
  if(channelButton?.classList.contains('active')){
    window.VibeChannelChat?.closeView?.();
    window.VibeWhatsAppPolish?.syncNavigation?.('chats');
    window.VibeWhatsAppPolish?.markTransition?.(emptyState);
    chatButton?.click();
  }
},true);
