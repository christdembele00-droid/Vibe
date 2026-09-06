import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-ai.js';
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { firebaseConfig } from './firebase-config.js';

const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
const ai=getAI(app,{backend:new GoogleAIBackend()});
const model=getGenerativeModel(ai,{model:'gemini-3.7-flash'});
const groundedModel=getGenerativeModel(ai,{model:'gemini-3.7-flash',tools:[{googleSearch:{}}]});
const nativeFetch=window.fetch.bind(window);
const legacyUrl='/__vibe_ai__';
const OPENVERSE='https://api.openverse.org/v1/images/';

function clean(v,max=500){return String(v??'').replace(/[<>]/g,'').trim().slice(0,max)}

function parseNews(text){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const items=[];
 let current=null;
 for(const line of lines){
  const title=line.match(/^TITRE\s*:\s*(.+)$/i);
  const summary=line.match(/^RESUME\s*:\s*(.+)$/i);
  if(title){if(current?.title&&current?.summary)items.push(current);current={title:clean(title[1],180),summary:''};continue}
  if(summary&&current){current.summary=clean(summary[1],500);continue}
 }
 if(current?.title&&current?.summary)items.push(current);
 return items.slice(0,3);
}

async function findOpenverseImage(query){
 try{
  const url=`${OPENVERSE}?q=${encodeURIComponent(clean(query,180))}&page_size=8&mature=false`;
  const r=await nativeFetch(url,{headers:{Accept:'application/json'}});
  if(!r.ok)return null;
  const data=await r.json();
  const results=Array.isArray(data?.results)?data.results:[];
  const item=results.find(x=>x?.thumbnail||x?.url);
  if(!item)return null;
  return {
   imageUrl:String(item.thumbnail||item.url),
   imageAlt:clean(item.title||query,180),
   imageSource:clean(item.source||item.provider||'Openverse',120),
   imagePageUrl:String(item.foreign_landing_url||item.url||''),
   imageCreator:clean(item.creator||'',160),
   imageLicense:clean(item.license||'',80)
  };
 }catch(error){console.warn('Openverse image search:',error);return null}
}

async function attachImages(items,topic){
 return Promise.all(items.map(async item=>{
  const image=await findOpenverseImage(`${item.title} ${topic}`);
  return {...item,...(image||{})};
 }));
}

async function ask(text,live=false){
 const topic=clean(text,180)||'actualités';
 const prompt=live
  ? `Tu es VIBE AI, rédacteur du réseau social VIBE. Utilise Google Search pour obtenir des informations publiques récentes et vérifiables sur le thème « ${topic} ». Produis exactement 3 informations importantes en français. Format strict, sans markdown : une ligne TITRE: ..., puis une ligne RESUME: ... pour chaque information. Les résumés doivent être factuels, courts et compréhensibles. Ne fabrique aucun fait. Si une information n'est pas vérifiable, ne l'utilise pas. Privilégie les événements récents et importants.`
  : `Tu es VIBE AI, assistant intégré à VIBE. Réponds en français de manière claire, utile, concise et respectueuse. Utilisateur: ${topic}`;
 const result=await (live?groundedModel:model).generateContent(prompt);
 const response=result.response;
 const meta=response?.groundingMetadata||{};
 const chunks=meta.groundingChunks||[];
 const sources=[];
 for(const chunk of chunks){const web=chunk?.web;if(web?.uri){sources.push({title:web.title||web.uri,uri:web.uri})}}
 const uniqueSources=[...new Map(sources.map(s=>[s.uri,s])).values()].slice(0,8);
 const raw=response.text();
 const items=live?parseNews(raw):[];
 const newsItems=live?await attachImages(items,topic):[];
 return {text:raw,sources:uniqueSources,items:newsItems};
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
