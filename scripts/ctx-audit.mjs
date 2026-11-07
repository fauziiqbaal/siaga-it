#!/usr/bin/env node
/*
 * ctx:audit — laporan ukuran file agar "file raksasa" tidak menumpuk lagi.
 *
 * Kenapa: setiap kali agent membaca file, biaya token sebanding panjang file.
 * File > 400 baris wajib dipecah (lihat .clinerules/token-budget.md).
 *
 * Pakai: npm run ctx:audit          (laporan saja, selalu exit 0)
 *        npm run ctx:audit -- --strict   (exit 1 bila ada file di atas batas)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = Number(process.env.CTX_MAX_LINES ?? 400);
const STRICT = process.argv.includes('--strict');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-ssr',
  'reports',
  '.ssr-check',
  '.shots-build',
  '.report-build',
  'android',
  'data',
  '.tmp-data',
  '.tmp-live',
  '__pycache__',
  '.vscode',
]);
const EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.css', '.py']);
const TARGET_DIRS = ['src', 'scripts'];

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walk(path.join(dir, entry.name), acc);
      continue;
    }
    if (!EXT.has(path.extname(entry.name))) continue;
    const full = path.join(dir, entry.name);
    const bytes = statSync(full).size;
    const lines = readFileSync(full, 'utf8').split(/\r?\n/).length;
    acc.push({ full, rel: path.relative(ROOT, full).replace(/\\/g, '/'), lines, tokens: Math.round(bytes / 4) });
  }
  return acc;
}

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
const offenders = files.filter((f) => f.lines > LIMIT).sort((a, b) => b.lines - a.lines);

console.log(`ctx:audit — target < ${LIMIT} baris/file (1 baris ~ 12 token)\n`);
for (const dir of TARGET_DIRS) {
  const group = files.filter((f) => f.rel.startsWith(`${dir}/`));
  if (group.length === 0) continue;
  const lines = group.reduce((sum, f) => sum + f.lines, 0);
  const tokens = group.reduce((sum, f) => sum + f.tokens, 0);
  console.log(
    `${dir.padEnd(10)} ${String(group.length).padStart(3)} file  ${String(lines).padStart(7)} baris  ~${String(
      Math.round(tokens / 1000)
    ).padStart(4)}k token`
  );
}
console.log(
  `${'TOTAL'.padEnd(10)} ${String(files.length).padStart(3)} file  ${String(totalLines).padStart(7)} baris  ~${String(
    Math.round(totalTokens / 1000)
  ).padStart(4)}k token\n`
);

if (offenders.length === 0) {
  console.log(`OK — tidak ada file di atas ${LIMIT} baris.`);
  process.exit(0);
}

console.log(`File di atas ${LIMIT} baris (paling mahal dibaca):`);
for (const file of offenders.slice(0, 15)) {
  console.log(
    `  ${String(file.lines).padStart(5)}  ${String(Math.round(file.tokens / 1000)).padStart(4)}k token  ${file.rel}`
  );
}
if (offenders.length > 15) console.log(`  ... ${offenders.length - 15} file lain`);
console.log(`\n${offenders.length} file perlu dipecah. Pecah per modul, lalu jalankan ulang audit ini.`);
process.exit(STRICT ? 1 : 0);
