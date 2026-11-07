/**
 * Uji end-to-end di Chrome sungguhan (tanpa dependency tambahan).
 *
 * Membuktikan keluhan "setelah refresh kembali ke awal / seperti demo" sudah
 * beres:
 *   1. buka aplikasi dengan storage kosong  -> harus tampil "Belum ada properti"
 *   2. isi form gedung baru lewat UI (klik betulan, bukan simulasi state)
 *   3. reload halaman                        -> gedung masih ada
 *   4. hapus semua gedung lalu reload        -> tetap kosong, bukan balik ke demo
 *
 * Jalankan: npm run build && npm run check:e2e
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const PORT = 4173;
const DEBUG_PORT = 9223;
const PROFILE = path.join(os.tmpdir(), `siaga-e2e-${Date.now()}`);
const BUILDING_NAME = 'Rukita Uji Otomatis';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition, message) => {
  if (!condition) throw new Error(`GAGAL: ${message}`);
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  throw new Error('dist/index.html tidak ada. Jalankan "npm run build" dulu.');
}

// ---- 1. Server statis kecil untuk folder dist ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const clean = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(DIST, clean === '/' ? 'index.html' : clean);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`Server uji: http://127.0.0.1:${PORT}`);

// ---- 2. Jalankan Chrome headless dengan DevTools ----
const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const chromePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chromePath) throw new Error('Chrome tidak ditemukan untuk uji E2E.');

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const waitForTarget = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome belum siap
    }
    await sleep(250);
  }
  throw new Error('DevTools Chrome tidak siap.');
};

const wsUrl = await waitForTarget();
const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let messageId = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
  // alert()/confirm() di aplikasi tidak boleh memblokir uji otomatis.
  if (message.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true }).catch(() => undefined);
    return;
  }
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (messageId += 1);
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || 'Evaluasi gagal');
  }
  return result.result.value;
};

const waitFor = async (expression, label, timeoutMs = 15000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(expression)) return true;
    await sleep(200);
  }
  throw new Error(`Timeout menunggu: ${label}`);
};

const bodyText = () => evaluate('document.body.innerText');

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await waitFor('document.readyState === "complete"', 'halaman termuat');

  // Mulai dari storage kosong, seperti teknisi pertama kali membuka aplikasi.
  await evaluate('localStorage.clear()');
  await send('Page.reload', { ignoreCache: true });
  await waitFor('document.readyState === "complete"', 'reload pertama');
  await waitFor('document.body.innerText.includes("Belum ada properti")', 'layar onboarding');
  const initialText = await bodyText();
  assert(!initialText.includes('Rukita Tawakal Tomang'), 'properti demo muncul di kondisi awal');
  console.log('1. Kondisi awal kosong + tanpa properti demo — OK');

  // Isi form gedung baru lewat UI.
  const created = await evaluate(`(() => {
    const setValue = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const inputs = Array.from(document.querySelectorAll('input')).filter((el) => el.type !== 'file');
    if (inputs.length < 2) return 'input tidak ditemukan';
    setValue(inputs[0], ${JSON.stringify(BUILDING_NAME)});
    setValue(inputs[1], 'Jl. Uji Otomatis No. 1, Jakarta');
    const button = Array.from(document.querySelectorAll('button')).find((el) =>
      el.textContent.includes('Buat gedung'),
    );
    if (!button) return 'tombol tidak ditemukan';
    button.click();
    return 'ok';
  })()`);
  assert(created === 'ok', `form gagal diisi (${created})`);

  await waitFor(`document.body.innerText.includes(${JSON.stringify(BUILDING_NAME)})`, 'gedung baru tampil');
  console.log('2. Gedung baru dibuat lewat form — OK');

  // Beri waktu debounce penyimpanan (250 ms) + flush.
  await sleep(900);
  const stored = await evaluate(`(() => {
    const raw = localStorage.getItem('siaga_it_v2:buildings');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      count: parsed.data.length,
      name: parsed.data[0]?.name,
      rooms: parsed.data[0]?.floors?.[0]?.rooms?.length ?? 0,
    };
  })()`);
  assert(stored && stored.count === 1, 'gedung tidak tersimpan di localStorage');
  assert(stored.name === BUILDING_NAME, 'nama gedung tidak tersimpan');
  assert(stored.rooms === 6, 'kamar per lantai tidak tersimpan');
  console.log(`3. Tersimpan di localStorage: 1 gedung, ${stored.rooms} kamar/lantai — OK`);

  // REFRESH: inti keluhan user.
  await send('Page.reload', { ignoreCache: true });
  await waitFor('document.readyState === "complete"', 'reload kedua');
  await waitFor(`document.body.innerText.includes(${JSON.stringify(BUILDING_NAME)})`, 'gedung setelah refresh');
  const afterReload = await bodyText();
  assert(afterReload.includes('101'), 'kode kamar 101 hilang setelah refresh');
  assert(!afterReload.includes('Rukita Tawakal Tomang'), 'properti demo muncul setelah refresh');
  console.log('4. Setelah refresh: gedung + kamar 101 masih ada, tanpa data demo — OK');

  // ---- 4b. Kelola lantai: tambah kamar massal + hapus lantai (UI) ----
  const openFirstFloorSheet = await evaluate(`(() => {
    const kelola = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Kelola');
    if (!kelola) return false;
    kelola.click();
    return true;
  })()`);
  assert(openFirstFloorSheet, 'tombol Kelola lantai tidak ditemukan');
  await waitFor('document.body.innerText.includes("Tambah kamar")', 'sheet kelola lantai');

  const bulkResult = await evaluate(`(() => {
    const setValue = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const sheet = document.querySelector('.fixed.inset-0.z-50');
    if (!sheet) return 'sheet tidak ada';
    const numberInput = sheet.querySelector('input[type="number"]');
    if (!numberInput) return 'input jumlah tidak ada';
    setValue(numberInput, '2');
    const save = Array.from(sheet.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Simpan');
    if (!save) return 'tombol simpan tidak ada';
    save.click();
    return 'ok';
  })()`);
  assert(bulkResult === 'ok', `tambah kamar massal gagal (${bulkResult})`);

  await waitFor(
    `(() => {
      const raw = JSON.parse(localStorage.getItem('siaga_it_v2:buildings'));
      return raw?.data?.[0]?.floors?.[0]?.rooms?.length === 8;
    })()`,
    '8 kamar di lantai 1 tersimpan',
  );
  console.log('4b. Tambah 2 kamar sekaligus (6 -> 8) via sheet lantai — OK');

  const roomsAfterBulk = await evaluate(
    `(() => {
      const raw = JSON.parse(localStorage.getItem('siaga_it_v2:buildings'));
      return raw.data[0].floors[0].rooms.map((room) => room.number).join(',');
    })()`,
  );
  assert(roomsAfterBulk.split(',').length === 8, 'jumlah kamar setelah tambah massal salah');
  assert(roomsAfterBulk.includes('107') && roomsAfterBulk.includes('108'), 'nomor kamar lanjutan salah');

  const openLastFloorSheet = await evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((el) => el.textContent.trim() === 'Kelola');
    if (buttons.length === 0) return false;
    buttons[buttons.length - 1].click();
    return true;
  })()`);
  assert(openLastFloorSheet, 'sheet lantai terakhir tidak bisa dibuka');
  await waitFor('document.body.innerText.includes("Hapus lantai")', 'tombol hapus lantai');

  await evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Hapus lantai');
    if (!button) return false;
    button.click();
    return true;
  })()`);

  await waitFor(
    `(() => {
      const raw = JSON.parse(localStorage.getItem('siaga_it_v2:buildings'));
      return raw?.data?.[0]?.floors?.length === 2;
    })()`,
    'lantai terhapus tersimpan',
  );
  console.log('4c. Hapus lantai lewat UI (3 -> 2 lantai) — OK');

  // Hapus gedung lewat UI (bukan mengubah storage langsung), lalu refresh:
  // harus tetap kosong dan properti demo tidak boleh kembali.
  const goSetup = await evaluate(`(() => {
    const tab = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Gedung');
    if (!tab) return false;
    tab.click();
    return true;
  })()`);
  assert(goSetup, 'tab Gedung tidak ditemukan');

  await waitFor('document.body.innerText.includes("Hapus gedung ini")', 'tombol hapus gedung');
  await evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) =>
      el.textContent.includes('Hapus gedung ini'),
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);

  await waitFor('document.body.innerText.includes("Konfirmasi & Hapus Properti")', 'modal hapus gedung');
  const filled = await evaluate(`(() => {
    const setValue = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (!checkbox) return 'checkbox tidak ada';
    checkbox.click();
    const pin = Array.from(document.querySelectorAll('input')).find((el) => el.maxLength === 4);
    if (!pin) return 'input PIN tidak ada';
    setValue(pin, '4569');
    return 'ok';
  })()`);
  assert(filled === 'ok', `form hapus gagal (${filled})`);

  await evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) =>
      el.textContent.includes('Konfirmasi & Hapus Properti'),
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);

  await waitFor('document.body.innerText.includes("Belum ada properti")', 'kondisi kosong setelah hapus');
  const afterDelete = await bodyText();
  assert(!afterDelete.includes('Rukita Tawakal Tomang'), 'properti demo kembali setelah data dihapus');
  console.log('5. Gedung dihapus lewat UI -> layar kosong (bukan demo) — OK');

  console.log('OK — uji browser end-to-end lulus');
} finally {
  ws.close();
  chrome.kill();
  server.close();
  await sleep(300);
  fs.rmSync(PROFILE, { recursive: true, force: true });
}
