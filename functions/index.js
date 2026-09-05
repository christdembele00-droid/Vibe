const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!getApps().length) initializeApp();

const geminiKey = defineSecret('GEMINI_API_KEY');
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestWindows = new Map();

function jsonError(res, status, error) {
  return res.status(status).json({ error });
}

function allowedOrigin(origin) {
  return !origin || origin === 'https://christdembele00-droid.github.io' || origin === 'http://localhost:5000' || origin === 'http://127.0.0.1:5000';
}

exports.vibeAI = onRequest({
  region: 'us-central1',
  secrets: [geminiKey],
  cors: false,
  timeoutSeconds: 60,
  memory: '256MiB'
}, async (req, res) => {
  try {
    const origin = String(req.headers.origin || '');
    if (!allowedOrigin(origin)) return jsonError(res, 403, 'Origine non autorisée');
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
    }
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return jsonError(res, 405, 'POST required');

    const authHeader = String(req.headers.authorization || '');
    if (!authHeader.startsWith('Bearer ')) return jsonError(res, 401, 'Authentification requise');

    const token = authHeader.slice(7).trim();
    if (!token || token.length > 4096) return jsonError(res, 401, 'Session invalide');

    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;
    const now = Date.now();
    const previous = requestWindows.get(userId) || { started: now, count: 0 };

    if (now - previous.started >= WINDOW_MS) {
      requestWindows.set(userId, { started: now, count: 1 });
    } else {
      previous.count += 1;
      requestWindows.set(userId, previous);
      if (previous.count > MAX_REQUESTS_PER_WINDOW) {
        return jsonError(res, 429, 'Trop de requêtes. Réessaie dans un instant.');
      }
    }

    const text = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!text) return jsonError(res, 400, 'message required');
    if (text.length > 12000) return jsonError(res, 413, 'message too long');

    const ai = new GoogleGenerativeAI(geminiKey.value());
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    });

    const prompt = [
      'Tu es VIBE AI, un assistant intégré à une messagerie.',
      'Réponds en français de façon utile, claire, concise et respectueuse.',
      'Ne fournis pas d instructions dangereuses, illégales ou permettant de contourner des protections.',
      '',
      `Utilisateur: ${text}`
    ].join('\n');

    const result = await model.generateContent(prompt);
    const reply = String(result?.response?.text?.() || '').trim();
    if (!reply) return jsonError(res, 502, 'Réponse IA vide');

    return res.json({ reply });
  } catch (e) {
    console.error('VIBE AI error', e);
    if (e?.code === 'auth/id-token-expired' || e?.code === 'auth/argument-error' || e?.code === 'auth/id-token-revoked') {
      return jsonError(res, 401, 'Session invalide');
    }
    return jsonError(res, 500, 'Gemini indisponible');
  }
});