import { auth, db, collection, doc, addDoc, setDoc, getDocs, query, where, serverTimestamp } from './firebase-client.js';

const toast = message => { const el=document.getElementById('toast'); if(!el)return; el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2800); };
const userId = () => auth?.currentUser?.uid || null;
const createDirectChat = async () => {
  const uid=userId();
  if(!uid)return toast('Connectez-vous pour créer une discussion.');
  const email=String(prompt('E-mail de la personne à contacter :')||'').trim().toLowerCase();
  if(!email)return;
  try{
    const snap=await getDocs(query(collection(db,'userSearch'),where('email','==',email)));
    if(snap.empty)return toast('Utilisateur introuvable.');
    const target=snap.docs[0].data();
    if(!target.uid || target.uid===uid)return toast('Choisissez un autre utilisateur.');
    const existing=await getDocs(query(collection(db,'conversations'),where('participantIds','array-contains',uid)));
    let found=null;
    existing.forEach(item=>{const data=item.data();if(!found && data.type==='private' && Array.isArray(data.participantIds) && data.participantIds.length===2 && data.participantIds.includes(target.uid))found={id:item.id,...data};});
    if(found){toast('Cette discussion existe déjà.');document.dispatchEvent(new CustomEvent('vibe:open-chat',{detail:{chat:found}}));return found;}
    const name=target.displayName || target.email || 'Discussion';
    const ref=await addDoc(collection(db,'conversations'),{name,ownerId:uid,participantIds:[uid,target.uid],createdAt:serverTimestamp(),updatedAt:serverTimestamp(),type:'private'});
    await setDoc(doc(db,'users',uid,'conversations',ref.id),{chatId:ref.id,updatedAt:serverTimestamp()});
    await setDoc(doc(db,'users',target.uid,'conversations',ref.id),{chatId:ref.id,updatedAt:serverTimestamp()});
    const chat={id:ref.id,name,ownerId:uid,participantIds:[uid,target.uid],type:'private'};
    toast('Discussion créée pour les deux utilisateurs.');
    document.dispatchEvent(new CustomEvent('vibe:open-chat',{detail:{chat}}));
    return chat;
  }catch(error){console.error('Discussion privée:',error);toast(`Création impossible : ${error.message}`);}
};

document.addEventListener('vibe:open-chat',event=>{
  const chat=event.detail?.chat;
  if(!chat)return;
  const item=document.querySelector(`[data-chat-id="${CSS.escape(chat.id)}"]`);
  if(item)item.click();
});
window.VibeDirectChat={createDirectChat};
