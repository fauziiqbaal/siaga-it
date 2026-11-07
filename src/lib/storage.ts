/**
 * Siaga IT — persistence layer.
 *
 * Why this exists:
 * The previous version kept every checklist in React state only (useState with
 * mock data). Any refresh / accidental browser-back wiped every QC entry.
 * Everything that must survive a refresh is now written through this module.
 *
 * Design rules:
 * 1. Never throw on read. Corrupt payload => fall back to the seed data.
 * 2. Never silently lose data on write. If localStorage quota is exceeded we do
 *    one sanitising retry (drop large inline base64 media, which already lives in
 *    IndexedDB) and report it to the UI instead of failing quietly.
 * 3. Versioned envelope so the schema can evolve without wiping user input.
 */

export const STORAGE_PREFIX = 'siaga_it_v2';
export const APP_DATA_VERSION = 2;

export interface StoredEnvelope<T> {
  v: number;
  savedAt: string;
  data: T;
}

export interface SaveResult {
  ok: boolean;
  savedAt: string;
  bytes: number;
  error?: string;
  notice?: string;
}

export const storageKey = (key: string) => `${STORAGE_PREFIX}:${key}`;

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface StorageHealth {
  available: boolean;
  /** Alasan singkat yang bisa ditampilkan ke teknisi. */
  reason?: string;
  checkedAt: string;
}

let healthCache: StorageHealth | null = null;

/**
 * Cek nyata: tulis → baca → hapus satu kunci probe.
 *
 * Kalau browser memblokir localStorage (mode privat, iframe ketat, atau file
 * dibuka lewat file://), semua input akan hilang saat refresh. Lebih baik
 * memberi tahu teknisi sejak awal daripada pura-pura "tersimpan".
 */
export function checkStorage(): StorageHealth {
  if (!isBrowser()) {
    return { available: false, reason: 'Penyimpanan browser tidak tersedia (mode server).', checkedAt: new Date().toISOString() };
  }

  if (typeof window.localStorage.getItem === 'function' && typeof window.localStorage.setItem === 'function') {
    try {
      const probeKey = storageKey('__probe');
      window.localStorage.setItem(probeKey, 'ok');
      const readBack = window.localStorage.getItem(probeKey);
      window.localStorage.removeItem(probeKey);
      healthCache = {
        available: readBack === 'ok',
        reason: readBack === 'ok' ? undefined : 'Browser menolak menulis data (storage diblokir).',
        checkedAt: new Date().toISOString(),
      };
      return healthCache;
    } catch (error) {
      console.warn('[storage] penyimpanan tidak bisa dipakai', error);
      healthCache = {
        available: false,
        reason: 'Penyimpanan browser diblokir / penuh (mode privat atau file://).',
        checkedAt: new Date().toISOString(),
      };
      return healthCache;
    }
  }

  return { available: false, reason: 'Penyimpanan browser tidak tersedia.', checkedAt: new Date().toISOString() };
}

/** Status penyimpanan yang sudah dihitung (dipakai shell untuk banner). */
export const getStorageHealth = (): StorageHealth => healthCache ?? checkStorage();


/** Read a value. Accepts both the wrapped envelope and legacy raw JSON. */
export function loadStored<T>(key: string, fallback: T, version = APP_DATA_VERSION): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || parsed === undefined) return fallback;

    if (typeof parsed === 'object' && parsed !== null && 'data' in (parsed as object)) {
      const envelope = parsed as StoredEnvelope<T>;
      if (envelope.data === undefined || envelope.data === null) return fallback;
      if (envelope.v !== version) {
        // Data dari versi skema lama tetap dipakai (tidak menghapus input teknisi).
        console.info(`[storage] "${key}" dimigrasikan dari v${envelope.v} ke v${version}.`);
      }
      return envelope.data;
    }

    // Legacy / hand-edited payload stored without the envelope.
    return parsed as T;
  } catch (error) {
    console.warn(`[storage] gagal membaca "${key}", memakai data awal.`, error);
    return fallback;
  }
}

/**
 * Replace long inline data URLs (base64 photos) with an empty string.
 * Photos are kept in IndexedDB (evidenceStorage) so we never need the heavy
 * duplicate inside the building JSON.
 */
function stripHeavyMedia(value: unknown, counter: { stripped: number }): unknown {
  const MAX_INLINE = 120000;

  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.length > MAX_INLINE) {
      counter.stripped += 1;
      return '';
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => stripHeavyMedia(item, counter));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = stripHeavyMedia(item, counter);
    }
    return out;
  }
  return value;
}

export function saveStored<T>(key: string, data: T, version = APP_DATA_VERSION): SaveResult {
  const savedAt = new Date().toISOString();
  if (!isBrowser()) {
    return { ok: false, savedAt, bytes: 0, error: 'Penyimpanan browser tidak tersedia.' };
  }

  const write = (payload: T) => {
    const envelope: StoredEnvelope<T> = { v: version, savedAt, data: payload };
    const serialised = JSON.stringify(envelope);
    window.localStorage.setItem(storageKey(key), serialised);
    return serialised.length;
  };

  try {
    const bytes = write(data);
    return { ok: true, savedAt, bytes };
  } catch (firstError) {
    // QuotaExceededError -> retry once without inline photos so the checklist
    // text (the actual QC data) is never lost.
    try {
      const counter = { stripped: 0 };
      const lightweight = stripHeavyMedia(data, counter) as T;
      const bytes = write(lightweight);
      return {
        ok: true,
        savedAt,
        bytes,
        notice:
          counter.stripped > 0
            ? `Penyimpanan penuh. ${counter.stripped} lampiran foto besar tidak disertakan (foto tetap ada di Bukti QC).`
            : 'Penyimpanan penuh, data disimpan dalam bentuk ringkas.',
      };
    } catch (secondError) {
      console.error(`[storage] gagal menyimpan "${key}"`, secondError, firstError);
      return {
        ok: false,
        savedAt,
        bytes: 0,
        error:
          'Gagal menyimpan ke browser (penyimpanan penuh / mode privat). Ekspor data dulu dari menu Lain.',
      };
    }
  }
}

export function removeStored(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch (error) {
    console.warn(`[storage] gagal menghapus "${key}"`, error);
  }
}

export function listStoredKeys(): string[] {
  if (!isBrowser()) return [];
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(`${STORAGE_PREFIX}:`)) keys.push(key);
  }
  return keys.sort();
}

export function getStorageUsage(): { usedKb: number; quotaKb: number; percent: number } {
  let usedBytes = 0;
  if (isBrowser()) {
    for (const key of listStoredKeys()) {
      usedBytes += (window.localStorage.getItem(key) || '').length;
    }
  }
  // ~5 MB is the common localStorage quota per origin.
  const quotaBytes = 5 * 1024 * 1024;
  return {
    usedKb: Math.round(usedBytes / 1024),
    quotaKb: Math.round(quotaBytes / 1024),
    percent: Math.min(100, Math.round((usedBytes / quotaBytes) * 100)),
  };
}

/** Download the whole app state as a JSON backup file. */
export function downloadJson(fileName: string, payload: unknown) {
  if (!isBrowser()) return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read a JSON backup file selected by the user. */
export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

