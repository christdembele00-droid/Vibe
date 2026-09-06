import { auth, db, collection, doc, addDoc, getDoc, onSnapshot, serverTimestamp, storage, ref, uploadBytes, getDownloadURL } from './firebase-client.js';

const $ = id => document.getElementById(id);
let modal = null;
let recorder = null;
let chunks = [];
const reactionStops = new Map();
const mediaLoaded = new Set();
const uid = () => auth?.currentUser?.uid || null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
const toast = text => { const e=$('toast'); if(!e)return; e.textContent=text; e.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>e.classList.remove('show'),2600); };

function openModal(title, body) {
  modal?.remove();
  modal=document.createElement('div');
  modal.className='vibe-extra-modal';
  modal.innerHTML=`<div class="vibe-extra-card"><header><strong>${esc(title)}</strong><button type="button" aria-label="Fermer">×</button></header><div class="vibe-extra-body">${body}</div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('header button').onclick=()=>modal.remove();
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
}

async function uploadMedia(file, folder) {
  if(!uid()) throw Error('Connexion requise');
  if(file.size>25*1024*1024) throw Error('Fichier limité à 25 Mo');
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const r=ref(storage,`${folder}/${uid()}/${Date.now()}-${safe}`);
  await uploadBytes(r,file,{contentType:file.type||'application/octet-stream'});
  return getDownloadURL(r);
}

async function publishStatus() {
  if(!uid()) return toast('Connectez-vous pour publier.');
  const text=$('vibeStatusText')?.value.trim();
  const file=$('vibeStatusFile')?.files?.[0];
  if(!text&&!file) return toast('Ajoutez un texte ou un média.');
  try {
    let mediaUrl='',mediaType='';
    if(file){mediaUrl=await uploadMedia(file,'statuses');mediaType=file.type;}
    await addDoc(collection(db,'statuses'),{uid:uid(),text:text||'',mediaUrl,mediaType,createdAt:serverTimestamp(),expiresAt:new Date(Date.now()+86400000)});
    toast('Statut publié pour 24 h.');
    modal?.remove();
  } catch(e){toast(`Publication impossible : ${e.message}`);}
}

function statusUI() {
  openModal('Statut / Actus 24 h','<textarea id="vibeStatusText" class="vibe-extra-input" maxlength="700" placeholder="Écrire un statut…"></textarea><input id="vibeStatusFile" class="vibe-extra-input" type="file" accept="image/*,video/*"><button class="vibe-extra-primary" id="vibePublishStatus">Publier</button><div id="vibeStatusList" class="vibe-extra-list">Chargement…</div>');
  $('vibePublishStatus').onclick=publishStatus;
  onSnapshot(collection(db,'statuses'),snap=>{
    const now=Date.now();
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.expiresAt?.toMillis||x.expiresAt.toMillis()>now).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)).slice(0,30);
    const list=$('vibeStatusList'); if(!list)return;
    list.innerHTML=rows.length?rows.map(x=>`<article><strong>${esc(x.uid===uid()?'Vous':x.uid)}</strong><p>${esc(x.text)}</p>${x.mediaUrl?(x.mediaType?.startsWith('video/')?`<video controls src="${esc(x.mediaUrl)}"></video>`:`<img src="${esc(x.mediaUrl)}" alt="Statut">`):''}</article>`).join(''):'Aucun statut récent.';
  },e=>console.warn('[Vibe] statuts',e));
}

function mediaPicker(){const i=$('fileInput');if(i){i.accept='image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';i.click();}}

async function handleMedia(e){
  const file=e.target.files?.[0]; e.target.value='';
  if(!file||!uid())return;
  const cid=window.VibeApp?.currentChatId||document.querySelector('.conversation-item.active')?.dataset.chatId;
  if(!cid)return toast('Ouvrez une discussion.');
  try{
    const url=await uploadMedia(file,'messages');
    const mime=file.type||'application/octet-stream';
    await addDoc(collection(db,'conversations',cid,'messages'),{uid:uid(),text:file.name,type:'media',dataUrl:url,mediaUrl:url,mimeType:mime,fileName:file.name,fileSize:file.size,createdAt:serverTimestamp(),viewOnce:false});
    toast('Média envoyé.');
  }catch(err){toast(`Envoi impossible : ${err.message}`);}
}

async function voice(){
  if(!uid())return toast('Connectez-vous pour envoyer un vocal.');
  const cid=window.VibeApp?.currentChatId||document.querySelector('.conversation-item.active')?.dataset.chatId;
  if(!cid)return toast('Ouvrez une discussion.');
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return toast('Les messages vocaux ne sont pas pris en charge ici.');
  openModal('Message vocal','<p id="vibeVoiceState">Appuyez sur Démarrer puis Arrêter.</p><div class="vibe-extra-actions"><button class="vibe-extra-primary" id="vibeVoiceStart">Démarrer</button><button class="vibe-extra-secondary" id="vibeVoiceStop" disabled>Arrêter</button></div>');
  $('vibeVoiceStart').onclick=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true}); chunks=[]; recorder=new MediaRecorder(stream);
      recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
      recorder.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        try{
          const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
          const file=new File([blob],`vocal-${Date.now()}.webm`,{type:blob.type||'audio/webm'});
          const url=await uploadMedia(file,'voice');
          await addDoc(collection(db,'conversations',cid,'messages'),{uid:uid(),text:'🎙️ Message vocal',type:'media',dataUrl:url,mediaUrl:url,mimeType:file.type,fileName:file.name,fileSize:file.size,createdAt:serverTimestamp(),viewOnce:false});
          toast('Message vocal envoyé.'); modal?.remove();
        }catch(e){toast(`Envoi vocal impossible : ${e.message}`);}
      };
      recorder.start(); $('vibeVoiceStart').disabled=true; $('vibeVoiceStop').disabled=false; $('vibeVoiceState').textContent='Enregistrement en cours…';
    }catch(e){toast('Accès au microphone refusé ou indisponible.');}
  };
  $('vibeVoiceStop').onclick=()=>{if(recorder?.state==='recording')recorder.stop();};
}

function currentChatId(){return window.VibeApp?.currentChatId||document.querySelector('.conversation-item.active')?.dataset.chatId||null;}

function renderReactions(article, rows){
  article.querySelector('.vibe-reactions')?.remove();
  if(!rows.length)return;
  const counts=new Map(); rows.forEach(x=>counts.set(x.emoji,(counts.get(x.emoji)||0)+1));
  const bar=document.createElement('div'); bar.className='vibe-reactions';
  bar.innerHTML=[...counts.entries()].map(([emoji,count])=>`<button type="button" title="${count} réaction(s)">${esc(emoji)} <span>${count}</span></button>`).join('');
  article.appendChild(bar);
}

function enhanceMessage(article){
  const id=article.dataset.message, cid=currentChatId(); if(!id||!cid||article.dataset.vibeEnhanced==='1')return;
  article.dataset.vibeEnhanced='1';
  const stop=onSnapshot(collection(db,'conversations',cid,'messages',id,'reactions'),snap=>renderReactions(article,snap.docs.map(d=>d.data())),()=>{});
  reactionStops.set(`${cid}:${id}`,stop);
  if(mediaLoaded.has(`${cid}:${id}`))return;
  mediaLoaded.add(`${cid}:${id}`);
  getDoc(doc(db,'conversations',cid,'messages',id)).then(snap=>{
    if(!snap.exists()||!article.isConnected)return;
    const m=snap.data(), url=m.mediaUrl||m.dataUrl, mime=String(m.mimeType||'');
    if(m.type!=='media'||!url)return;
    const bubble=article.querySelector('.message-bubble'); if(!bubble)return;
    let html='';
    if(mime.startsWith('image/'))html=`<img class="message-media" src="${esc(url)}" alt="${esc(m.fileName||'Image')}" loading="lazy">`;
    else if(mime.startsWith('video/'))html=`<video class="message-media" src="${esc(url)}" controls preload="metadata"></video>`;
    else if(mime.startsWith('audio/'))html=`<audio class="message-audio" src="${esc(url)}" controls preload="metadata"></audio>`;
    else html=`<a class="message-file" href="${esc(url)}" target="_blank" rel="noopener" download="${esc(m.fileName||'fichier')}">📎 ${esc(m.fileName||'Fichier')}</a>`;
    bubble.innerHTML=html;
  }).catch(()=>{});
}

function observeMessages(){
  const box=$('messages'); if(!box)return;
  const scan=()=>box.querySelectorAll('.message').forEach(enhanceMessage);
  scan();
  new MutationObserver(scan).observe(box,{childList:true,subtree:true});
}

function bind(){
  if(document.querySelector('.vibe-extra-bar'))return;
  $('attachBtn')?.addEventListener('click',mediaPicker);
  $('fileInput')?.addEventListener('change',handleMedia);
  const bar=document.createElement('div'); bar.className='vibe-extra-bar';
  bar.innerHTML='<button type="button" data-extra="status">◉ Statuts</button><button type="button" data-extra="voice">🎙️ Vocal</button>';
  document.querySelector('.main-tabs')?.after(bar);
  bar.onclick=e=>{const a=e.target.closest('[data-extra]')?.dataset.extra;if(a==='status')statusUI();if(a==='voice')voice();};
  observeMessages();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.VibeExtras={status:statusUI,media:mediaPicker,voice};
