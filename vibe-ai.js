import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-ai.js';
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: 'gemini-3.7-flash' });
const nativeFetch = window.fetch.bind(window);
const legacyUrl = '/__vibe_ai__';

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (url !== legacyUrl) return nativeFetch(input, init);
  let payload = {};
  try { payload = JSON.parse(init.body || '{}'); } catch (_) {}
  const text = String(payload.message || '').trim();
  if (!text) return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  try {
    const prompt = `Tu es VIBE AI, assistant intégré à une messagerie. Réponds en français de manière utile, claire, concise et respectueuse.\n\nUtilisateur: ${text.slice(0, 12000)}`;
    const result = await model.generateContent(prompt);
    return new Response(JSON.stringify({ reply: result.response.text() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('VIBE AI Logic:', error);
    return new Response(JSON.stringify({ error: 'VIBE AI indisponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
};
