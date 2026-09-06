// Configuration publique Firebase Web de VIBE.
// Ne place jamais de secret Gemini ou de clé privée dans ce fichier.
export const firebaseConfig={
  apiKey:'AIzaSyC6g40Uc9hq9Ij5DU1nwbO-zwpHqk9L9aQ',
  authDomain:'vibe-749e5.firebaseapp.com',
  projectId:'vibe-749e5',
  storageBucket:'vibe-749e5.firebasestorage.app',
  messagingSenderId:'17097166235',
  appId:'1:17097166235:web:c39c5c082b3cf6a01ee53e',
  measurementId:'G-YXG6TEQHME'
};
// Endpoint interne intercepté par vibe-ai.js. Aucun appel Cloud Functions.
export const VIBE_AI_URL='/__vibe_ai__';

// Compatibilité DOM : certains anciens écrans attendent encore #railAvatar.
// On le crée avant que les listeners Firebase puissent tenter de le remplir.
if(typeof document!=='undefined'&&!document.getElementById('railAvatar')){
  const img=document.createElement('img');
  img.id='railAvatar';
  img.alt='Profil';
  img.hidden=true;
  document.body?.appendChild(img);
}
