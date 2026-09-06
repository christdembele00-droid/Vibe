import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app=getApps()[0];
if(!app) throw new Error('Firebase doit être initialisé avant vibe-seed.js');
const auth=getAuth(app),db=getFirestore(app);
const VERSION=2;

// Le seed ne crée plus de faux messages dans les chaînes ni de statuts.
// Les chaînes vides peuvent ainsi être alimentées en temps réel par VIBE AI.
async function seed(uid){
  await setDoc(doc(db,'users',uid),{demoSeedVersion:VERSION,updatedAt:serverTimestamp()},{merge:true});
  console.info('[VIBE] initialisation du compte terminée pour',uid);
}

onAuthStateChanged(auth,async user=>{
  if(!user)return;
  try{
    const { getDoc }=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const marker=await getDoc(doc(db,'users',user.uid));
    if(marker.data()?.demoSeedVersion===VERSION)return;
    await seed(user.uid);
  }catch(error){
    console.warn('[VIBE] initialisation des données ignorée:',error?.message||error);
  }
});
