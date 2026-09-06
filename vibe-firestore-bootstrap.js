import{getApps}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import{getAuth,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import{getFirestore,collection,getDocs,writeBatch,doc,serverTimestamp}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app=getApps()[0];
const auth=getAuth(app),db=getFirestore(app);
const fallback='./icons/icon.svg';
const CHANNELS=[
{id:'actualites',name:'VIBE — Actualités',subtitle:'Informations récentes vérifiées par VIBE AI',icon:'fa-newspaper'},
{id:'cote-ivoire',name:'VIBE — Côte d’Ivoire',subtitle:'Actualités ivoiriennes vérifiées par VIBE AI',icon:'fa-flag'},
{id:'monde',name:'VIBE — Monde',subtitle:'Actualités internationales vérifiées par VIBE AI',icon:'fa-globe'},
{id:'sports',name:'VIBE — Sports',subtitle:'Sport et compétitions vérifiés par VIBE AI',icon:'fa-futbol'},
{id:'technologie',name:'VIBE — Technologie',subtitle:'IA, informatique et innovations',icon:'fa-microchip'},
{id:'gaming',name:'VIBE — Gaming',subtitle:'Jeux vidéo et e-sport',icon:'fa-gamepad'},
{id:'musique',name:'VIBE — Musique',subtitle:'Musique et nouveautés',icon:'fa-music'},
{id:'divertissement',name:'VIBE — Divertissement',subtitle:'Cinéma, séries et culture',icon:'fa-film'},
{id:'science',name:'VIBE — Science',subtitle:'Sciences, découvertes et espace',icon:'fa-flask'},
{id:'vibe-ai',name:'VIBE — AI',subtitle:'Assistant intelligent et recherche web en temps réel',icon:'fa-wand-magic-sparkles'}
];
let running=false;

async function bootstrap(user){
  if(!user||running)return;
  running=true;
  try{
    const channelSnap=await getDocs(collection(db,'channels'));
    const existingChannels=new Set(channelSnap.docs.map(d=>d.id));
    const messageSnaps=await Promise.all(CHANNELS.map(ch=>getDocs(collection(db,'channels',ch.id,'messages'))));
    const batch=writeBatch(db);
    let writes=0;

    for(const ch of CHANNELS){
      if(existingChannels.has(ch.id))continue;
      batch.set(doc(db,'channels',ch.id),{
        name:ch.name,
        subtitle:ch.subtitle,
        icon:ch.icon,
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      });
      writes++;
    }

    CHANNELS.forEach((ch,index)=>{
      if(messageSnaps[index].empty){
        batch.set(doc(db,'channels',ch.id,'messages','_init'),{
          senderId:user.uid,
          senderName:'VIBE',
          senderAvatar:fallback,
          text:'Canal initialisé',
          createdAt:serverTimestamp()
        });
        writes++;
      }
    });

    if(writes)await batch.commit();
  }catch(error){
    console.warn('[VIBE] Firestore bootstrap:',error?.code||error?.message||error);
  }finally{
    running=false;
  }
}

onAuthStateChanged(auth,user=>{if(user)bootstrap(user).catch(()=>{})});
