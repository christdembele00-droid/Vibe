import{getApps,getApp}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import{getAuth,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import{getFirestore,collection,query,where,onSnapshot,updateDoc,doc}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const app=getApps().length?getApp():null;
const auth=app?getAuth(app):null;
const db=app?getFirestore(app):null;
const CALL_TTL=45000;
const timers=new Map();

const createdMillis=c=>{
  const v=c?.createdAt;
  if(!v)return 0;
  if(typeof v.toMillis==='function')return v.toMillis();
  if(typeof v.seconds==='number')return v.seconds*1000;
  return 0;
};

const expire=(id)=>updateDoc(doc(db,'calls',id),{status:'ended'}).catch(()=>{});

function schedule(id,data){
  const created=createdMillis(data);
  if(!created)return;
  const remaining=CALL_TTL-(Date.now()-created);
  if(remaining<=0){expire(id);return;}
  clearTimeout(timers.get(id));
  timers.set(id,setTimeout(()=>{
    timers.delete(id);
    expire(id);
  },remaining));
}

if(auth&&db)onAuthStateChanged(auth,user=>{
  timers.forEach(clearTimeout);
  timers.clear();
  if(!user)return;
  const q=query(collection(db,'calls'),where('callee','==',user.uid),where('status','==','ringing'));
  onSnapshot(q,s=>s.forEach(d=>schedule(d.id,d.data())),()=>{});
});