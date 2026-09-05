const VIBE_GROUP_AVATAR='https://i.pravatar.cc/150?img=12';
const VIBE_EMOJIS={
  '😀 Smileys':['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😎','🤩','🥳','🤔','🫡','🤗','🤭','🤫','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','🤓','😕','🫤','🙃','😲','😢','😭','😤','😡','🤬','😱','😨','😰','😳','🤯','😬','😵','🥶','🥵','🤢','🤮','🤧','😷','🤒','🤕'],
  '❤️ Favoris':['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','💟','❣️','💯','✨','🔥','⭐','🌟','💫','🎉','🎊'],
  '👍 Gestes':['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👋','👏','🙌','🫶','🙏','💪','🤝','👊','✊','🤲','👐','💅','👀','🫡','☝️','👇','👉','👈','✍️'],
  '🐶 Animaux':['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦄','🐝','🦋','🐢','🐍','🐙','🦀','🐠','🐬','🦈'],
  '🍔 Nourriture':['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🥝','🍕','🍔','🍟','🌭','🌮','🌯','🍿','🍣','🍜','🍚','🍩','🍪','🎂','🍰','🍫','🍭','☕','🧃'],
  '⚽ Activités':['⚽','🏀','🏈','⚾','🎾','🏐','🏆','🎮','🎯','🎲','🎸','🎵','🎧','🎨','📷','🎬','✈️','🚗','🚀','💡','📚','💻','📱']
};
const VIBE_RECENT_KEY='vibe_recent_emojis';
const vibeRecent=()=>{try{return JSON.parse(localStorage.getItem(VIBE_RECENT_KEY)||'[]')}catch{return[]}};
const saveRecent=e=>{const a=[e,...vibeRecent().filter(x=>x!==e)].slice(0,24);localStorage.setItem(VIBE_RECENT_KEY,JSON.stringify(a))};
function vibeClosePopups(except){document.querySelectorAll('.vibe-emoji-picker,.vibe-chat-menu').forEach(x=>{if(x!==except)x.remove()})}
function vibeEmojiPicker(){
 const btn=document.getElementById('emoji'),composer=document.getElementById('composer'); if(!btn||!composer)return;
 btn.onclick=e=>{e.stopPropagation();let old=document.querySelector('.vibe-emoji-picker');if(old){old.remove();return}vibeClosePopups();
  const p=document.createElement('section');p.className='vibe-emoji-picker vibe-emoji-pro';p.setAttribute('role','dialog');p.setAttribute('aria-label','Sélecteur d’emojis');
  p.innerHTML='<div class="vibe-emoji-head"><strong>Emojis</strong><button type="button" class="vibe-emoji-close" aria-label="Fermer">×</button></div><input class="vibe-emoji-search" placeholder="Rechercher un emoji…" autocomplete="off"><div class="vibe-emoji-tabs"></div><div class="vibe-emoji-grid"></div>';
  composer.parentElement.style.position='relative';composer.parentElement.appendChild(p);
  const tabs=p.querySelector('.vibe-emoji-tabs'),grid=p.querySelector('.vibe-emoji-grid'),search=p.querySelector('.vibe-emoji-search');let active=Object.keys(VIBE_EMOJIS)[0];
  const renderTabs=()=>{tabs.innerHTML='';Object.keys(VIBE_EMOJIS).forEach(k=>{const b=document.createElement('button');b.type='button';b.textContent=k.split(' ')[0];b.title=k;b.className=k===active?'active':'';b.onclick=()=>{active=k;search.value='';render()};tabs.appendChild(b)});const r=document.createElement('button');r.type='button';r.textContent='🕘';r.title='Récents';r.onclick=()=>{active='__recent';search.value='';render()};tabs.appendChild(r)};
  const render=()=>{grid.innerHTML='';const term=search.value.trim().toLowerCase();let list=active==='__recent'?vibeRecent():(VIBE_EMOJIS[active]||[]);if(term){list=Object.values(VIBE_EMOJIS).flat().filter((e,i,a)=>a.indexOf(e)===i)}if(!list.length){grid.innerHTML='<span class="vibe-emoji-empty">Aucun emoji récent</span>';return}list.forEach(em=>{const b=document.createElement('button');b.type='button';b.textContent=em;b.title=em;b.onclick=()=>{$('message').value+=em;$('message').focus();saveRecent(em)};grid.appendChild(b)})};
  search.oninput=render;p.querySelector('.vibe-emoji-close').onclick=()=>p.remove();renderTabs();render();setTimeout(()=>search.focus(),0);
 };
}
function vibeGroupWizard(){
 const btn=document.getElementById('newGroup');const quick=document.getElementById('newGroupQuick');if(!btn&&!quick)return;
 const open=()=>{if(!window.uid&&!document.getElementById('contacts'))return;let old=document.querySelector('.vibe-group-modal');if(old)old.remove();
  const users=Array.isArray(window.vibeAllUsers)?window.vibeAllUsers.filter(u=>u.uid!==window.vibeUid):[];
  if(!users.length){window.vibeToast?.('Aucun contact disponible pour créer le groupe.');return}
  const wrap=document.createElement('div');wrap.className='vibe-group-modal';wrap.innerHTML='<div class="vibe-group-card"><div class="vibe-group-head"><button class="vibe-group-back" type="button">‹</button><div><strong>Nouveau groupe</strong><small>Choisis les participants</small></div><button class="vibe-group-x" type="button">×</button></div><div class="vibe-group-photo"><div class="vibe-group-photo-preview">👥</div><label>📷 Ajouter une photo<input class="vibe-group-photo-input" type="file" accept="image/*" hidden></label></div><input class="vibe-group-name" maxlength="80" placeholder="Nom du groupe"><div class="vibe-group-search">⌕ <input placeholder="Rechercher un contact…"></div><div class="vibe-group-selected"></div><div class="vibe-group-list"></div><div class="vibe-group-footer"><span class="vibe-group-count">0 sélectionné</span><button class="vibe-group-create" disabled>Créer le groupe</button></div></div>';
  document.body.appendChild(wrap);let selected=new Set(),photoFile=null;const list=wrap.querySelector('.vibe-group-list'),sel=wrap.querySelector('.vibe-group-selected'),name=wrap.querySelector('.vibe-group-name'),create=wrap.querySelector('.vibe-group-create'),count=wrap.querySelector('.vibe-group-count'),search=wrap.querySelector('.vibe-group-search input');
  const render=()=>{list.innerHTML='';const term=search.value.toLowerCase();users.filter(u=>(u.name||'').toLowerCase().includes(term)).forEach(u=>{const row=document.createElement('button');row.type='button';row.className='vibe-contact-row';row.innerHTML=`<img src="${u.avatar||VIBE_GROUP_AVATAR}" alt=""><span><b>${String(u.name||'Utilisateur').replace(/[<>]/g,'')}</b><small>${u.email||'Contact VIBE'}</small></span><i>${selected.has(u.uid)?'✓':''}</i>`;row.onclick=()=>{selected.has(u.uid)?selected.delete(u.uid):selected.add(u.uid);render()};list.appendChild(row)});sel.innerHTML='';[...selected].forEach(id=>{const u=users.find(x=>x.uid===id);if(!u)return;const chip=document.createElement('button');chip.type='button';chip.textContent='× '+(u.name||'Contact');chip.onclick=()=>{selected.delete(id);render()};sel.appendChild(chip)});count.textContent=`${selected.size} sélectionné${selected.size>1?'s':''}`;create.disabled=selected.size<1||!name.value.trim()};
  name.oninput=render;search.oninput=render;wrap.querySelector('.vibe-group-x').onclick=()=>wrap.remove();wrap.querySelector('.vibe-group-back').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};wrap.querySelector('.vibe-group-photo-input').onchange=e=>{photoFile=e.target.files?.[0]||null;if(photoFile)wrap.querySelector('.vibe-group-photo-preview').textContent='📸'};
  create.onclick=async()=>{if(create.disabled)return;try{create.disabled=true;const participants=[window.vibeUid,...selected];let avatar=VIBE_GROUP_AVATAR;if(photoFile&&window.vibeUploadGroupPhoto){avatar=await window.vibeUploadGroupPhoto(photoFile)}await window.vibeCreateGroup?.({name:name.value.trim(),participants,avatar});wrap.remove()}catch(e){create.disabled=false;window.vibeToast?.('Création impossible : '+e.message)}};render();};
 btn&&(btn.onclick=open);quick&&(quick.onclick=open);
}
function initVibeGroupEmoji(){vibeEmojiPicker();vibeGroupWizard();document.addEventListener('click',e=>{if(!e.target.closest('.vibe-emoji-picker')&&!e.target.closest('#emoji')&&!e.target.closest('.vibe-group-card')&&!e.target.closest('#newGroup')&&!e.target.closest('#newGroupQuick'))vibeClosePopups()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initVibeGroupEmoji);else initVibeGroupEmoji();
