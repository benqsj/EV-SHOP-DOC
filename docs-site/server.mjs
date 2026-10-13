// icomers docs — optional server for hosting: serves the docs page and stores answers for everyone.
// Without the server, index.html opens directly from disk (answers then stay in that browser).
import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildHtml, loadQuestions } from './build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const DOCS_DIR = path.resolve(process.env.DOCS_DIR || path.join(HERE, '..', 'docs'));
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(HERE, 'data'));
const ANSWERS_FILE = path.join(DATA_DIR, 'answers.json');
const BASIC_AUTH = process.env.DOCS_BASIC_AUTH || ''; // "user:password" — optional

let store = { answers: [], additions: [] };
let writeChain = Promise.resolve();

async function load() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  if (existsSync(ANSWERS_FILE)) {
    store = JSON.parse(await fs.readFile(ANSWERS_FILE, 'utf8'));
    if (!Array.isArray(store.answers)) store.answers = [];
    if (!Array.isArray(store.additions)) store.additions = [];
  }
}
function persist() {
  writeChain = writeChain.then(async () => {
    const tmp = ANSWERS_FILE + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(store, null, 2));
    await fs.rename(tmp, ANSWERS_FILE);
  });
  return writeChain;
}

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
function authorized(req) {
  if (!BASIC_AUTH) return true;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const given = Buffer.from(h.slice(6), 'base64');
  const want = Buffer.from(BASIC_AUTH);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

const server = http.createServer(async (req, res) => {
  try {
    if (!authorized(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="icomers docs"' });
      return res.end('Authentication required');
    }
    const p = new URL(req.url, 'http://x').pathname;

    if (p === '/healthz') return send(res, 200, { ok: true });
    if (p === '/' || p === '/index.html') return send(res, 200, buildHtml(DOCS_DIR), 'text/html; charset=utf-8');
    if (p === '/api/answers' && req.method === 'GET') return send(res, 200, store.answers);
    if (p === '/api/answers' && req.method === 'POST') {
      let data;
      try { data = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'invalid json' }); }
      const questionId = String(data.questionId || '').trim();
      const author = String(data.author || '').trim().slice(0, 80);
      const text = String(data.text || '').trim().slice(0, 5000);
      if (!author || !text) return send(res, 422, { error: 'author and text are required' });
      if (!loadQuestions(DOCS_DIR).some((q) => q.id === questionId)) return send(res, 404, { error: 'unknown question' });
      const answer = { id: crypto.randomUUID(), questionId, author, text, createdAt: new Date().toISOString() };
      store.answers.push(answer);
      await persist();
      return send(res, 201, answer);
    }
    const editMatch = p.match(/^\/api\/(answers|additions)\/([\w-]+)$/);
    if (editMatch && req.method === 'PUT') {
      let data;
      try { data = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'invalid json' }); }
      const text = String(data.text || '').trim().slice(0, 5000);
      const editor = String(data.editor || '').trim().slice(0, 80);
      if (!text || !editor) return send(res, 422, { error: 'text and editor are required' });
      const item = store[editMatch[1]].find((x) => x.id === editMatch[2]);
      if (!item) return send(res, 404, { error: 'not found' });
      Object.assign(item, { text, editedBy: editor, editedAt: new Date().toISOString() });
      await persist();
      return send(res, 200, item);
    }
    if (p === '/api/additions' && req.method === 'GET') return send(res, 200, store.additions);
    if (p === '/api/additions' && req.method === 'POST') {
      let data;
      try { data = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'invalid json' }); }
      const sectionId = String(data.sectionId || '').trim().slice(0, 300);
      const sectionTitle = String(data.sectionTitle || '').trim().slice(0, 300);
      const author = String(data.author || '').trim().slice(0, 80);
      const text = String(data.text || '').trim().slice(0, 5000);
      if (!/^\d\d-[\w-]+--/.test(sectionId) || !author || !text) return send(res, 422, { error: 'sectionId, author and text are required' });
      const addition = { id: crypto.randomUUID(), sectionId, sectionTitle, author, text, createdAt: new Date().toISOString() };
      store.additions.push(addition);
      await persist();
      return send(res, 201, addition);
    }
    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  } catch (err) {
    console.error(err);
    send(res, 500, { error: 'internal error' });
  }
});

await load();
server.listen(PORT, () => console.log(`icomers docs → http://localhost:${PORT}  (docs: ${DOCS_DIR}, answers: ${ANSWERS_FILE})`));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.close(() => writeChain.finally(() => process.exit(0))));
