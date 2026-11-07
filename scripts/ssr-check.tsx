/**
 * Smoke test render: memastikan seluruh shell + view fase pertama bisa dirender
 * tanpa error runtime (props undefined, akses storage, dsb).
 * Jalankan: npx vite build --ssr scripts/ssr-check.tsx --outDir .ssr-check && node .ssr-check/ssr-check.js
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import { SAMPLE_BUILDINGS, SAMPLE_ISSUES } from '../src/data/mockData';

const envelope = (data: unknown) =>
  JSON.stringify({ v: 2, savedAt: new Date().toISOString(), data });

const store = new Map<string, string>();
const localStorageStub = {
  get length() {
    return store.size;
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
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
  bodyAppend: () => undefined,
};

// Seed data contoh HANYA untuk uji render (aplikasi aslinya mulai kosong).
store.set('siaga_it_v2:buildings', envelope(SAMPLE_BUILDINGS));
store.set('siaga_it_v2:issues', envelope(SAMPLE_ISSUES));
store.set('siaga_it_v2:active_building', envelope(SAMPLE_BUILDINGS[0].id));

const html = renderToStaticMarkup(React.createElement(App));

console.log('Rendered characters:', html.length);
for (const marker of ['Siaga IT', 'Pre-Opening', 'Fase onboarding', 'Billing']) {
  console.log(`${marker}:`, html.includes(marker) ? 'OK' : 'MISSING');
}
if (html.length < 2000) throw new Error('Render terlalu pendek — kemungkinan gagal render');

// Render tiap fase: pastikan tidak ada crash pada view lain.
const tabs: Array<{ tab: string; marker: string }> = [
  { tab: 'setup', marker: 'Fase onboarding' },
  { tab: 'preopening', marker: 'Pre-Opening Score' },
  { tab: 'opening', marker: 'Catatan SSID' },
  { tab: 'scores', marker: 'Lembar penilaian IT' },
];

for (const entry of tabs) {
  store.set('siaga_it_v2:active_tab', JSON.stringify({ v: 2, savedAt: new Date().toISOString(), data: entry.tab }));
  const output = renderToStaticMarkup(React.createElement(App));
  const ok = output.includes(entry.marker);
  console.log(`Tab ${entry.tab}: ${ok ? 'OK' : 'MISSING MARKER'} (${output.length} chars)`);
  if (!ok) throw new Error(`Render tab ${entry.tab} gagal`);
}

// Render gedung kosong (baru dibuat, belum ada kamar/perangkat)
store.set(
  'siaga_it_v2:buildings',
  JSON.stringify({
    v: 2,
    savedAt: new Date().toISOString(),
    data: [
      {
        id: 'bld-empty',
        name: 'Gedung Baru',
        address: '',
        openingDate: '',
        ispProvider: '',
        floors: [{ id: 'fl-1', floorNumber: 1, name: 'Lantai 1', rooms: [], facilities: [] }],
        cctvPoints: [],
        devices: [],
        internetConnections: [],
      },
    ],
  }),
);
store.set('siaga_it_v2:active_building', JSON.stringify({ v: 2, savedAt: new Date().toISOString(), data: 'bld-empty' }));
store.set('siaga_it_v2:active_tab', JSON.stringify({ v: 2, savedAt: new Date().toISOString(), data: 'preopening' }));
const emptyOutput = renderToStaticMarkup(React.createElement(App));
console.log('Empty building render:', emptyOutput.includes('Pre-Opening Score') ? 'OK' : 'MISSING');
// Modul legacy (menu "Lain") — pastikan masih bisa dirender setelah shell diganti.
const legacyTabs = ['dashboard', 'calendar', 'issues', 'property', 'evaluation', 'devices', 'cctv', 'readiness', 'user_management'];
for (const legacy of legacyTabs) {
  store.set('siaga_it_v2:active_tab', JSON.stringify({ v: 2, savedAt: new Date().toISOString(), data: legacy }));
  try {
    const output = renderToStaticMarkup(React.createElement(App));
    console.log(`Legacy tab ${legacy}: OK (${output.length} chars)`);
  } catch (error) {
    console.log(`Legacy tab ${legacy}: RENDER ERROR — ${(error as Error).message}`);
  }
}



// --- Kondisi awal aplikasi: belum ada properti (bukan demo) ---
store.set('siaga_it_v2:buildings', envelope([]));
store.set('siaga_it_v2:issues', envelope([]));
store.set('siaga_it_v2:active_building', envelope(''));
store.set('siaga_it_v2:active_tab', envelope('setup'));
const onboarding = renderToStaticMarkup(React.createElement(App));
const hasOnboarding = onboarding.includes('Belum ada properti');
console.log('Kondisi awal (tanpa properti):', hasOnboarding ? 'OK' : 'MISSING');
if (!hasOnboarding) throw new Error('layar onboarding tidak muncul saat belum ada properti');

// --- Properti buatan user: dipakai apa adanya, properti demo tidak ikut muncul ---
const customBuilding = {
  id: 'bld-uji',
  name: 'Gedung Uji Coba',
  address: 'Jl. Uji No. 1',
  openingDate: '15 Nov 2026',
  ispProvider: 'Biznet',
  phase: 'SETUP',
  internetConnections: [],
  floors: [
    {
      id: 'fl-uji-1',
      floorNumber: 1,
      name: 'Lantai 1',
      facilities: [],
      rooms: [
        { id: 'rm-uji-1', number: '101', floor: 1, hasTv: false, hasSmartlock: true, wifiStatus: 'OK', wifiSpeedMbps: 42, tvStatus: 'BELUM_TERSEDIA', lockStatus: 'OK' },
      ],
    },
  ],
  cctvPoints: [],
  devices: [],
};
store.set('siaga_it_v2:buildings', envelope([customBuilding]));
store.set('siaga_it_v2:active_building', envelope('bld-uji'));
store.set('siaga_it_v2:active_tab', envelope('preopening'));
const customHtml = renderToStaticMarkup(React.createElement(App));
console.log('Gedung user tampil:', customHtml.includes('Gedung Uji Coba') ? 'OK' : 'MISSING');
console.log('Properti demo tidak muncul:', customHtml.includes('Rukita Tawakal Tomang') ? 'RUSAK' : 'OK');
if (!customHtml.includes('Gedung Uji Coba')) throw new Error('gedung buatan user tidak dirender');
if (customHtml.includes('Rukita Tawakal Tomang')) throw new Error('properti demo masih muncul di aplikasi');

console.log('OK — render smoke test passed');

