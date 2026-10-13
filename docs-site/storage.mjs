// Storage for answers and additions.
// - DATABASE_URL (or DB_* / PG* variables) set → PostgreSQL (hosted, e.g. usectl Postgres addon)
// - otherwise → JSON file in DATA_DIR (local use)
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

function pgConfig() {
  const url = process.env.DATABASE_URL || '';
  if (/^postgres(ql)?:\/\//.test(url)) return { connectionString: url };
  const host = process.env.DB_HOST || process.env.PGHOST || (url && !url.includes('://') ? url : '');
  if (!host) return null;
  return {
    host,
    port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
    user: process.env.DB_USER || process.env.PGUSER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS || process.env.PGPASSWORD,
    database: process.env.DB_NAME || process.env.DB_DATABASE || process.env.PGDATABASE,
  };
}

const COLS = {
  answers: { table: 'docs_answers', key: 'question_id', keyProp: 'questionId', extra: [] },
  additions: { table: 'docs_additions', key: 'section_id', keyProp: 'sectionId', extra: [['section_title', 'sectionTitle']] },
};

function rowToItem(kind, r) {
  const c = COLS[kind];
  const item = { id: r.id, [c.keyProp]: r[c.key], author: r.author, text: r.text, createdAt: new Date(r.created_at).toISOString() };
  for (const [col, prop] of c.extra) item[prop] = r[col];
  if (r.edited_at) Object.assign(item, { editedBy: r.edited_by, editedAt: new Date(r.edited_at).toISOString() });
  return item;
}

async function postgresStorage(config) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ ...config, max: 3, ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS docs_answers (
      id uuid PRIMARY KEY, question_id text NOT NULL, author text NOT NULL, text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), edited_by text, edited_at timestamptz);
    CREATE TABLE IF NOT EXISTS docs_additions (
      id uuid PRIMARY KEY, section_id text NOT NULL, section_title text NOT NULL DEFAULT '', author text NOT NULL, text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), edited_by text, edited_at timestamptz);`);
  return {
    name: 'postgres',
    async list(kind) {
      const { rows } = await pool.query(`SELECT * FROM ${COLS[kind].table} ORDER BY created_at, id`);
      return rows.map((r) => rowToItem(kind, r));
    },
    async add(kind, item) {
      const c = COLS[kind];
      const cols = ['id', c.key, ...c.extra.map(([col]) => col), 'author', 'text', 'created_at'];
      const vals = [item.id, item[c.keyProp], ...c.extra.map(([, prop]) => item[prop]), item.author, item.text, item.createdAt];
      const { rows } = await pool.query(
        `INSERT INTO ${c.table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(', ')}) RETURNING *`, vals);
      return rowToItem(kind, rows[0]);
    },
    async update(kind, id, text, editor) {
      const { rows } = await pool.query(
        `UPDATE ${COLS[kind].table} SET text = $2, edited_by = $3, edited_at = now() WHERE id = $1 RETURNING *`, [id, text, editor]);
      return rows[0] ? rowToItem(kind, rows[0]) : null;
    },
    async close() { await pool.end(); },
  };
}

async function fileStorage(dataDir) {
  const file = path.join(dataDir, 'answers.json');
  let writable = true;
  try { await fs.mkdir(dataDir, { recursive: true }); } catch (err) {
    writable = false;
    console.warn(`⚠ cannot write to ${dataDir} (${err.code}); answers are kept in memory only. Set DATABASE_URL to persist them.`);
  }
  let data = { answers: [], additions: [] };
  try { if (existsSync(file)) data = { answers: [], additions: [], ...JSON.parse(await fs.readFile(file, 'utf8')) }; } catch { /* start empty */ }
  let chain = Promise.resolve();
  const persist = () => (chain = chain.then(async () => {
    if (!writable) return;
    await fs.writeFile(file + '.tmp', JSON.stringify(data, null, 2));
    await fs.rename(file + '.tmp', file);
  }).catch((err) => console.error('save failed:', err.message)));
  return {
    name: writable ? 'file: ' + file : 'memory (not persistent)',
    async list(kind) { return data[kind]; },
    async add(kind, item) { data[kind].push(item); await persist(); return item; },
    async update(kind, id, text, editor) {
      const item = data[kind].find((x) => x.id === id);
      if (!item) return null;
      Object.assign(item, { text, editedBy: editor, editedAt: new Date().toISOString() });
      await persist();
      return item;
    },
    async close() { await chain; },
  };
}

export async function createStorage(dataDir) {
  const cfg = pgConfig();
  if (cfg) return postgresStorage(cfg);
  if (process.env.NODE_ENV === 'production') console.warn('⚠ DATABASE_URL is not set: answers and additions will be lost on restart. Attach a Postgres addon.');
  return fileStorage(dataDir);
}
