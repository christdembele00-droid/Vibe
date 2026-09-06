import{getApps,initializeApp}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import{getAuth,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import{getFirestore,doc,setDoc,updateDoc,collection,query,where,onSnapshot,orderBy,limit,arrayUnion,serverTimestamp}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import{firebaseConfig}from'./firebase-config.js';

const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
const DEVICE_KEY='vibe:device-id';
const deviceId=(()=>{let id=localStorage.getItem(DEVICE_KEY);if(!id){id=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(DEVICE_KEY,id)}return id})();
let uid=null,roomsUnsub=null,roomUnsubs=new Map(),heartbeat=null;
const roomId=(a,b)=>[a,b].sort().join('__');
const activeRoom=()=>{const t=window.VIBE_CURRENT_USER;if(!uid||!t||t.channel)return null;return t.group?t.id:roomId(uid,t.uid)};

async function registerDevice(user){
  uid=user.uid;
  window.__VIBE_UID=uid;
  await setDoc(doc(db,'users',uid,'devices',deviceId),{deviceId,userAgent:navigator.userAgent.slice(0,500),platform:navigator.platform||'',online:true,lastSeen:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
  clearInterval(heartbeat);
  heartbeat=setInterval(()=>updateDoc(doc(db,'users',uid,'devices',deviceId),{online:true,lastSeen:serverTimestamp(),updatedAt:serverTimestamp()}).catch(()=>{}),30000);
  window.addEventListener('pagehide',()=>updateDoc(doc(db,'users',uid,'devices',deviceId),{online:false,lastSeen:serverTimestamp(),updatedAt:serverTimestamp()}).catch(()=>{}),{once:true});
}

function watchMessages(room){
  if(roomUnsubs.has(room))return;
  const q=query(collection(db,'rooms',room,'messages'),orderBy('createdAt','desc'),limit(30));
  const unsub=onSnapshot(q,snap=>{
    snap.docChanges().filter(c=>c.type==='added').forEach(c=>{
      const m=c.doc.data();
      if(!m||m.sender===uid)return;
      const ref=doc(db,'rooms',room,'messages',c.doc.id);
      const delivered=Array.isArray(m.deliveredBy)&&m.deliveredBy.includes(uid);
      const read=Array.isArray(m.readBy)&&m.readBy.includes(uid);
      const updates={};
      if(!delivered)updates.deliveredBy=arrayUnion(uid);
      if(activeRoom()===room&&!read)updates.readBy=arrayUnion(uid);
      if(Object.keys(updates).length)updateDoc(ref,updates).catch(()=>{});
    });
  },()=>{});
  roomUnsubs.set(room,unsub);
}

function watchRooms(){
  roomsUnsub?.();
  roomUnsubs.forEach(u=>u());roomUnsubs.clear();
  if(!uid)return;
  roomsUnsub=onSnapshot(query(collection(db,'rooms'),where('participants','array-contains',uid)),snap=>snap.docs.forEach(d=>watchMessages(d.id)),()=>{});
}

onAuthStateChanged(auth,user=>{
  roomsUnsub?.();roomUnsubs.forEach(u=>u());roomUnsubs.clear();clearInterval(heartbeat);
  uid=user?.uid||null;window.__VIBE_UID=uid;
  if(!user)return;
  registerDevice(user).catch(()=>{});
  watchRooms();
});
