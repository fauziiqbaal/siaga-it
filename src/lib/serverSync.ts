import type { Building, ColivingIssue, SimpleUser } from '../types/hotel';

/**
 * Sinkronisasi JSON antar perangkat (opsional).
 *
 * Model v3 (sejak `rev` per gedung):
 * - Unit sinkron = SATU gedung + kendala gedung itu. Menyimpan gedung A tidak
 *   pernah menulis ulang gedung B milik teknisi lain.
 * - Server menaikkan `rev` setiap simpan. Klien mengirim `baseRev` (revisi yang
 *   terakhir ia lihat); kalau server sudah lebih baru, server menjawab 409.
 * - Hapus gedung punya endpoint sendiri (DELETE), bukan "gedung tidak dikirim".
 *
 * Server kecil ada di `serve.py` (tanpa dependency). Kalau server tidak jalan
 * (mis. dibuka lewat `vite preview` atau file lokal), semua fungsi di sini gagal
 * dengan tenang dan aplikasi tetap memakai localStorage seperti biasa.
 */

export interface SyncSnapshot {
  app?: string;
  version?: number;
  savedAt?: string;
  buildings: Building[];
  issues: ColivingIssue[];
  users?: SimpleUser[];
}

export type SyncState = 'checking' | 'offline' | 'synced' | 'saving' | 'error' | 'conflict';

const HEALTH_TIMEOUT = 2500;
const PUSH_TIMEOUT = 6000;

/**
 * Di APK Android, halaman berjalan dari https://localhost sehingga `/api` relatif
 * tidak menuju serve.py. Isi `VITE_API_BASE` saat build, contoh:
 *   VITE_API_BASE=http://192.168.1.10:5173 npm run build && npx cap sync android
 * Kosong = pakai origin yang sama (web biasa).
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');
const apiUrl = (path: string) => `${API_BASE}${path}`;

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = HEALTH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

export interface ServerHealth {
  available: boolean;
  updatedAt: string | null;
  buildings: number;
  dataFile?: string;
  /** Versi protokol sinkron di server (3 = simpan per properti). */
  syncVersion?: number;
}

export async function probeServer(): Promise<ServerHealth> {
  if (typeof fetch !== 'function') return { available: false, updatedAt: null, buildings: 0 };
  try {
    const response = await fetchWithTimeout(apiUrl('/api/health'), { headers: { Accept: 'application/json' } });
    if (!response.ok) return { available: false, updatedAt: null, buildings: 0 };
    const data = (await response.json()) as {
      ok?: boolean;
      updatedAt?: string | null;
      buildings?: number;
      dataFile?: string;
      syncVersion?: number;
    };
    return {
      available: data?.ok === true,
      updatedAt: data?.updatedAt ?? null,
      buildings: Number(data?.buildings ?? 0),
      dataFile: data?.dataFile,
      syncVersion: typeof data?.syncVersion === 'number' ? data.syncVersion : undefined,
    };
  } catch {
    return { available: false, updatedAt: null, buildings: 0 };
  }
}

export interface PullResult {
  ok: boolean;
  /** Status HTTP (204 = server belum punya data, 0 = tidak ada respons). */
  status: number;
  snapshot: SyncSnapshot | null;
}

export async function pullSnapshot(): Promise<PullResult> {
  if (typeof fetch !== 'function') return { ok: false, status: 0, snapshot: null };
  try {
    const response = await fetchWithTimeout(apiUrl('/api/state'));
    if (response.status === 204) return { ok: true, status: 204, snapshot: null };
    if (!response.ok) return { ok: false, status: response.status, snapshot: null };
    const data = (await response.json()) as SyncSnapshot;
    if (!data || !Array.isArray(data.buildings)) return { ok: false, status: response.status, snapshot: null };
    return { ok: true, status: response.status, snapshot: data };
  } catch {
    return { ok: false, status: 0, snapshot: null };
  }
}

