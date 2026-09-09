// Vibe — stabilise la vue mobile lorsque le clavier Android/iOS s'ouvre.
// Objectif : seul le compositeur reste au-dessus du clavier ; la page ne doit pas
// être déplacée ou agrandie de façon imprévisible.

function syncMobileViewport(){
  if(window.matchMedia('(min-width: 701px)').matches) return;

  const viewport=window.visualViewport;
  const height=Math.max(320,Math.round(viewport?.height || window.innerHeight));
  document.documentElement.style.setProperty('--vibe-mobile-height',`${height}px`);

  const shell=document.getElementById('app-shell');
  if(shell){
    shell.style.height=`${height}px`;
    shell.style.minHeight=`${height}px`;
  }

  const panel=document.querySelector('.main-chat-panel');
  if(panel) panel.style.height=`${height}px`;

  const chatView=document.querySelector('.chat-view');
  if(chatView) chatView.style.height=`${height}px`;
}

function initMobileKeyboardLayout(){
  syncMobileViewport();

  window.visualViewport?.addEventListener('resize',syncMobileViewport);
  window.visualViewport?.addEventListener('scroll',syncMobileViewport);
  window.addEventListener('resize',syncMobileViewport,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(syncMobileViewport,120),{passive:true});

  document.addEventListener('focusin',event=>{
    if(!event.target?.matches?.('.composer input, .composer textarea')) return;
    requestAnimationFrame(syncMobileViewport);
    setTimeout(syncMobileViewport,80);
    setTimeout(syncMobileViewport,250);
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initMobileKeyboardLayout,{once:true});
}else{
  initMobileKeyboardLayout();
}
