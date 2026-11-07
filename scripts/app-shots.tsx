import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import App from '../src/App';
import { createFilledProperty } from './fixtures/sample-property';

/**
 * Screenshot tiap fase aplikasi (dist statis, tanpa server) untuk dokumentasi.
 *
 * Render memakai komponen App yang sama dengan produksi; state "tersimpan"
 * diisi lewat localStorage stub, jadi tampilan yang dihasilkan identik dengan
 * layar teknisi setelah data diisi.
 *
 * Jalankan: npm run shots:app
 */

const store = new Map<string, string>();
const localStorageStub = {
  get length() {
    return store.size;
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
};

(globalThis as unknown as Record<string, unknown>).localStorage = localStorageStub;
(globalThis as unknown as Record<string, unknown>).window = {
  localStorage: localStorageStub,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  setTimeout: (fn: () => void) => setTimeout(fn, 0),
  clearTimeout: (id: number) => clearTimeout(id),
  history: { state: null, replaceState: () => undefined, pushState: () => undefined },
  location: { href: 'http://localhost/' },
  matchMedia: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }),
};

(globalThis as unknown as Record<string, unknown>).document = {
  documentElement: { classList: { add: () => undefined, remove: () => undefined } },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  visibilityState: 'visible',
  body: { style: {} },
  createElement: () => ({ style: {}, remove: () => undefined, click: () => undefined, appendChild: () => undefined }),
};

const envelope = (data: unknown) => JSON.stringify({ v: 2, savedAt: new Date().toISOString(), data });
const projectRoot = process.cwd();
const outDir = path.join(projectRoot, 'reports', 'shots');
fs.mkdirSync(outDir, { recursive: true });

// Salin CSS hasil build supaya file HTML bisa dibuka mandiri.
const assetsDir = path.join(projectRoot, 'dist', 'assets');
const cssFile = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css')).sort().pop()
  : undefined;
if (!cssFile) throw new Error('CSS dist tidak ditemukan. Jalankan "npm run build" dulu.');
fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
fs.copyFileSync(path.join(assetsDir, cssFile), path.join(outDir, 'assets', cssFile));

const { building, issues } = createFilledProperty();

interface ShotSpec {
  name: string;
  tab: string;
  width: number;
  height: number;
  empty?: boolean;
}

const SHOTS: ShotSpec[] = [
  { name: '00-kondisi-awal', tab: 'setup', width: 1100, height: 1000, empty: true },
  { name: '01-setup-gedung', tab: 'setup', width: 1280, height: 1500 },
  { name: '02-preopening-wifi', tab: 'preopening', width: 1280, height: 1650 },
  { name: '03-opening-takeover', tab: 'opening', width: 1280, height: 1650 },
  { name: '04-skor-ringkasan', tab: 'scores', width: 1280, height: 1500 },
];

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));

for (const spec of SHOTS) {
  store.clear();
  store.set('siaga_it_v2:buildings', envelope(spec.empty ? [] : [building]));
  store.set('siaga_it_v2:issues', envelope(spec.empty ? [] : issues));
  store.set('siaga_it_v2:active_building', envelope(spec.empty ? '' : building.id));
  store.set('siaga_it_v2:active_tab', envelope(spec.tab));
  store.set('siaga_it_v2:theme_dark', envelope(true));

  const appHtml = renderToStaticMarkup(React.createElement(App));
  const html = `<!doctype html>
<html lang="id" class="dark">
  <head>
    <meta charset="UTF-8" />
    <title>Siaga IT — ${spec.name}</title>
    <link rel="stylesheet" href="./assets/${cssFile}" />
  </head>
  <body class="bg-background text-foreground antialiased min-h-screen">
    <div id="root">${appHtml}</div>
  </body>
</html>`;

  const htmlPath = path.join(outDir, `${spec.name}.html`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('HTML:', path.relative(projectRoot, htmlPath));

  if (chrome) {
    const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--window-size=${spec.width},${spec.height}`,
        `--screenshot=${path.join(outDir, `${spec.name}.png`)}`,
        fileUrl,
      ],
      { stdio: 'ignore' },
    );
    console.log('PNG :', path.relative(projectRoot, path.join(outDir, `${spec.name}.png`)));
  }
}

if (!chrome) console.log('Chrome tidak ditemukan — hanya HTML yang dihasilkan.');
console.log('OK — screenshot aplikasi selesai');