export interface PushBuildingResult {
  ok: boolean;
  /** Server sudah punya revisi lebih baru (perubahan teknisi lain). */
  conflict?: boolean;
  rev?: number;
  updatedAt?: string;
  savedAt?: string;
  /** Status HTTP saat gagal (0 = tidak ada respons / server mati). */
  status?: number;
  /** Pesan error dari server, kalau ada. */
  error?: string;
  /** Versi server saat konflik — dipakai untuk mencadangkan sebelum ditimpa. */
  serverBuilding?: Building;
  serverIssues?: ColivingIssue[];
}

export interface PushBuildingArgs {
  building: Building;
  issues: ColivingIssue[];
  /** Revisi server yang terakhir dilihat klien (null = gedung baru). */
  baseRev: number | null;
  /** Timpa walau revisi sudah bergeser (last-write-wins per gedung). */
  force?: boolean;
}

/**
 * Simpan satu gedung (+ kendala gedung itu) ke server.
 * Gedung/properti lain di server tidak disentuh.
 */
export async function pushBuilding({
  building,
  issues,
  baseRev,
  force = false,
}: PushBuildingArgs): Promise<PushBuildingResult> {
  if (typeof fetch !== 'function') return { ok: false };
  try {
    const response = await fetchWithTimeout(
      apiUrl(`/api/buildings/${encodeURIComponent(building.id)}`),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building, issues, baseRev, force }),
      },
      PUSH_TIMEOUT,
    );

    if (response.status === 409) {
      const data = (await response.json().catch(() => null)) as
        | { rev?: number; savedAt?: string; building?: Building; issues?: ColivingIssue[] }
        | null;
      return {
        ok: false,
        conflict: true,
        rev: typeof data?.rev === 'number' ? data.rev : undefined,
        savedAt: data?.savedAt,
        serverBuilding: data?.building,
        serverIssues: Array.isArray(data?.issues) ? data.issues : undefined,
      };
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, status: response.status, error: data?.error };
    }
    const data = (await response.json()) as {
      ok?: boolean;
      rev?: number;
      updatedAt?: string;
      savedAt?: string;
    };
    return {
      ok: data?.ok === true,
      rev: typeof data?.rev === 'number' ? data.rev : undefined,
      updatedAt: data?.updatedAt,
      savedAt: data?.savedAt,
    };
  } catch {
    // Tidak ada respons sama sekali (server mati / jaringan putus / CORS).
    return { ok: false, status: 0 };
  }
}

/** Hapus satu gedung + kendalanya di server (tidak memengaruhi gedung lain). */
export async function deleteBuildingRemote(
  buildingId: string,
): Promise<{ ok: boolean; status?: number }> {
  if (typeof fetch !== 'function') return { ok: false, status: 0 };
  try {
    const response = await fetchWithTimeout(
      apiUrl(`/api/buildings/${encodeURIComponent(buildingId)}?force=1`),
      { method: 'DELETE' },
      PUSH_TIMEOUT,
    );
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Simpan seluruh daftar user ke server agar tersinkron ke handphone/perangkat lain. */
export async function pushUsers(users: SimpleUser[]): Promise<{ ok: boolean; status: number }> {
  if (typeof fetch !== 'function') return { ok: false, status: 0 };
  try {
    const response = await fetchWithTimeout(
      apiUrl('/api/users'),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      },
      PUSH_TIMEOUT,
    );
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Tarik daftar user terbaru dari server. */
export async function pullUsers(): Promise<{ ok: boolean; users: SimpleUser[] | null }> {
  if (typeof fetch !== 'function') return { ok: false, users: null };
  try {
    const response = await fetchWithTimeout(apiUrl('/api/users'));
    if (!response.ok) return { ok: false, users: null };
    const data = await response.json();
    if (data?.ok && Array.isArray(data.users)) {
      return { ok: true, users: data.users };
    }
    return { ok: false, users: null };
  } catch {
    return { ok: false, users: null };
  }
}
