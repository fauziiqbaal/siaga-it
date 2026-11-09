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

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

// Convert File/Blob to Base64
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Kompresi gambar di browser sebelum upload/simpan:
 * Me-resize gambar hingga max 1280px dan kompresi JPEG 0.8
 * Mengurangi ukuran dari 4-8 MB menjadi ~100-200 KB tanpa kehilangan detail dokumen!
 */
export async function compressImage(file: File | Blob, maxWidth = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      void fileToBase64(file).then(resolve);
      return;
    }
    if (file.type && !file.type.startsWith('image/')) {
      void fileToBase64(file).then(resolve);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Upload gambar Base64 ke server `serve.py` (tersimpan fisik di folder `data/uploads/`).
 * Mengembalikan path relatif misal `/api/uploads/img_xxx.jpg` yang bisa dibuka semua user.
 */
export async function uploadImageToServer(base64Data: string, fileName: string): Promise<string | null> {
  if (typeof fetch !== 'function' || !base64Data) return null;
  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64Data, fileName }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.ok && json.url ? (json.url as string) : null;
  } catch {
    return null;
  }
}

/** Tarik daftar bukti dari server untuk sinkronisasi antar perangkat. */
export async function pullEvidenceFromServer(): Promise<EvidenceMedia[]> {
  if (typeof fetch !== 'function') return [];
  try {
    const res = await fetch(`${API_BASE}/api/evidence`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.evidence) ? data.evidence : [];
  } catch {
    return [];
  }
}

/** Kirim bukti ke server. */
export async function pushEvidenceToServer(items: EvidenceMedia[]): Promise<boolean> {
  if (typeof fetch !== 'function' || items.length === 0) return false;
  try {
    const res = await fetch(`${API_BASE}/api/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidence: items }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Save Evidence into IndexedDB (with LocalStorage fallback) & Upload to Server
export async function saveEvidenceItem(item: EvidenceMedia): Promise<void> {
  let finalItem = { ...item };

  // Jika fileUrl masih base64, coba upload langsung ke server
  if (finalItem.fileUrl && finalItem.fileUrl.startsWith('data:')) {
    try {
      const serverUrl = await uploadImageToServer(finalItem.fileUrl, finalItem.fileName);
      if (serverUrl) {
        finalItem.fileUrl = serverUrl;
      }
    } catch (uploadErr) {
      console.warn('Gagal upload langsung ke server, simpan offline lokal:', uploadErr);
    }
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(finalItem);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, fallback to localStorage', err);
    try {
      const current = JSON.parse(localStorage.getItem('siaga_it_evidence') || '[]');
      const filtered = current.filter((i: EvidenceMedia) => i.id !== finalItem.id);
      filtered.push(finalItem);
      localStorage.setItem('siaga_it_evidence', JSON.stringify(filtered));
    } catch (lsErr) {
      console.error('LocalStorage write failed:', lsErr);
    }
  }

  // Kirim metadata bukti ke server agar HP/laptop lain mengenali item ini
  void pushEvidenceToServer([finalItem]);
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

// Get Evidence for Building (Menggabungkan IndexedDB lokal & Server uploads)
export async function getEvidenceByBuilding(buildingId: string): Promise<EvidenceMedia[]> {
  let localItems: EvidenceMedia[] = [];
  try {
    const db = await openDB();
    localItems = await new Promise<EvidenceMedia[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('buildingId');
      const req = index.getAll(buildingId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const current: EvidenceMedia[] = JSON.parse(localStorage.getItem('siaga_it_evidence') || '[]');
      localItems = current.filter(i => i.buildingId === buildingId);
    } catch {
      localItems = [];
    }
  }

  // Tarik bukti dari server untuk melengkapi foto yang diunggah teknisi/perangkat lain
  try {
    const serverItems = await pullEvidenceFromServer();
    const serverForBuilding = serverItems.filter(i => i.buildingId === buildingId);
    if (serverForBuilding.length > 0) {
      const map = new Map<string, EvidenceMedia>();
      for (const item of localItems) map.set(item.id, item);
      for (const item of serverForBuilding) {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        } else {
          // Jika server punya URL file server sementara lokal masih base64, pakai URL server
          const existing = map.get(item.id)!;
          if (item.fileUrl && !item.fileUrl.startsWith('data:') && existing.fileUrl.startsWith('data:')) {
            map.set(item.id, { ...existing, fileUrl: item.fileUrl });
          }
        }
      }
      return Array.from(map.values());
    }
  } catch {
    // Offline / server tidak tersedia: tetap pakai data lokal
  }

  return localItems;
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
