const menuButton = document.getElementById('menuBtn');

function openSettingsDirectly(event){
  event?.preventDefault();
  event?.stopImmediatePropagation();
  if(window.VibeSettings?.openSettings){
    window.VibeSettings.openSettings();
    return;
  }
  document.dispatchEvent(new CustomEvent('vibe:open-settings'));
}

if(menuButton)menuButton.addEventListener('click',openSettingsDirectly,true);
