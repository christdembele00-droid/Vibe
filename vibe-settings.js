import { auth, rtdb, databaseRef, onValue, set, databaseServerTimestamp } from './firebase-client.js';

const DEFAULTS = {
  notifications: true, sounds: true, vibrations: true, callNotifications: true, previews: true,
  showOnline: true, showLastSeen: true, allowGroupAdds: true, allowMessages: true, allowCalls: true,
  chatTheme: 'default', fontSize: 'medium', viewOnce: false, readReceipts: true, typing: true,
  autoImages: true, autoVideos: true, autoAudio: true, mediaQuality: 'standard',
  appearance: 'dark', uiScale: '100', accent: '#ff7a18', animations: true,
  language: 'fr', mobileData: true, dataSaver: false
};
let settings = {...DEFAULTS};
const key = () => `vibe-settings-${auth?.currentUser?.uid || 'guest'}`;
const saveLocal = () => localStorage.setItem(key(), JSON.stringify(settings));
const loadLocal = () => { try { settings = {...DEFAULTS, ...JSON.parse(localStorage.getItem(key()) || '{}')}; } catch { settings = {...DEFAULTS}; } applySettings(); };
const setSetting = async (name, value) => { settings[name] = value; saveLocal(); applySettings(); if (auth?.currentUser && rtdb) await set(databaseRef(rtdb, `users/${auth.currentUser.uid}/settings/${name}`), value).catch(()=>{}); };
function applySettings(){
  document.documentElement.dataset.theme=settings.appearance; document.documentElement.dataset.fontSize=settings.fontSize; document.documentElement.dataset.uiScale=settings.uiScale; document.documentElement.style.setProperty('--vibe-accent', settings.accent);
  document.documentElement.classList.toggle('vibe-no-animations', !settings.animations);
}
function row(title, name, type='toggle', options=[]){
  const value=settings[name];
  if(type==='select') return `<label class="vibe-setting-row"><span><strong>${title}</strong></span><select data-setting="${name}">${options.map(o=>`<option value="${o[0]}" ${value===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></label>`;
  return `<label class="vibe-setting-row"><span><strong>${title}</strong></span><input type="checkbox" data-setting="${name}" ${value?'checked':''}><i class="vibe-switch"></i></label>`;
}
function panel(){
  if(document.getElementById('vibeSettings')) return document.getElementById('vibeSettings');
  const el=document.createElement('section'); el.id='vibeSettings'; el.className='vibe-settings hidden'; el.innerHTML=`<div class="vibe-settings-card"><header><button id="vibeSettingsClose" class="glass-btn">×</button><h2>Paramètres Vibe</h2><p>Personnalisez votre expérience.</p></header><div class="vibe-settings-content">
  <h3>⚙️ Compte</h3>${row('Statut en ligne','showOnline')}${row('Dernière connexion','showLastSeen')}
  <h3>🔔 Notifications</h3>${row('Nouveaux messages','notifications')}${row('Sons','sounds')}${row('Vibrations','vibrations')}${row('Notifications d’appels','callNotifications')}${row('Prévisualisation','previews')}
  <h3>🔒 Confidentialité</h3>${row('Autoriser les ajouts aux discussions','allowGroupAdds')}${row('Autoriser les messages','allowMessages')}${row('Autoriser les appels','allowCalls')}
  <h3>💬 Discussions</h3>${row('Messages à vue unique par défaut','viewOnce')}${row('Confirmation de lecture','readReceipts')}${row('Indicateur « écrit… »','typing')}${row('Taille du texte','fontSize','select',[['small','Petite'],['medium','Moyenne'],['large','Grande']])}${row('Thème de discussion','chatTheme','select',[['default','Vibe'],['light','Clair'],['dark','Sombre']])}
  <h3>🖼️ Médias et fichiers</h3>${row('Téléchargement automatique des images','autoImages')}${row('Téléchargement vidéo','autoVideos')}${row('Téléchargement audio','autoAudio')}${row('Qualité des médias','mediaQuality','select',[['low','Économie'],['standard','Standard'],['high','Haute']])}${row('Économie de données','dataSaver')}
  <h3>🌙 Apparence</h3>${row('Mode automatique','appearance','select',[['dark','Sombre'],['light','Clair'],['system','Automatique']])}${row('Taille de l’interface','uiScale','select',[['90','90 %'],['100','100 %'],['110','110 %'],['120','120 %']])}${row('Couleur d’accent Vibe','accent','select',[['#ff7a18','Orange'],['#5b8cff','Bleu'],['#9b59ff','Violet'],['#20c997','Vert']])}${row('Animations','animations')}
  <h3>📞 Appels</h3>${row('Appels entrants','callNotifications')}${row('Autoriser les appels','allowCalls')}
  <h3>🛡️ Sécurité</h3><button class="vibe-action" data-action="sessions">Sessions actives</button><button class="vibe-action" data-action="blocked">Utilisateurs bloqués</button><button class="vibe-action" data-action="logout">Déconnexion</button>
  <h3>📱 Application</h3>${row('Données mobiles','mobileData')}${row('Économie de données','dataSaver')}<button class="vibe-action" data-action="clear">Effacer les données locales</button><p class="vibe-version">Vibe Messenger · version 1.0.0</p><p class="vibe-legal">Conditions d'utilisation · Politique de confidentialité</p>
  </div></div>`;
  document.body.appendChild(el);
  el.addEventListener('change',e=>{const input=e.target.closest('[data-setting]');if(!input)return;setSetting(input.dataset.setting,input.type==='checkbox'?input.checked:input.value);});
  el.querySelector('#vibeSettingsClose').onclick=()=>el.classList.add('hidden');
  el.addEventListener('click',async e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;if(action==='logout'){try{await (await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js')).signOut(auth)}catch{}}if(action==='clear'){localStorage.clear();settings={...DEFAULTS};applySettings();location.reload()}if(action==='sessions')alert('La gestion des sessions dépend des appareils connectés à votre compte.');if(action==='blocked')alert('Aucun utilisateur bloqué pour le moment.');});
  return el;
}
function openSettings(){loadLocal();panel().classList.remove('hidden');}
window.VibeSettings={openSettings,get:()=>({...settings}),set:setSetting};
document.addEventListener('click',e=>{if(e.target.closest('#menuBtn')){e.preventDefault();e.stopImmediatePropagation();openSettings();}},true);
loadLocal();
if(auth?.currentUser&&rtdb) onValue(databaseRef(rtdb,`users/${auth.currentUser.uid}/settings`),s=>{settings={...DEFAULTS,...(s.val()||{})};saveLocal();applySettings();});
