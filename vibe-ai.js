import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-ai.js';
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
const ai=getAI(app,{backend:new GoogleAIBackend()});
const model=getGenerativeModel(ai,{model:'gemini-3.7-flash'});
const groundedModel=getGenerativeModel(ai,{model:'gemini-3.7-flash',tools:[{googleSearch:{}}]});
const nativeFetch=window.fetch.bind(window);
const legacyUrl='/__vibe_ai__';

async function ask(text,live=false){
 const prompt=live
  ? `Tu es VIBE AI, rédacteur du réseau social VIBE. Utilise Google Search pour obtenir des informations publiques récentes et vérifiables. Pour le sujet suivant, produis 3 informations importantes en français. Format strict : une ligne TITRE: ..., puis une ligne RESUME: ... pour chaque information. Ne fabrique aucun fait. Si une information n'est pas vérifiable, ne l'utilise pas. Sujet: ${text}`
  : `Tu es VIBE AI, assistant intégré à VIBE. Réponds en français de manière claire, utile, concise et respectueuse. Utilisateur: ${text}`;
 const result=await (live?groundedModel:model).generateContent(prompt);
 const response=result.response;
 const meta=response?.groundingMetadata||{};
 const chunks=meta.groundingChunks||[];
 const sources=[];
 for(const chunk of chunks){const web=chunk?.web;if(web?.uri){sources.push({title:web.title||web.uri,uri:web.uri})}}
 return {text:response.text(),sources:[...new Map(sources.map(s=>[s.uri,s])).values()].slice(0,8)};
}

window.VIBE_AI_ASK=async text=>ask(String(text||'').trim(),false);
window.VIBE_AI_NEWS=async topic=>ask(String(topic||'actualités').trim(),true);

window.fetch=async(input,init={})=>{
 const url=typeof input==='string'?input:input?.url;
 if(url!==legacyUrl)return nativeFetch(input,init);
 let payload={};try{payload=JSON.parse(init.body||'{}')}catch(_){}
 const text=String(payload.message||'').trim();
 if(!text)return new Response(JSON.stringify({error:'message required'}),{status:400,headers:{'Content-Type':'application/json'}});
 try{const result=await ask(text,false);return new Response(JSON.stringify({reply:result.text,sources:result.sources}),{status:200,headers:{'Content-Type':'application/json'}})}
 catch(error){console.error('VIBE AI Logic:',error);return new Response(JSON.stringify({error:'VIBE AI indisponible'}),{status:503,headers:{'Content-Type':'application/json'}})}
};
