// Builds one self-contained HTML file with all docs, diagrams, styles and scripts.
// Usage: node docs-site/build.mjs   → writes icomers/index.html (opens directly from disk)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

export function buildHtml(docsDir = path.join(ROOT, 'docs')) {
  const read = (p) => fs.readFileSync(p, 'utf8');
  const docs = {};
  for (const f of fs.readdirSync(docsDir).filter((f) => /^\d\d-.+\.md$/.test(f)).sort()) {
    docs[f.replace(/\.md$/, '')] = read(path.join(docsDir, f));
  }
  const diagrams = {};
  const dDir = path.join(docsDir, 'diagrams');
  if (fs.existsSync(dDir)) {
    for (const f of fs.readdirSync(dDir).filter((f) => f.endsWith('.svg'))) diagrams[f.replace(/\.svg$/, '')] = read(path.join(dDir, f));
  }
  const safe = (js) => js.replace(/<\/(script)/gi, '<\\/$1');
  const content = 'window.ICOMERS_DOCS = ' + safe(JSON.stringify({ docs, diagrams })) + ';';
  const src = path.join(HERE, 'src');
  return read(path.join(src, 'template.html'))
    .replace('/*STYLE*/', () => read(path.join(src, 'style.css')))
    .replace('/*MARKED*/', () => safe(read(path.join(src, 'vendor', 'marked.min.js'))))
    .replace('/*CONTENT*/', () => content)
    .replace('/*APP*/', () => safe(read(path.join(src, 'app.js'))));
}

export function loadQuestions(docsDir = path.join(ROOT, 'docs')) {
  const out = [];
  for (const f of fs.readdirSync(docsDir).filter((f) => /^\d\d-.+\.md$/.test(f)).sort()) {
    const md = fs.readFileSync(path.join(docsDir, f), 'utf8');
    const re = /^:::question id="([^"]+)" to="([^"]*)"\n([\s\S]*?)\n:::$/gm;
    let m;
    while ((m = re.exec(md))) out.push({ id: m[1], to: m[2], text: m[3].trim(), doc: f });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.join(ROOT, 'index.html');
  fs.writeFileSync(out, buildHtml());
  console.log('✓ ' + out);
}
