import{getAuth,GoogleAuthProvider,GithubAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail}from'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';import{firebaseConfig}from'./firebase-config.js';
const auth=getAuth();
const toast=t=>{const el=document.getElementById('toast');if(!el)return;el.textContent=t;el.style.display='block';clearTimeout(window.__authToast);window.__authToast=setTimeout(()=>el.style.display='none',4200)};
const explain=e=>{const c=e?.code||'';const m={
'auth/unauthorized-domain':'Firebase : ce domaine n’est pas autorisé. Vérifie christdembele00-droid.github.io dans Authentication > Paramètres > Domaines autorisés.',
'auth/popup-blocked':'La fenêtre de connexion a été bloquée. Autorise les fenêtres pop-up pour VIBE.',
'auth/popup-closed-by-user':'Connexion annulée.',
'auth/cancelled-popup-request':'Une autre fenêtre de connexion est déjà ouverte.',
'auth/operation-not-allowed':'Ce fournisseur n’est pas activé dans Firebase Authentication.',
'auth/invalid-api-key':'La clé API Firebase est invalide ou restreinte.',
'auth/network-request-failed':'Connexion réseau impossible. Vérifie Internet puis réessaie.',
'auth/account-exists-with-different-credential':'Un compte existe déjà avec cette adresse e-mail. Utilise le même fournisseur que lors de la première inscription.',
'auth/invalid-credential':'Les identifiants fournis sont invalides ou expirés.',
'auth/user-disabled':'Ce compte a été désactivé dans Firebase.',
'auth/invalid-email':'Adresse e-mail invalide.',
'auth/missing-password':'Mot de passe requis.',
'auth/weak-password':'Le mot de passe doit contenir au moins 6 caractères.',
'auth/email-already-in-use':'Cette adresse e-mail est déjà utilisée.',
'auth/invalid-login-credentials':'E-mail ou mot de passe incorrect.'};return m[c]||('Authentification Firebase impossible'+(c?` (${c})`:'.'))};
async function login(provider){try{await signInWithPopup(auth,provider)}catch(e){console.error('VIBE Firebase Auth',e);toast(explain(e))}}
const google=document.getElementById('google');const github=document.getElementById('github');
if(google)google.onclick=()=>login(new GoogleAuthProvider());
if(github)github.onclick=()=>login(new GithubAuthProvider());
window.VIBE_AUTH={auth,loginGoogle:()=>login(new GoogleAuthProvider()),loginGitHub:()=>login(new GithubAuthProvider()),signInEmail:async(e,p)=>{try{return await signInWithEmailAndPassword(auth,e,p)}catch(x){toast(explain(x));throw x}},signUpEmail:async(e,p)=>{try{return await createUserWithEmailAndPassword(auth,e,p)}catch(x){toast(explain(x));throw x}},resetPassword:async e=>{try{await sendPasswordResetEmail(auth,e);toast('E-mail de réinitialisation envoyé.')}catch(x){toast(explain(x));throw x}}};