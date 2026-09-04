import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 10000);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MAX_BODY = 256 * 1024;
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

async function gemini(input, previousInteractionId) {
  if (!ai) throw Object.assign(new Error('GEMINI_API_KEY is not configured on the server.'), { status: 503 });
  const request = { model: MODEL, input };
  if (previousInteractionId) request.previous_interaction_id = previousInteractionId;
  const interaction = await ai.interactions.create(request);
  return { id: interaction.id, text: interaction.output_text || '' };
}

async function serveStatic(req, res) {
  const requested = req.url === '/' ? '/index.html' : req.url;
  const safe = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  const file = path.join(__dirname, 'public', safe);
  if (!file.startsWith(path.join(__dirname, 'public'))) return json(res, 403, { error: 'Forbidden' });
  try {
    const data = await readFile(file);
    const type = mime[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    res.end(data);
  } catch { json(res, 404, { error: 'Not found' }); }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/health') return json(res, 200, { ok: true, service: 'VIBE', ai: Boolean(ai), model: MODEL });
    if (req.method === 'POST' && req.url === '/api/chat') {
      const data = await body(req);
      const message = typeof data.message === 'string' ? data.message.trim() : '';
      const previous = typeof data.previousInteractionId === 'string' ? data.previousInteractionId.trim() : '';
      if (!message) return json(res, 400, { error: 'Message required.' });
      if (message.length > 20000) return json(res, 413, { error: 'Message too long.' });
      const result = await gemini(message, previous || undefined);
      return json(res, 200, result);
    }
    if (req.method === 'GET') return serveStatic(req, res);
    json(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = Number(error?.status) || 500;
    console.error(error);
    json(res, status, { error: status === 500 ? 'Internal server error.' : error.message });
  }
});

server.listen(PORT, () => console.log(`VIBE listening on :${PORT} using ${MODEL}`));
