import { Building, EvidenceCategory, EvidenceMedia } from '../types/hotel';

// IndexedDB configuration
const DB_NAME = 'SiagaIT_EvidenceDB';
const DB_VERSION = 1;
const STORE_NAME = 'evidence';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('buildingId', 'buildingId', { unique: false });
        store.createIndex('entityId', 'entityId', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generate Building Slug & Short Code
export function getBuildingShortCode(buildingName: string): string {
  const lower = buildingName.toLowerCase();
  if (lower.includes('tomang')) return 'TMG';
  if (lower.includes('kuningan')) return 'KUN';
  if (lower.includes('benhil')) return 'BNH';
  if (lower.includes('kemang')) return 'KMG';
  if (lower.includes('bsd') || lower.includes('serpong')) return 'BSD';
  
  // fallback: pick consonants or first 3 letters
  const clean = buildingName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.slice(0, 3) || 'BLD';
}

export function getBuildingSlug(buildingName: string): string {
  return buildingName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'property';
}

// Category code mapping
const CATEGORY_CODES: Record<EvidenceCategory, string> = {
  WIFI_SPEEDTEST: 'WIFI_SPD',
  TV_CHECK: 'TV_STREAM',
  SMARTLOCK_CHECK: 'LOCK_TEST',
  FACILITY_CHECK: 'FACILITY',
  CCTV_CHECK: 'CCTV_VIEW',
  DEVICE_ASSET: 'ASSET_LABEL',
  GENERAL_EVIDENCE: 'EVIDENCE',
};

// Generate standardized auto-rename filename & folder path
export function generateEvidencePath(
  building: Building,
  category: EvidenceCategory,
  entityName: string,
  extension: string = 'jpg'
): { fileName: string; folderPath: string } {
  const shortCode = getBuildingShortCode(building.name);
  const buildingSlug = getBuildingSlug(building.name);
  const catCode = CATEGORY_CODES[category] || 'EV';

  // Sanitize entity name (e.g. "Kamar 101" -> "RM101", "Ruijie AP" -> "AP_KORIDOR")
  let sanitizedEntity = entityName
    .replace(/Kamar\s*/i, 'RM')
    .replace(/Lantai\s*/i, 'LT')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase();

  if (sanitizedEntity.length > 20) {
    sanitizedEntity = sanitizedEntity.slice(0, 20);
  }

  // Generate Timestamp: YYYYMMDD_HHMMSS
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

  // Clean extension
  const ext = extension.replace(/^\./, '').toLowerCase() || 'jpg';

  // Format: [BUILDING]_[CAT]_[ENTITY]_[TIMESTAMP].[ext]
  const fileName = `${shortCode}_${catCode}_${sanitizedEntity}_${timestamp}.${ext}`;

  // Folder path based on category
  let folderCategory = 'kamar';
  if (category === 'DEVICE_ASSET') folderCategory = 'perangkat-asset';
  else if (category === 'CCTV_CHECK') folderCategory = 'cctv';
  else if (category === 'FACILITY_CHECK') folderCategory = 'fasilitas-bersama';

  const folderPath = `evidence/${buildingSlug}/${folderCategory}/`;

  return { fileName, folderPath };
}

// Convert File/Blob to Base64
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Save Evidence into IndexedDB (with LocalStorage fallback)
export async function saveEvidenceItem(item: EvidenceMedia): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, fallback to localStorage', err);
    try {
      const current = JSON.parse(localStorage.getItem('siaga_it_evidence') || '[]');
      const filtered = current.filter((i: EvidenceMedia) => i.id !== item.id);
      filtered.push(item);
      localStorage.setItem('siaga_it_evidence', JSON.stringify(filtered));
    } catch (lsErr) {
      console.error('LocalStorage write failed:', lsErr);
    }
  }
}

// Get Evidence for specific Entity (Room, Device, CCTV, Facility)
export async function getEvidenceByEntity(entityId: string): Promise<EvidenceMedia[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('entityId');
      const req = index.getAll(entityId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current: EvidenceMedia[] = JSON.parse(localStorage.getItem('siaga_it_evidence') || '[]');
    return current.filter(i => i.entityId === entityId);
  }
}

// Get Evidence for Building
export async function getEvidenceByBuilding(buildingId: string): Promise<EvidenceMedia[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('buildingId');
      const req = index.getAll(buildingId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current: EvidenceMedia[] = JSON.parse(localStorage.getItem('siaga_it_evidence') || '[]');
    return current.filter(i => i.buildingId === buildingId);
  }
}

// Delete Evidence Item
export async function deleteEvidenceItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current: EvidenceMedia[] = JSON.parse(localStorage.getItem('siaga_it_evidence') || '[]');
    const updated = current.filter(i => i.id !== id);
    localStorage.setItem('siaga_it_evidence', JSON.stringify(updated));
  }
}

