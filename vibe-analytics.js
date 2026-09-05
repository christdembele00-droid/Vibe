import { getAnalytics, isSupported, logEvent, setUserId } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js';
import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';

const app = getApps()[0];
let analytics = null;
let ready = false;

async function init() {
  try {
    if (!app || !window.isSecureContext) return false;
    if (!(await isSupported())) return false;
    analytics = getAnalytics(app);
    ready = true;
    logEvent(analytics, 'vibe_app_open');
    return true;
  } catch (error) {
    console.warn('[VIBE Analytics] disabled:', error);
    return false;
  }
}

export function track(name, params = {}) {
  if (!ready || !analytics) return;
  try {
    const safe = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') safe[key] = value;
    }
    logEvent(analytics, String(name).slice(0, 40), safe);
  } catch (error) {
    console.warn('[VIBE Analytics] event failed:', error);
  }
}

export function identify(uid) {
  if (!ready || !analytics || !uid) return;
  try { setUserId(analytics, String(uid)); } catch (error) { console.warn('[VIBE Analytics] user id failed:', error); }
}

window.VIBE_ANALYTICS = {
  track,
  identify,
  ready: () => ready
};

init();
