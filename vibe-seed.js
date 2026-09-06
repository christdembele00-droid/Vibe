import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app=getApps()[0];
if(!app) throw new Error('Firebase doit être initialisé avant vibe-seed.js');
const auth=getAuth(app),db=getFirestore(app);
const VERSION=1;
const CHANNELS=[
  ['actualites','Bienvenue sur VIBE','Le fil Actualités est prêt. VIBE peut y présenter les informations récentes et leurs sources.'],
  ['cote-ivoire','Bienvenue sur VIBE Côte d’Ivoire','Espace consacré aux actualités ivoiriennes.'],
  ['monde','Bienvenue sur VIBE Monde','Espace consacré aux informations internationales.'],
  ['sports','Bienvenue sur VIBE Sports','Espace consacré au sport et aux compétitions.'],
  ['technologie','Bienvenue sur VIBE Technologie','IA, informatique et innovations : bienvenue dans le fil Technologie.'],
  ['gaming','Bienvenue sur VIBE Gaming','Espace consacré aux jeux vidéo et à l’e-sport.'],
  ['musique','Bienvenue sur VIBE Musique','Espace consacré à la musique et aux nouveautés.'],
  ['divertissement','Bienvenue sur VIBE Divertissement','Espace consacré au cinéma, aux séries et à la culture.'],
  ['science','Bienvenue sur VIBE Science','Espace consacré aux sciences, découvertes et à l’espace.'],
  ['vibe-ai','VIBE AI est prête','Pose une question à VIBE AI pour obtenir une réponse et, lorsque disponible, des sources web.']
];

async function seed(uid){
  const marker=doc(db,'users',uid);
  const first=await setDoc(marker,{demoSeedVersion:VERSION,updatedAt:serverTimestamp()},{merge:true});

  const user=auth.currentUser;
  const name=(user?.displayName||user?.email?.split('@')[0]||'Utilisateur').slice(0,120);
  const avatar=String(user?.photoURL||'./icons/icon.svg').slice(0,1000);

  const day=new Date().toISOString().slice(0,10).replace(/-/g,'');
  await Promise.all(CHANNELS.map(async([id,title,text],i)=>{
    const messageId=`seed-${VERSION}-${day}-${i}`;
    await setDoc(doc(db,'channels',id,'messages',messageId),{
      senderId:uid,senderName:name,senderAvatar:avatar,
      text:`${title} — ${text}`.slice(0,4000),createdAt:serverTimestamp()
    },{merge:true});
  }));

  const storyId=`seed-${VERSION}-${day}`;
  await setDoc(doc(db,'stories',storyId),{
    uid,text:'Bienvenue sur VIBE 👋 Ton espace de messagerie est maintenant initialisé.',
    createdAt:serverTimestamp(),expiresAt:new Date(Date.now()+24*60*60*1000)
  },{merge:true});

  console.info('[VIBE] données initiales créées pour',uid);
}

onAuthStateChanged(auth,async user=>{
  if(!user)return;
  try{
    const snap=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const { getDoc }=snap;
    const marker=await getDoc(doc(db,'users',user.uid));
    if(marker.data()?.demoSeedVersion===VERSION)return;
    await seed(user.uid);
  }catch(error){
    console.warn('[VIBE] initialisation des données ignorée:',error?.message||error);
  }
});