// Trigger Download with Auto-Renamed Filename
export function downloadEvidenceFile(item: EvidenceMedia): void {
  const link = document.createElement('a');
  link.href = item.fileUrl;
  link.download = item.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export structured Manifest JSON for Building Evidence
export async function exportEvidenceManifest(building: Building): Promise<void> {
  const items = await getEvidenceByBuilding(building.id);
  const manifest = {
    property: building.name,
    address: building.address,
    exportedAt: new Date().toISOString(),
    totalFiles: items.length,
    folderStructure: [
      `evidence/${getBuildingSlug(building.name)}/kamar/`,
      `evidence/${getBuildingSlug(building.name)}/perangkat-asset/`,
      `evidence/${getBuildingSlug(building.name)}/fasilitas-bersama/`,
      `evidence/${getBuildingSlug(building.name)}/cctv/`,
    ],
    evidenceFiles: items.map(item => ({
      id: item.id,
      fileName: item.fileName,
      folderPath: item.folderPath,
      fullVirtualPath: `${item.folderPath}${item.fileName}`,
      category: item.category,
      entityName: item.entityName,
      sizeBytes: item.sizeBytes,
      capturedAt: item.capturedAt,
      notes: item.notes || '',
    })),
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest, null, 2));
  const link = document.createElement('a');
  link.href = dataStr;
  link.download = `${getBuildingShortCode(building.name)}_EVIDENCE_MANIFEST_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Prepopulate initial demo evidence if DB is empty
export async function seedInitialDemoEvidence(buildings: Building[]): Promise<void> {
  try {
    const existing = await getEvidenceByBuilding('bld-tomang');
    if (existing && existing.length > 0) return;

    // SVG Demo Thumbnail Data URLs so engineers see real evidence right away
    const sampleSpeedtestSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%230f172a"/><text x="200" y="70" fill="%2338bdf8" font-size="22" font-family="monospace" text-anchor="middle" font-weight="bold">SPEEDTEST OOKLA</text><circle cx="200" cy="150" r="60" fill="none" stroke="%2310b981" stroke-width="8"/><text x="200" y="155" fill="%23ffffff" font-size="28" font-family="sans-serif" text-anchor="middle" font-weight="bold">68.4</text><text x="200" y="180" fill="%2394a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">Mbps Download</text><text x="200" y="240" fill="%2310b981" font-size="14" font-family="sans-serif" text-anchor="middle">PING 8ms • BIZNET FIBER</text></svg>`;

    const sampleTvSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%2318181b"/><rect x="40" y="40" width="320" height="190" rx="8" fill="%23000000" stroke="%233f3f46" stroke-width="4"/><text x="200" y="130" fill="%23ef4444" font-size="24" font-family="sans-serif" text-anchor="middle" font-weight="bold">YOUTUBE 4K LIVE</text><text x="200" y="160" fill="%23a1a1aa" font-size="13" font-family="sans-serif" text-anchor="middle">Streaming OK • Audio Sync Normal</text><rect x="180" y="235" width="40" height="25" fill="%2327272a"/></svg>`;

    const sampleAssetApSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%231e293b"/><circle cx="200" cy="130" r="70" fill="%23f8fafc" stroke="%2394a3b8" stroke-width="4"/><circle cx="200" cy="130" r="10" fill="%2322c55e"/><text x="200" y="240" fill="%23ffffff" font-size="15" font-family="monospace" text-anchor="middle" font-weight="bold">RUIJIE REYEE RG-RAP2200(E)</text><text x="200" y="265" fill="%2338bdf8" font-size="12" font-family="monospace" text-anchor="middle">SN: RJ-RAP-0214 • MAC: D8:0D:17:2A:3B:4C</text></svg>`;

    const tomang = buildings.find(b => b.id === 'bld-tomang') || buildings[0];

    const initialDemo: EvidenceMedia[] = [
      {
        id: 'ev-demo-1',
        buildingId: tomang.id,
        buildingSlug: 'rukita-tawakal-tomang',
        entityId: 'rm-101',
        entityName: 'Kamar 101',
        category: 'WIFI_SPEEDTEST',
        mediaType: 'image',
        fileUrl: sampleSpeedtestSvg,
        fileName: 'TMG_WIFI_SPD_RM101_20261025_101500.jpg',
        folderPath: 'evidence/rukita-tawakal-tomang/kamar/',
        originalName: 'speedtest_kamar101.jpg',
        sizeBytes: 42100,
        capturedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        notes: 'Speedtest tembus 68.4 Mbps di meja kerja kamar 101.',
      },
      {
        id: 'ev-demo-2',
        buildingId: tomang.id,
        buildingSlug: 'rukita-tawakal-tomang',
        entityId: 'rm-101',
        entityName: 'Kamar 101',
        category: 'TV_CHECK',
        mediaType: 'image',
        fileUrl: sampleTvSvg,
        fileName: 'TMG_TV_STREAM_RM101_20261025_102000.jpg',
        folderPath: 'evidence/rukita-tawakal-tomang/kamar/',
        originalName: 'tv_streaming_test.jpg',
        sizeBytes: 51200,
        capturedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        notes: 'Google TV 43 inch streaming YouTube 1080p jernih.',
      },
      {
        id: 'ev-demo-3',
        buildingId: tomang.id,
        buildingSlug: 'rukita-tawakal-tomang',
        entityId: 'dev-tmg-ap1',
        entityName: 'AP Wi-Fi Koridor Lt 1',
        category: 'DEVICE_ASSET',
        mediaType: 'image',
        fileUrl: sampleAssetApSvg,
        fileName: 'TMG_ASSET_LABEL_AP_KORIDOR_LT1_20261025_110000.jpg',
        folderPath: 'evidence/rukita-tawakal-tomang/perangkat-asset/',
        originalName: 'ap_plafon_sn.jpg',
        sizeBytes: 48900,
        capturedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        notes: 'Plafon depan kamar 102, LED hijau menyala normal, PoE aktif.',
      },
    ];

    for (const item of initialDemo) {
      await saveEvidenceItem(item);
    }
  } catch (err) {
    console.warn('Seeding initial demo evidence skipped:', err);
  }
}
