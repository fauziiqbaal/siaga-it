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
