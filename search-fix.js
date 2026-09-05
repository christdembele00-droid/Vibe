const search=document.getElementById('search');
const contacts=document.getElementById('contacts');
const clear=document.getElementById('clearSearch');

function vibeSearch(){
  if(!search||!contacts)return;
  const term=search.value.trim().toLocaleLowerCase('fr-FR');
  if(clear)clear.hidden=!term;
  const items=[...contacts.querySelectorAll('.contact')];
  let found=0;
  items.forEach(item=>{
    const name=item.querySelector('b')?.textContent?.replace(/^👥\s*/,'')||'';
    const info=item.querySelector('small')?.textContent||'';
    const match=!term||`${name} ${info}`.toLocaleLowerCase('fr-FR').includes(term);
    item.style.display=match?'':'none';
    if(match)found++;
  });
  let empty=contacts.querySelector('#vibeNoSearch');
  if(term&&found===0){
    if(!empty){empty=document.createElement('div');empty.id='vibeNoSearch';empty.className='empty';contacts.appendChild(empty)}
    empty.innerHTML='<i class="fa-solid fa-magnifying-glass"></i><b>Aucun utilisateur trouvé</b><small>Essaie un autre nom.</small>';
    empty.style.display='grid';
  }else if(empty)empty.style.display='none';
}

if(search){
  search.addEventListener('input',vibeSearch,true);
  search.addEventListener('keyup',vibeSearch,true);
  search.addEventListener('change',vibeSearch,true);
  search.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      search.value='';
      vibeSearch();
      search.blur();
    }
  },true);
}
if(clear)clear.addEventListener('click',()=>{if(search){search.value='';vibeSearch();search.focus()}});
if(contacts)new MutationObserver(vibeSearch).observe(contacts,{childList:true,subtree:true});
window.VIBE_SEARCH=vibeSearch;
