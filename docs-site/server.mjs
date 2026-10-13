// icomers docs — server for hosting: serves the docs page and stores answers / additions for everyone.
// Storage: PostgreSQL when DATABASE_URL is set (usectl Postgres addon), otherwise a JSON file.
// Without the server, index.html opens directly from disk (answers then stay in that browser).
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildHtml, loadQuestions } from './build.mjs';
import { createStorage } from './storage.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const DOCS_DIR = path.resolve(process.env.DOCS_DIR || path.join(HERE, '..', 'docs'));
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(HERE, 'data'));
const BASIC_AUTH = process.env.DOCS_BASIC_AUTH || ''; // "user:password" — optional

const page = buildHtml(DOCS_DIR); // docs are baked into the image; build once
const questionIds = new Set(loadQuestions(DOCS_DIR).map((q) => q.id));
const storage = await createStorage(DATA_DIR);

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJson(req) { try { return JSON.parse(await readBody(req)); } catch { return null; } }
function authorized(req) {
  if (!BASIC_AUTH) return true;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const given = Buffer.from(h.slice(6), 'base64');
  const want = Buffer.from(BASIC_AUTH);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}
const clean = (v, max) => String(v || '').trim().slice(0, max);

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/healthz') return send(res, 200, { ok: true });
    if (!authorized(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="icomers docs"' });
      return res.end('Authentication required');
    }
    const p = new URL(req.url, 'http://x').pathname;

    if (p === '/' || p === '/index.html') return send(res, 200, page, 'text/html; charset=utf-8');

    if (p === '/api/answers' && req.method === 'GET') return send(res, 200, await storage.list('answers'));
    if (p === '/api/answers' && req.method === 'POST') {
      const data = await readJson(req);
      if (!data) return send(res, 400, { error: 'invalid json' });
      const item = { id: crypto.randomUUID(), questionId: clean(data.questionId, 200), author: clean(data.author, 80), text: clean(data.text, 5000), createdAt: new Date().toISOString() };
      if (!item.author || !item.text) return send(res, 422, { error: 'author and text are required' });
      if (!questionIds.has(item.questionId)) return send(res, 404, { error: 'unknown question' });
      return send(res, 201, await storage.add('answers', item));
    }

    if (p === '/api/additions' && req.method === 'GET') return send(res, 200, await storage.list('additions'));
    if (p === '/api/additions' && req.method === 'POST') {
      const data = await readJson(req);
      if (!data) return send(res, 400, { error: 'invalid json' });
      const item = { id: crypto.randomUUID(), sectionId: clean(data.sectionId, 300), sectionTitle: clean(data.sectionTitle, 300), author: clean(data.author, 80), text: clean(data.text, 5000), createdAt: new Date().toISOString() };
      if (!/^\d\d-[\w-]+--/.test(item.sectionId) || !item.author || !item.text) return send(res, 422, { error: 'sectionId, author and text are required' });
      return send(res, 201, await storage.add('additions', item));
    }

    const edit = p.match(/^\/api\/(answers|additions)\/([0-9a-f-]{36})$/);
    if (edit && req.method === 'PUT') {
      const data = await readJson(req);
      if (!data) return send(res, 400, { error: 'invalid json' });
      const text = clean(data.text, 5000), editor = clean(data.editor, 80);
      if (!text || !editor) return send(res, 422, { error: 'text and editor are required' });
      const item = await storage.update(edit[1], edit[2], text, editor);
      return item ? send(res, 200, item) : send(res, 404, { error: 'not found' });
    }

    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  } catch (err) {
    console.error(err);
    send(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => console.log(`icomers docs → http://localhost:${PORT}  (storage: ${storage.name})`));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.close(() => storage.close().finally(() => process.exit(0))));
