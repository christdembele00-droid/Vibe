const $=id=>document.getElementById(id);

/*
 * Couche UI légère : les comportements métier (auth, messages, appels,
 * emoji, groupes, recherche et composer) sont gérés par app.js,
 * interaction-fix.js et vibe-groups-emoji.js.
 * Ce fichier ne redéclare donc plus leurs gestionnaires afin d'éviter
 * les doubles clics et les menus concurrents.
 */
function setupAccessibleTitles(){
  const labels={
    newGroup:'Nouveau groupe',newChat:'Nouvelle discussion',theme:'Changer le thème',
    profile:'Mon profil',google:'Continuer avec Google',github:'Continuer avec GitHub',
    logout:'Se déconnecter',ai:'Assistant Gemini',audioCall:'Appel audio',
    videoCall:'Appel vidéo',chatMenu:'Plus d’options',back:'Retour',emoji:'Emoji',mic:'Message vocal'
  };
  Object.entries(labels).forEach(([id,label])=>{
    const e=$(id);
    if(e){e.setAttribute('aria-label',label);e.title=label}
  });
}
function setupGlobal(){
  window.addEventListener('online',()=>window.toast?.('Connexion rétablie.'));
  window.addEventListener('offline',()=>window.toast?.('Connexion Internet interrompue.'));
}
function init(){setupAccessibleTitles();setupGlobal()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
