import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrintableReport } from '../src/components/reports/PrintableReport';
import { createFilledProperty } from './fixtures/sample-property';

/**
 * Hasilkan laporan PDF sungguhan dari komponen yang sama dengan tombol
 * "Cetak / PDF" di aplikasi:
 *
 *   1. render PrintableReport -> HTML
 *   2. pakai CSS hasil build (dist/assets/index-*.css) supaya tampilan sama
 *   3. cetak ke PDF dengan Chrome headless
 *
 * Jalankan: npm run report:pdf
 */
const { building, issues } = createFilledProperty();
const generatedAt = new Date().toLocaleString('id-ID');

const reportHtml = renderToStaticMarkup(
  React.createElement(PrintableReport, { building, issues, generatedAt }),
);

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, 'reports');
fs.mkdirSync(outDir, { recursive: true });

const assetsDir = path.join(projectRoot, 'dist', 'assets');
const cssFile = fs.existsSync(assetsDir)
  ? fs
      .readdirSync(assetsDir)
      .filter((file) => file.endsWith('.css'))
      .sort()
      .pop()
  : undefined;

const htmlPath = path.join(outDir, 'laporan-it-kebon-jeruk.html');
const pdfPath = path.join(outDir, 'laporan-it-kebon-jeruk.pdf');

// CSS disalin ke folder reports/ agar file HTML bisa dibuka/dicetak manual
// tanpa bergantung pada folder dist.
let cssHref = '';
if (cssFile) {
  const cssOutDir = path.join(outDir, 'assets');
  fs.mkdirSync(cssOutDir, { recursive: true });
  fs.copyFileSync(path.join(assetsDir, cssFile), path.join(cssOutDir, cssFile));
  cssHref = `./assets/${cssFile}`;
}

const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>Laporan IT — ${building.name}</title>
    ${cssHref ? `<link rel="stylesheet" href="${cssHref}" />` : ''}
    <style>
      html, body { background: #fff; }
      body { margin: 0; }
    </style>
  </head>
  <body>${reportHtml}</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML laporan:', path.relative(projectRoot, htmlPath));

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));

if (!chrome) {
  console.log('Chrome/Edge tidak ditemukan — HTML tetap bisa dicetak manual (Ctrl+P -> Save as PDF).');
  process.exit(0);
}

const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  fileUrl,
];

try {
  execFileSync(chrome, args, { stdio: 'inherit' });
} catch (error) {
  // Chrome lama tidak punya --no-pdf-header-footer.
  execFileSync(chrome, args.filter((arg) => arg !== '--no-pdf-header-footer'), { stdio: 'inherit' });
}

if (fs.existsSync(pdfPath)) {
  const sizeKb = Math.round(fs.statSync(pdfPath).size / 1024);
  console.log('PDF laporan:', path.relative(projectRoot, pdfPath), `(${sizeKb} KB)`);
} else {
  console.log('PDF belum terbentuk. Buka HTML di Chrome lalu Ctrl+P -> Save as PDF.');
}
