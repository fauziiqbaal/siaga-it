/**
 * Screenshot aplikasi yang SEDANG BERJALAN (serve.py + Chrome), termasuk badge
 * sinkronisasi server dan sheet kelola lantai. Juga membuktikan perangkat kedua
 * (profil Chrome baru) otomatis memuat data dari server.
 *
 * Jalankan: npm run build && npm run shots:live
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openBrowser, startPythonServer, sleep } from './lib/browser.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'shots-live');
const BACKUP = path.join(ROOT, 'reports', 'sample-backup.json');
const PORT = 4177;
const API_PORT = 8796;
const DATA_DIR = path.join(os.tmpdir(), `siaga-live-${Date.now()}`);
const BASE_URL = `http://127.0.0.1:${PORT}/`;

if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) throw new Error('Jalankan "npm run build" dulu.');
if (!fs.existsSync(BACKUP)) throw new Error('Jalankan "npm run fixture:backup" dulu.');

fs.mkdirSync(OUT, { recursive: true });
const server = await startPythonServer({ port: PORT, apiPort: API_PORT, dataDir: DATA_DIR });

const app = await openBrowser({ baseUrl: BASE_URL, profileSuffix: 'live-a', debugPort: 9228 });

const shot = async (name) => {
  const { data } = await app.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('screenshot:', `reports/shots-live/${name}.png`);
};

const clickButton = (text) =>
  app.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === ${JSON.stringify(text)});
    if (!button) return false;
    button.click();
    return true;
  })()`);

try {
  await app.waitFor('document.body.innerText.includes("Belum ada properti")', 'onboarding');
  await sleep(900);
  await shot('01-kondisi-awal');

  // Impor backup contoh lewat input file (jalur yang dipakai user).
  const { root } = await app.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await app.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' });
  await app.send('DOM.setFileInputFiles', { files: [BACKUP], nodeId });
  await app.waitFor('document.body.innerText.includes("Rukita Kebon Jeruk")', 'backup termuat');
  await sleep(2800); // beri waktu push ke server (badge berubah jadi "server hh:mm")
  await shot('02-setup-gedung');

  // Fokus ke daftar lantai: legend W/T/L + penanda di kamar & area.
  await app.evaluate(`(() => {
    const legend = document.querySelector('[data-testid="facility-legend"]');
    if (!legend) return false;
    legend.scrollIntoView({ block: 'center' });
    return true;
  })()`);
  await sleep(500);
  await shot('02a-lantai-kamar-marks');

  // Sheet billing internet (field ringkas: ISP, paket, bandwidth, CID, atas nama,
  // no. telepon & email terdaftar).
  await app.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Ubah');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await app.waitFor('document.body.innerText.includes("Email terdaftar")', 'sheet billing');
  await shot('02b-billing-koneksi');

  await app.send('Page.reload', { ignoreCache: true });
  await app.waitFor('document.readyState === "complete"', 'reload setelah billing');
  await app.waitFor('document.body.innerText.includes("Rukita Kebon Jeruk")', 'gedung setelah reload billing');

  // Sheet kelola lantai (fitur baru: tambah kamar massal / hapus lantai).
  await app.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Kelola');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await app.waitFor('document.body.innerText.includes("Tambah kamar")', 'sheet kelola lantai');
  await shot('03-kelola-lantai');

  // Tutup sheet dengan reload (menghindari transisi history sheet), lalu
  // lanjut ke tab fase berikutnya.
  await app.send('Page.reload', { ignoreCache: true });
  await app.waitFor('document.readyState === "complete"', 'reload setelah sheet');
  await app.waitFor('document.body.innerText.includes("Rukita Kebon Jeruk")', 'gedung setelah reload');

  await clickButton('Pre-Opening');
  await app.waitFor(
    'document.body.innerText.toLowerCase().includes("pre-opening score")',
    'tab pre-opening',
  );
  await shot('04-preopening-wifi');

  await clickButton('Opening');
  await app.waitFor(
    'document.body.innerText.toLowerCase().includes("standardisasi ssid")',
    'tab opening',
  );
  await shot('05-opening-takeover');

  await clickButton('Skor');
  await app.waitFor(
    'document.body.innerText.toLowerCase().includes("lembar penilaian it")',
    'tab skor',
  );
  await shot('06-skor-ringkasan');

  await app.evaluate('window.scrollTo(0, document.body.scrollHeight)');
  await sleep(500);
  await shot('07-laporan-a4');

  const health = await (await fetch(`${BASE_URL}api/health`)).json();
  console.log(`Server menyimpan ${health.buildings} gedung, ${health.issues} kendala`);
} finally {
  await app.close();
  await sleep(1000);
}

// ---- Perangkat kedua: profil baru, storage kosong, data dari server ----
const phone = await openBrowser({
  baseUrl: BASE_URL,
  profileSuffix: 'live-b',
  debugPort: 9230,
  windowSize: { width: 414, height: 900 },
});

try {
  console.log('HP: menunggu data dari server…');
  await phone.waitFor('document.body.innerText.includes("Rukita Kebon Jeruk")', 'gedung dari server di HP');
  console.log('HP: gedung dari server tampil otomatis');
  const { data } = await phone.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, '08-hp-perangkat-kedua.png'), Buffer.from(data, 'base64'));
  console.log('screenshot:', 'reports/shots-live/08-hp-perangkat-kedua.png');
  console.log('OK — perangkat kedua memuat data dari server tanpa impor');
} catch (error) {
  console.warn('HP: screenshot dilewati —', error.message);
} finally {
  await phone.close();
  server.stop();
}
