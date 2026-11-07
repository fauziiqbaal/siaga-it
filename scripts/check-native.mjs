/**
 * Uji jalur native tanpa perangkat Android.
 *
 * Chrome menyuntikkan `window.Capacitor` palsu (plugin WifiSignal) sebelum
 * aplikasi dimuat, lalu skrip menekan tombol "Baca HP" di sheet Uji Wi-Fi dan
 * memastikan field dBm terisi -54 serta sumbernya tercatat "dBm sensor HP".
 *
 * Catatan: ini menguji jembatan JS + UI. Kode Java (WifiSignalPlugin) baru
 * benar-benar berjalan setelah APK di-build dengan Android SDK.
 *
 * Jalankan: npm run build && npm run check:native
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openBrowser, startPythonServer, sleep } from './lib/browser.mjs';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const BACKUP = path.join(ROOT, 'reports', 'sample-backup.json');
const PORT = 4178;
const API_PORT = 8798;
const DATA_DIR = path.join(os.tmpdir(), `siaga-native-${Date.now()}`);
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const assert = (condition, message) => {
  if (!condition) throw new Error(`GAGAL: ${message}`);
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('Jalankan "npm run build" dulu.');
if (!fs.existsSync(BACKUP)) throw new Error('Jalankan "npm run fixture:backup" dulu.');

const server = await startPythonServer({ port: PORT, apiPort: API_PORT, dataDir: DATA_DIR });
const browser = await openBrowser({ baseUrl: BASE_URL, profileSuffix: 'native', debugPort: 9231 });

try {
  // Sunting Capacitor palsu sebelum bundle aplikasi dieksekusi.
  await browser.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        Plugins: {
          WifiSignal: {
            getSignal: async () => ({
              supported: true,
              dbm: -54,
              ssid: 'RUKITA TRIBE',
              frequencyMhz: 5180,
              linkSpeedMbps: 433,
              method: 'WifiSignal.getRssi()'
            })
          }
        }
      };
    `,
  });
  await browser.send('Page.reload', { ignoreCache: true });
  await browser.waitFor('document.readyState === "complete"', 'reload dengan Capacitor palsu');
  await browser.waitFor('document.body.innerText.includes("Belum ada properti")', 'layar onboarding');

  // Muat properti contoh lewat input file (jalur yang dipakai user).
  const { root } = await browser.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await browser.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' });
  await browser.send('DOM.setFileInputFiles', { files: [BACKUP], nodeId });
  await browser.waitFor('document.body.innerText.includes("Rukita Kebon Jeruk")', 'backup termuat');
  console.log('1. Aplikasi berjalan dengan Capacitor palsu + data contoh — OK');

  // Buka Pre-Opening lalu sheet Uji Wi-Fi kamar pertama.
  await browser.evaluate(`(() => {
    const tab = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Pre-Opening');
    if (!tab) return false;
    tab.click();
    return true;
  })()`);
  await browser.waitFor('document.body.innerText.toLowerCase().includes("pre-opening score")', 'tab pre-opening');

  const openedSheet = await browser.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Uji');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  assert(openedSheet, 'tombol Uji tidak ditemukan');
  await browser.waitFor('document.body.innerText.includes("Baca HP")', 'tombol Baca HP (mode native)');
  console.log('2. Tombol "Baca HP" muncul karena aplikasi terdeteksi native — OK');

  await browser.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Baca HP');
    if (!button) return false;
    button.click();
    return true;
  })()`);

  await browser.waitFor(`document.body.innerText.includes('WifiSignal.getRssi()')`, 'catatan hasil baca sensor');
  await sleep(300);

  const result = await browser.evaluate(`(() => {
    const input = document.querySelector('input[placeholder="mis. -58"]');
    return {
      value: input ? input.value : null,
      source: document.body.innerText.includes('dBm sensor HP'),
      note: (document.body.innerText.match(/Terbaca:[^\\n]*/) || [''])[0],
    };
  })()`);

  assert(result.value === '-54', `dBm tidak terisi otomatis (value=${result.value})`);
  assert(result.source, 'label sumber "dBm sensor HP" tidak muncul');
  console.log(`3. dBm terisi otomatis: ${result.value} · "${result.note}" — OK`);

  const shotsDir = path.join(ROOT, 'reports', 'shots-live');
  fs.mkdirSync(shotsDir, { recursive: true });
  const { data } = await browser.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotsDir, '09-native-baca-hp.png'), Buffer.from(data, 'base64'));
  console.log('screenshot:', 'reports/shots-live/09-native-baca-hp.png');

  console.log('OK — jalur native (jembatan plugin) tervalidasi di browser');
} finally {
  await browser.close();
  server.stop();
}
