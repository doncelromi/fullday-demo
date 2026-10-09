// Recorre src/, extrae todas las claves i18n usadas y las compara con el diccionario.
// Uso: node scripts/check-i18n.mjs  → "0 faltantes" es el criterio de cierre.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SRC = path.join(root, 'src');
const DICT_DIR = path.join(SRC, 'i18n', 'dict');

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(e.name) ? [p] : [];
  });

// 1) Diccionario: claves 'a.b': [es, en]
const dict = new Map();
const dupes = [];
const badPairs = [];
for (const f of fs.readdirSync(DICT_DIR)) {
  if (f === 'index.ts') continue;
  const src = fs.readFileSync(path.join(DICT_DIR, f), 'utf8');
  const re = /^\s*'([a-zA-Z0-9_.]+)':\s*\[/gm;
  let m;
  while ((m = re.exec(src))) {
    if (dict.has(m[1])) dupes.push(`${m[1]} (${f} y ${dict.get(m[1])})`);
    dict.set(m[1], f);
  }
  // pares con un idioma vacío
  const reEmpty = /'([a-zA-Z0-9_.]+)':\s*\[\s*''\s*,|'([a-zA-Z0-9_.]+)':\s*\[[^\]]*,\s*''\s*\]/g;
  while ((m = reEmpty.exec(src))) badPairs.push(m[1] || m[2]);
}
const prefixes = new Set([...dict.keys()].map((k) => k.split('.')[0]));

// 2) Uso en el código
const used = new Map(); // key -> file
const dynamic = [];
const files = walk(SRC).filter((f) => !f.startsWith(DICT_DIR));
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f);
  // t('x') / tr('x', ...) / literales 'prefijo.algo' de prefijos conocidos
  const reLit = /['"]([a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z0-9_.]+)['"]/g;
  let m;
  while ((m = reLit.exec(src))) {
    const key = m[1];
    const pre = key.split('.')[0];
    if (!prefixes.has(pre)) continue;
    if (/\.(tsx?|png|jpe?g|svg|css|json|com|br|ar|csv|pdf|dwg|xlsx)$/.test(key)) continue;
    if (!used.has(key)) used.set(key, rel);
  }
  // template literals: `prefijo.${...}sufijo`
  const reTpl = /`([a-zA-Z][a-zA-Z0-9]*\.[^`]*\$\{[^`]*)`/g;
  while ((m = reTpl.exec(src))) {
    const raw = m[1];
    const pre = raw.split('.')[0];
    if (!prefixes.has(pre)) continue;
    const rx = new RegExp('^' + raw.split(/\$\{[^}]*\}/).map((s) => s.replace(/[.*+?^()|[\]\\]/g, '\\$&')).join('[a-zA-Z0-9_.]+') + '$');
    const ok = [...dict.keys()].some((k) => rx.test(k));
    if (!ok) dynamic.push(`${raw} (${rel})`);
  }
}

const missing = [...used.entries()].filter(([k]) => !dict.has(k));

// 3) Copy por vista: x('es', 'en') — ninguna de las dos traducciones puede venir vacía
const xEmpty = [];
let xCount = 0;
const reX = /\bx\(\s*(['`])((?:\\.|(?!\1).)*)\1\s*,\s*(['`])((?:\\.|(?!\3).)*)\3/g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  reX.lastIndex = 0;
  while ((m = reX.exec(src))) {
    xCount++;
    if (!m[2].trim() || !m[4].trim()) xEmpty.push(path.relative(root, f) + ': ' + m[0].slice(0, 70));
  }
}
console.log(`Copy por vista x(es, en): ${xCount} pares`);
if (xEmpty.length) console.log(`\nPares con traducción vacía (${xEmpty.length}):\n  ` + xEmpty.join('\n  '));
console.log(`Diccionario: ${dict.size} claves · Usadas (estáticas): ${used.size}`);
if (dupes.length) console.log(`\nDuplicadas (${dupes.length}):\n  ` + dupes.join('\n  '));
if (badPairs.length) console.log(`\nTraducción vacía (${badPairs.length}):\n  ` + badPairs.join('\n  '));
if (dynamic.length) console.log(`\nPlantillas dinámicas sin coincidencia (${dynamic.length}):\n  ` + dynamic.join('\n  '));
if (missing.length) {
  console.log(`\n${missing.length} faltantes:`);
  for (const [k, f] of missing) console.log(`  ${k}  ← ${f}`);
  process.exit(1);
}
if (dynamic.length || dupes.length || badPairs.length || xEmpty.length) process.exit(1);
console.log('\n0 faltantes ✔');
