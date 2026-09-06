const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const port = Number(process.env.PORT || 10000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function safePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^[/\\]+/, '');
  const candidate = path.resolve(root, relative || 'index.html');
  const relativeToRoot = path.relative(root, candidate);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) return null;
  return candidate;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  let file = safePath(req.url || '/');
  if (!file) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad Request');
  }

  try {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      file = path.join(root, 'index.html');
    }
  } catch (error) {
    console.error('[VIBE] File lookup error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Internal Server Error');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      console.error('[VIBE] Static server error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Internal Server Error');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[VIBE] Web server listening on 0.0.0.0:${port}`);
});
