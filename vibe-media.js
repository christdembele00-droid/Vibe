import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getDatabase, ref, get, onValue, remove } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';
const app=getApps()[0];if(!app)throw new Error('Firebase doit être initialisé avant vibe-media.js');
const auth=getAuth(app),db=getDatabase(app,'https://vibe-749e5-default-rtdb.firebaseio.com');
let user=null,stop=null,lastChat=null,mediaRaw={};
const $=s=>document.querySelector(s);
function chatId(){return document.querySelector('.conversation.active')?.dataset.chat||null}
function mediaNode(m){if(!m?.dataUrl)return null;let el;if(m.mimeType?.startsWith('image/')){el=document.createElement('img');el.src=m.dataUrl;el.alt=m.fileName||'Image';el.loading='lazy';el.style.maxWidth='100%';el.style.borderRadius='10px'}else if(m.mimeType?.startsWith('video/')){el=document.createElement('video');el.src=m.dataUrl;el.controls=true;el.preload='metadata';el.style.maxWidth='100%'}else if(m.mimeType?.startsWith('audio/')){el=document.createElement('audio');el.src=m.dataUrl;el.controls=true}else if(m.mimeType==='application/pdf'){el=document.createElement('a');el.href=m.dataUrl;el.target='_blank';el.rel='noopener';el.textContent=`📄 ${m.fileName||'Document PDF'}`}return el}
function renderMedia(){document.querySelectorAll('#messages [data-message]').forEach(node=>{const m=mediaRaw[node.dataset.message];if(!m?.dataUrl||node.querySelector('[data-vibe-media]'))return;const media=mediaNode(m);if(!media)return;media.dataset.vibeMedia='1';const time=node.querySelector('.message-time')?.textContent||'';node.replaceChildren(media);const timeEl=document.createElement('span');timeEl.className='message-time';timeEl.textContent=time;node.appendChild(timeEl)})}
function watch(){const id=chatId();if(id===lastChat)return;if(stop)stop();stop=null;lastChat=id;mediaRaw={};if(!id||id.startsWith('demo-'))return;stop=onValue(ref(db,`messages/${id}`),s=>{mediaRaw=s.val()||{};renderMedia()})}
async function cleanupExpired(){if(!user)return;const all=await get(ref(db,'stories'));const now=Date.now(),raw=all.val()||{},jobs=[];for(const [uid,stories] of Object.entries(raw))for(const [id,story] of Object.entries(stories||{}))if(Number(story?.expiresAt||0)<=now)jobs.push(remove(ref(db,`stories/${uid}/${id}`)).catch(()=>{}));await Promise.all(jobs)}
onAuthStateChanged(auth,async u=>{user=u;if(u)await cleanupExpired().catch(()=>{});watch()});
const observer=new MutationObserver(()=>watch());observer.observe($('#conversationList')||document.body,{childList:true,subtree:true});
setInterval(()=>{if(user)cleanupExpired().catch(()=>{})},60000);
