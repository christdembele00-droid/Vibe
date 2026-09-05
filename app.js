import{initializeApp}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import{getAuth,GoogleAuthProvider,GithubAuthProvider,signInWithPopup,onAuthStateChanged,signOut}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import{getFirestore,collection,query,orderBy,onSnapshot,addDoc,serverTimestamp,doc,setDoc,getDocs}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import{firebaseConfig}from'./firebase-config.js';

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
let uid=null,unsubscribe=null,usersUnsubscribe=null,currentUser=null,currentRoom=null;
const $=id=>document.getElementById(id);
const toast=t=>{$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2500)};

$('theme').onclick=()=>document.body.classList.toggle('dark');
$('google').onclick=()=>login(new GoogleAuthProvider());
$('github').onclick=()=>login(new GithubAuthProvider());
$('logout').onclick=()=>signOut(auth);
async function login(provider){try{await signInWithPopup(auth,provider)}catch(e){toast('Connexion impossible : '+e.message)}}

async function saveUser(user){
  await setDoc(doc(db,'users',user.uid),{
    uid:user.uid,
    name:user.displayName||user.email?.split('@')[0]||'Utilisateur',
    email:user.email||'',
    avatar:user.photoURL||'https://i.pravatar.cc/100?img=12',
    updatedAt:serverTimestamp()
  },{merge:true});
}

function renderUser(c){
  const div=document.createElement('div');
  div.className='contact';
  div.dataset.id=c.uid;
  div.innerHTML=`<img src="${c.avatar||'https://i.pravatar.cc/60?img=12'}" alt=""><span><b>${escapeHtml(c.name||'Utilisateur')}</b><small>${escapeHtml(c.email||'Disponible')}</small></span>`;
  div.onclick=()=>openChat(c.uid,c.name||'Utilisateur',c.avatar);
  return div;
}

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[x]))}

function listenUsers(){
  if(usersUnsubscribe)usersUnsubscribe();
  const q=query(collection(db,'users'));
  usersUnsubscribe=onSnapshot(q,snapshot=>{
    const list=[];
    snapshot.forEach(d=>{const u=d.data();if(u.uid!==uid)list.push(u)});
    list.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const box=$('contacts');box.innerHTML='';
    list.forEach(u=>box.appendChild(renderUser(u)));
    if(!list.length)box.innerHTML='<div class="empty">Aucun autre utilisateur pour le moment.<br>Demande à un autre utilisateur de créer son compte.</div>';
  },e=>toast('Impossible de charger les utilisateurs : '+e.message));
}

async function openChat(otherId,name,avatar){
  if(!uid||otherId===uid)return;
  currentUser={uid:otherId,name,avatar};
  $('name').textContent=name;
  $('status').textContent='Conversation privée';
  $('avatar').src=avatar||'https://i.pravatar.cc/80?img=12';
  $('composer').hidden=false;
  currentRoom=[uid,otherId].sort().join('_');
  if(unsubscribe)unsubscribe();
  const q=query(collection(db,'rooms',currentRoom,'messages'),orderBy('createdAt','asc'));
  unsubscribe=onSnapshot(q,s=>{
    const box=$('messages');box.innerHTML='';
    s.forEach(d=>{
      const m=d.data(),el=document.createElement('div');
      el.className='msg '+(m.sender===uid?'sent':'received');
      const text=document.createElement('span');text.textContent=m.text||'';el.appendChild(text);
      const tm=document.createElement('span');tm.className='time';
      tm.textContent=m.createdAt?.toDate?.().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})||'…';
      el.appendChild(tm);box.appendChild(el);
    });
    box.scrollTop=box.scrollHeight;
  },e=>toast('Erreur de conversation : '+e.message));
}

$('composer').onsubmit=async e=>{
  e.preventDefault();
  const text=$('message').value.trim();
  if(!text||!uid||!currentRoom)return;
  try{
    await addDoc(collection(db,'rooms',currentRoom,'messages'),{sender:uid,receiver:currentUser.uid,text,createdAt:serverTimestamp()});
    $('message').value='';
  }catch(e){toast('Message non envoyé : '+e.message)}
};

$('search').oninput=e=>{
  const term=e.target.value.toLowerCase().trim();
  document.querySelectorAll('.contact').forEach(el=>{el.style.display=el.textContent.toLowerCase().includes(term)?'flex':'none'});
};

onAuthStateChanged(auth,async user=>{
  uid=user?.uid||null;
  $('auth').hidden=!!user;
  $('user').hidden=!user;
  $('logout').hidden=!user;
  if(user){
    $('meName').textContent=user.displayName||user.email||'Utilisateur';
    $('meAvatar').src=user.photoURL||'https://i.pravatar.cc/80?img=12';
    await saveUser(user);
    listenUsers();
    $('messages').innerHTML='<div class="welcome"><b>V</b><h2>VIBE</h2><p>Sélectionne un utilisateur pour commencer une conversation privée.</p></div>';
  }else{
    if(unsubscribe)unsubscribe();
    if(usersUnsubscribe)usersUnsubscribe();
    $('composer').hidden=true;
    $('messages').innerHTML='<div class="welcome"><b>V</b><h2>VIBE</h2><p>Connecte-toi pour commencer.</p></div>';
  }
});