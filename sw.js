const CACHE='vibe-shell-v31';
const ASSETS=[
  './','./index.html','./style.css','./vibe-actions.css','./vibe-redesign.css','./vibe-ui-cleanup.css',
  './vibe-modern.css','./vibe-oled.css','./vibe-messaging-advanced.css','./vibe-2026.css','./vibe-right-actions.css','./vibe-ui-2026-final.css','./vibe-runtime.js','./vibe-persistence.js','./vibe-seed.js',
  './vibe-enhancements.js','./vibe-ai.js','./vibe-local-notifications.js','./vibe-actions.js','./vibe-online.js',
  './vibe-analytics.js','./vibe-channel.js','./vibe-modern.js','./calls.js','./firebase-config.js',
  './manifest.webmanifest','./icons/icon.svg'
];
const sameOrigin=url=>url.origin===self.location.origin;
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('vibe-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(!sameOrigin(url))return;
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{})}
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
  );
});
