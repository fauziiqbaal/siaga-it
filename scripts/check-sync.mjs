/**
 * Uji sinkronisasi JSON antar perangkat (butuh Python + Chrome).
 *
 * Skenario:
 *   1. HP pertama (profil Chrome A) membuat gedung -> otomatis dikirim ke server
 *   2. HP kedua (profil Chrome B, localStorage kosong) membuka aplikasi
 *      -> gedung yang sama muncul tanpa impor manual
 *   3. File data/siaga-it.json benar-benar ada di disk
 *   4. Simpan per gedung: properti lain tidak tertimpa, revisi basi ditolak 409
 *   5. Hapus per gedung: hanya gedung terpilih yang hilang
 *   (3b) HP ketiga menerima perubahan teknisi lain tanpa refresh halaman
 *
 * Jalankan: npm run build && npm run check:sync
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openBrowser, startPythonServer, findChrome, sleep } from './lib/browser.mjs';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const PORT = 4176;
const API_PORT = 8794;
const DATA_DIR = path.join(os.tmpdir(), `siaga-sync-${Date.now()}`);
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const BUILDING_NAME = 'Rukita Sinkron Uji';

const assert = (condition, message) => {
  if (!condition) throw new Error(`GAGAL: ${message}`);
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('Jalankan "npm run build" dulu.');
if (!findChrome()) throw new Error('Chrome tidak ditemukan.');

const server = await startPythonServer({ port: PORT, apiPort: API_PORT, dataDir: DATA_DIR });
console.log(`Server uji: ${BASE_URL} (data: ${DATA_DIR})`);

// Endpoint sinyal Wi-Fi agen: harus jujur (dBm hanya kalau OS memberikannya).
const wifi = await (await fetch(`${BASE_URL}api/wifi`)).json();
assert(typeof wifi.available === 'boolean', 'endpoint /api/wifi tidak valid');
assert(
  wifi.dbm === null || (typeof wifi.dbm === 'number' && wifi.dbm < 0),
  'dBm dari agen tidak valid (harus null atau negatif)',
);
if (wifi.qualityPercent !== null && wifi.dbm === null) {
  console.log(`Agen Wi-Fi: OS hanya memberi ${wifi.qualityPercent}% — dBm dibiarkan kosong (tidak dikarang) — OK`);
} else if (wifi.dbm !== null) {
  console.log(`Agen Wi-Fi: dBm asli ${wifi.dbm} dari ${wifi.source} — OK`);
} else {
  console.log('Agen Wi-Fi: tidak ada adapter Wi-Fi terdeteksi — OK');
}

// Server harus melaporkan protokol sinkron v3 (simpan per properti).
const healthInfo = await (await fetch(`${BASE_URL}api/health`)).json();
assert(
  typeof healthInfo.syncVersion === 'number' && healthInfo.syncVersion >= 3,
  `server tidak melaporkan syncVersion >= 3 (dapat ${healthInfo.syncVersion})`,
);

const createBuilding = `(() => {
  const setValue = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const inputs = Array.from(document.querySelectorAll('input')).filter((el) => el.type !== 'file');
  if (inputs.length < 2) return 'input tidak ditemukan';
  setValue(inputs[0], ${JSON.stringify(BUILDING_NAME)});
  setValue(inputs[1], 'Jl. Sinkron No. 1, Jakarta');
  const button = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.includes('Buat gedung'));
  if (!button) return 'tombol tidak ditemukan';
  button.click();
  return 'ok';
})()`;

const putBuilding = async (id, body) => {
  const response = await fetch(`${BASE_URL}api/buildings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

try {
  // ---- Perangkat 1 ----
  const deviceA = await openBrowser({ baseUrl: BASE_URL, profileSuffix: 'sync-a', debugPort: 9225 });
  try {
    await deviceA.waitFor('document.body.innerText.includes("Belum ada properti")', 'onboarding perangkat 1');
    const created = await deviceA.evaluate(createBuilding);
    assert(created === 'ok', `form gagal diisi (${created})`);
    await deviceA.waitFor(`document.body.innerText.includes(${JSON.stringify(BUILDING_NAME)})`, 'gedung tampil');

    // Tunggu push selesai (debounce 1.2 detik + request), lalu cek server.
    let health = { buildings: 0 };
    for (let attempt = 0; attempt < 30; attempt += 1) {
      health = await (await fetch(`${BASE_URL}api/health`)).json();
      if (health.buildings >= 1) break;
      await sleep(400);
    }
    assert(health.buildings === 1, `server belum menerima gedung (buildings=${health.buildings})`);
    const state = await (await fetch(`${BASE_URL}api/state`)).json();
    assert(state.buildings?.[0]?.name === BUILDING_NAME, 'nama gedung di server tidak cocok');
    console.log('1. Perangkat 1: gedung dibuat & terkirim ke server — OK');
  } finally {
    await deviceA.close();
  }

  // ---- Perangkat 2 (profil baru, localStorage kosong) ----
  const deviceB = await openBrowser({ baseUrl: BASE_URL, profileSuffix: 'sync-b', debugPort: 9226 });
  try {
    await deviceB.waitFor(`document.body.innerText.includes(${JSON.stringify(BUILDING_NAME)})`, 'gedung dari server');
    await deviceB.waitFor(
      `(localStorage.getItem('siaga_it_v2:buildings') || '').includes(${JSON.stringify(BUILDING_NAME)})`,
      'tersimpan ke localStorage perangkat 2',
    );
    const hasDemo = (await deviceB.bodyText()).includes('Rukita Tawakal Tomang');
    assert(!hasDemo, 'properti demo muncul di perangkat 2');
    console.log('2. Perangkat 2: storage kosong -> otomatis memuat gedung dari server — OK');
  } finally {
    await deviceB.close();
  }

  // ---- Perangkat 3: perubahan teknisi lain masuk tanpa refresh halaman ----
  const deviceC = await openBrowser({ baseUrl: BASE_URL, profileSuffix: 'sync-c', debugPort: 9227 });
  try {
    await deviceC.waitFor(
      `(localStorage.getItem('siaga_it_v2:buildings') || '').includes(${JSON.stringify(BUILDING_NAME)})`,
      'perangkat 3 memuat gedung dari server',
    );
    const stateNow = await (await fetch(`${BASE_URL}api/state`)).json();
    const current = stateNow.buildings.find((b) => b.name === BUILDING_NAME);
    assert(current, 'gedung uji tidak ada di server');

    // Tombol manual wajib memberi umpan balik (berhasil/gagal), bukan diam saja.
    const openPanel = await deviceC.evaluate(`(() => {
      const more = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Lain');
      if (!more) return 'tombol Lain tidak ada';
      more.click();
      return 'ok';
    })()`);
    assert(openPanel === 'ok', openPanel);
    await deviceC.waitFor(
      "Array.from(document.querySelectorAll('button')).some((el) => el.textContent.trim() === 'Kirim ke server')",
      'panel Lain terbuka (perangkat 3)',
    );
    await deviceC.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Kirim ke server');
      btn.click();
      return 'ok';
    })()`);
    await deviceC.waitFor('document.body.innerText.includes("Berhasil")', 'umpan balik "Kirim ke server"');
    console.log('3b. Tombol Kirim ke server memberi umpan balik berhasil — OK');

    const mergedAddress = 'Jl. Gabung No. 3';
    const updated = await putBuilding(current.id, {
      building: { ...current, address: mergedAddress },
      issues: [],
      baseRev: current.rev,
    });
    assert(updated.status === 200, 'gagal menyimpan perubahan dari perangkat lain');

    // Tarik manual lewat event fokus (interval tarik 60 detik terlalu lama di uji).
    await deviceC.evaluate("window.dispatchEvent(new Event('focus')); 'ok'");
    await deviceC.waitFor(
      `(localStorage.getItem('siaga_it_v2:buildings') || '').includes(${JSON.stringify(mergedAddress)})`,
      'perubahan perangkat lain tergabung ke perangkat 3',
    );
    console.log('3. Perangkat 3: perubahan teknisi lain tergabung tanpa refresh — OK');
  } finally {
    await deviceC.close();
  }

  // ---- Uji tabrakan: simpan per gedung tidak boleh saling menimpa ----
  const snapshotA = await (await fetch(`${BASE_URL}api/state`)).json();
  assert(
    snapshotA.buildings.length === 1,
    `server harus punya 1 gedung sebelum uji tabrakan (ada ${snapshotA.buildings.length}: ${snapshotA.buildings
      .map((b) => `${b.id}/${b.name}/rev${b.rev}`)
      .join(', ')})`,
  );
  const buildingA = snapshotA.buildings[0];
  assert(
    typeof buildingA.rev === 'number' && buildingA.rev >= 1,
    'server tidak memberi nomor revisi (rev) untuk gedung',
  );

  // Perangkat 2 menambah properti lain; properti perangkat 1 harus tetap utuh.
  const other = { id: 'bld-sinkron-b', name: 'Rukita Sinkron Uji B', address: 'Jl. B No. 2' };
  const created = await putBuilding(other.id, { building: other, issues: [], baseRev: null });
  assert(created.status === 200 && created.body.rev === 1, `gedung baru gagal disimpan (${created.status})`);

  const twoBuildings = await (await fetch(`${BASE_URL}api/state`)).json();
  assert(twoBuildings.buildings.length === 2, 'gedung properti lain hilang saat menambah gedung');
  assert(
    twoBuildings.buildings.some((b) => b.id === buildingA.id && b.name === BUILDING_NAME),
    'properti perangkat 1 ikut tertimpa',
  );

  // Revisi basi -> 409: perubahan teknisi lain tidak tertimpa diam-diam.
  const stale = await putBuilding(buildingA.id, {
    building: { ...buildingA, address: 'Jl. Basi No. 9' },
    issues: [],
    baseRev: 0,
  });
  assert(stale.status === 409, `simpan dengan revisi basi tidak ditolak (status ${stale.status})`);
  assert(
    stale.body.conflict === true && stale.body.rev === buildingA.rev,
    'respons 409 tidak membawa revisi server',
  );

  // Revisi benar -> 200, rev naik, properti lain tidak tersentuh.
  const fresh = await putBuilding(buildingA.id, {
    building: { ...buildingA, address: 'Jl. Sinkron No. 2' },
    issues: [],
    baseRev: buildingA.rev,
  });
  assert(fresh.status === 200 && fresh.body.rev === buildingA.rev + 1, 'simpan dengan revisi benar gagal');

  const afterFresh = await (await fetch(`${BASE_URL}api/state`)).json();
  const untouched = afterFresh.buildings.find((b) => b.id === other.id);
  assert(untouched && untouched.rev === 1, 'menyimpan satu gedung mengubah gedung lain');
  console.log('4. Simpan per gedung: properti lain tidak tertimpa, revisi basi ditolak 409 — OK');

  // Hapus per gedung: hanya gedung itu yang hilang.
  const deleted = await fetch(`${BASE_URL}api/buildings/${encodeURIComponent(other.id)}`, { method: 'DELETE' });
  assert(deleted.ok, 'hapus gedung lewat API gagal');
  const afterDelete = await (await fetch(`${BASE_URL}api/state`)).json();
  assert(
    afterDelete.buildings.length === 1 && afterDelete.buildings[0].id === buildingA.id,
    'hapus satu gedung ikut menghapus gedung lain',
  );
  console.log('5. Hapus per gedung: hanya gedung terpilih yang dihapus — OK');

  // ---- Perangkat 4: "Reset data lokal" tidak boleh menghapus properti di server ----
  const deviceD = await openBrowser({ baseUrl: BASE_URL, profileSuffix: 'sync-d', debugPort: 9228 });
  try {
    await deviceD.waitFor(
      `(localStorage.getItem('siaga_it_v2:buildings') || '').includes(${JSON.stringify(BUILDING_NAME)})`,
      'perangkat 4 memuat gedung dari server',
    );
    const opened = await deviceD.evaluate(`(() => {
      const more = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Lain');
      if (!more) return 'tombol Lain tidak ada';
      more.click();
      return 'ok';
    })()`);
    assert(opened === 'ok', opened);

    await deviceD.waitFor(
      "Array.from(document.querySelectorAll('button')).some((el) => el.textContent.trim() === 'Reset data lokal')",
      'sheet Lain terbuka',
    );
    const reset = await deviceD.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((el) => el.textContent.trim() === 'Reset data lokal');
      if (!btns.length) return 'tombol reset tidak ada';
      // Chrome headless menolak window.confirm secara otomatis; di uji ini
      // dialog konfirmasi dianggap "Ya".
      window.confirm = () => true;
      btns[0].click();
      return 'ok:' + btns.length;
    })()`);
    assert(reset.startsWith('ok'), reset);

    await deviceD.waitFor('document.body.innerText.includes("Belum ada properti")', 'layar kosong setelah reset');
    const afterReset = await (await fetch(`${BASE_URL}api/state`)).json();
    assert(
      afterReset.buildings.length === 1 && afterReset.buildings[0].id === buildingA.id,
      'reset data lokal ikut menghapus properti di server',
    );
    console.log('7. Reset data lokal hanya mengosongkan perangkat, data server utuh — OK');
  } finally {
    await deviceD.close();
  }

  const file = path.join(DATA_DIR, 'siaga-it.json');
  assert(fs.existsSync(file), 'file JSON tidak dibuat');
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(Array.isArray(saved.buildings) && saved.buildings.length === 1, 'isi file JSON tidak sesuai');
  console.log('6. File JSON tersimpan di disk (bisa di-backup / dibaca server lain) — OK');

  // ---- Server mati: tombol wajib melapor gagal (bukan diam saja) ----
  const deviceE = await openBrowser({ baseUrl: BASE_URL, profileSuffix: 'sync-e', debugPort: 9229 });
  try {
    await deviceE.waitFor(
      `(localStorage.getItem('siaga_it_v2:buildings') || '').includes(${JSON.stringify(BUILDING_NAME)})`,
      'perangkat 5 memuat gedung dari server',
    );
    const openedPanel = await deviceE.evaluate(`(() => {
      const more = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Lain');
      if (!more) return 'tombol Lain tidak ada';
      more.click();
      return 'ok';
    })()`);
    assert(openedPanel === 'ok', openedPanel);
    await deviceE.waitFor(
      "Array.from(document.querySelectorAll('button')).some((el) => el.textContent.trim() === 'Kirim ke server')",
      'panel Lain terbuka (perangkat 5)',
    );

    server.stop();
    await sleep(600);

    await deviceE.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((el) => el.textContent.trim() === 'Kirim ke server');
      btn.click();
      return 'ok';
    })()`);
    await deviceE.waitFor(
      'document.body.innerText.includes("tidak merespons")',
      'umpan balik gagal saat server mati',
    );
    console.log('8. Server mati: tombol memberi tahu gagal (bukan diam) — OK');
  } finally {
    await deviceE.close();
  }

  console.log('OK — sinkronisasi antar perangkat lulus');
} finally {
  server.stop();
}
