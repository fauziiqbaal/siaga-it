import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Building, ColivingIssue } from '../types/hotel';
import { deleteBuildingRemote, probeServer, pullSnapshot, pushBuilding } from '../lib/serverSync';
import type { PushBuildingResult, SyncSnapshot, SyncState } from '../lib/serverSync';
import { usePersistentState } from './usePersistentState';

/**
 * Sinkronisasi per gedung (kontrak ada di `src/lib/serverSync.ts`).
 *
 * 1. Yang dikirim ke server hanya gedung yang benar-benar berubah (fingerprint
 *    berbeda). Properti lain tidak pernah ikut ditulis, jadi dua teknisi di
 *    properti berbeda tidak saling menimpa.
 * 2. `baseRev` = revisi server yang terakhir dilihat. Kalau server sudah lebih
 *    baru (409), versi server dicadangkan di browser ini lalu versi lokal yang
 *    disimpan (last-write-wins PER GEDUNG) dan badge menampilkan konflik.
 * 3. Perubahan teknisi lain ditarik otomatis (tiap 60 detik / saat aplikasi
 *    kembali aktif) dan digabung per gedung; gedung yang sedang diedit di
 *    perangkat ini tidak ditimpa.
 * 4. Hapus gedung dikirim lewat DELETE per gedung. Kalau server sedang mati,
 *    id-nya disimpan sebagai tombstone dan dikirim pada kesempatan berikut.
 */

export interface SyncConflictBackup {
  at: string;
  building: Building;
  issues: ColivingIssue[];
}

export type ConflictBackups = Record<string, SyncConflictBackup>;

/** Hasil satu aksi sinkron manual — dipakai untuk memberi tahu teknisi. */
export interface SyncReport {
  ok: boolean;
  /** Kalimat siap tampil, mis. "Berhasil. 2 properti terkirim." */
  message: string;
  pushed: number;
  deleted: number;
  pulled: number;
  conflicts: number;
}

export interface ServerSyncInfo {
  state: SyncState;
  serverAvailable: boolean;
  lastSyncedAt: string | null;
  dataFile?: string;
  /** Versi protokol sinkron yang dilaporkan server (3 = simpan per properti). */
  serverVersion?: number;
  /** Jumlah gedung yang pernah bentrok dalam 24 jam terakhir. */
  conflictCount: number;
  syncNow: () => Promise<SyncReport>;
  pullNow: () => Promise<SyncReport>;
  /** Lupakan baseline sinkron (reset lokal / impor backup) tanpa menghapus server. */
  resetBaseline: () => void;
}

interface PushOutcome {
  ok: boolean;
  pushed: number;
  deleted: number;
  conflicts: number;
  /** Siklus lain sedang berjalan; minta user mencoba lagi. */
  busy?: boolean;
  /** Status HTTP kegagalan (0 = server tidak merespons). */
  status?: number;
  error?: string;
}

interface PullOutcome {
  ok: boolean;
  /** Jumlah properti di server saat ditarik. */
  pulled: number;
  /** Jumlah properti yang ditambahkan / diganti dari server. */
  adopted: number;
  busy?: boolean;
  status?: number;
}

interface Args {
  buildings: Building[];
  issues: ColivingIssue[];
  /** Terapkan hasil gabungan server (adopsi awal / tarik manual). */
  onAdopt: (snapshot: SyncSnapshot) => void;
  /** Tulis balik `rev`/`updatedAt` yang ditetapkan server ke state lokal. */
  onAck: (patch: Record<string, { rev: number; updatedAt?: string }>) => void;
}

const PUSH_DEBOUNCE_MS = 1200;
const PULL_INTERVAL_MS = 60_000;
const CONFLICT_TTL_MS = 24 * 60 * 60 * 1000;

/** Isi gedung tanpa metadata sinkron (rev/updatedAt bukan data QC). */
const stripSyncMeta = (building: Building) => {
  const clone: Record<string, unknown> = { ...building };
  delete clone.rev;
  delete clone.updatedAt;
  return clone;
};

const issuesOf = (issues: ColivingIssue[], buildingId: string) =>
  issues.filter((issue) => issue.buildingId === buildingId).sort((a, b) => a.id.localeCompare(b.id));

/** Sidik jari isi gedung + kendalanya: dipakai untuk tahu apa yang perlu dikirim. */
const fingerprint = (building: Building, issues: ColivingIssue[]) =>
  JSON.stringify({ b: stripSyncMeta(building), i: issues });

/** Tanda versi daftar gedung: berubah kalau ada gedung baru atau revisi baru. */
const signature = (buildings: Building[]) =>
  buildings.map((building) => `${building.id}@${building.rev ?? 0}`).join('|');

const pruneConflicts = (source: ConflictBackups): ConflictBackups => {
  const now = Date.now();
  const next: ConflictBackups = {};
  for (const [id, entry] of Object.entries(source)) {
    const at = Date.parse(entry?.at ?? '');
    if (Number.isNaN(at) || now - at < CONFLICT_TTL_MS) next[id] = entry;
  }
  return next;
};

/**
 * Terjemahkan kegagalan HTTP jadi kalimat yang bisa langsung ditindaklanjuti
 * teknisi (bukan sekadar "gagal").
 */
const describeHttpFailure = (status: number | undefined, error: string | undefined, action: string): string => {
  if (!status) {
    return 'Server tidak merespons. Pastikan "python serve.py" masih berjalan dan perangkat masih tersambung ke jaringan yang sama, lalu coba lagi.';
  }
  if (status === 404) {
    return 'Server yang berjalan masih versi lama (belum punya endpoint /api/buildings). Tutup jendela "python serve.py", jalankan lagi, lalu muat ulang halaman ini.';
  }
  if (status === 400) {
    return `Server menolak data (HTTP 400)${error ? `: ${error}` : ''}. Data tetap tersimpan di browser ini — coba kirim ulang; kalau berulang, periksa ukuran lampiran foto.`;
  }
  if (status >= 500) {
    return `Server error (HTTP ${status}). Lihat jendela "python serve.py" untuk detail; data tetap aman di browser ini.`;
  }
  return `${action} gagal (HTTP ${status})${error ? `: ${error}` : ''}. Data tetap tersimpan di browser ini.`;
};

export function useServerSync({ buildings, issues, onAdopt, onAck }: Args): ServerSyncInfo {
  const [state, setState] = useState<SyncState>('checking');
  const [serverAvailable, setServerAvailable] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [dataFile, setDataFile] = useState<string | undefined>(undefined);
  const [serverVersion, setServerVersion] = useState<number | undefined>(undefined);

  const tombstones = usePersistentState<Record<string, string>>('sync_tombstones', {});
  const conflictBackups = usePersistentState<ConflictBackups>('sync_conflict_backup', {});

  const buildingsRef = useRef(buildings);
  const issuesRef = useRef(issues);
  const onAdoptRef = useRef(onAdopt);
  const onAckRef = useRef(onAck);
  const tombstonesRef = useRef(tombstones.value);
  const conflictRef = useRef(conflictBackups.value);
  const setTombstonesRef = useRef(tombstones.setValue);
  const setConflictRef = useRef(conflictBackups.setValue);
  const pushRef = useRef<() => Promise<PushOutcome>>(async () => ({
    ok: false,
    pushed: 0,
    deleted: 0,
    conflicts: 0,
  }));
  /** Versi protokol sinkron yang dilaporkan server (undefined = server lama). */
  const serverVersionRef = useRef<number | undefined>(undefined);

  /** Sidik jari isi gedung yang terakhir sudah diterima server. */
  const syncedRef = useRef<Map<string, string>>(new Map());
  /** Gedung yang baru diadopsi dari server tapi belum masuk state React. */
  const adoptedPendingRef = useRef<Set<string>>(new Set());
  const availableRef = useRef(false);
  const readyRef = useRef(false);
  const busyRef = useRef(false);
  const queuedRef = useRef(false);

  useEffect(() => {
    buildingsRef.current = buildings;
    issuesRef.current = issues;
    // Baseline gedung hasil adopsi dihitung dari data yang BENAR-BENAR masuk
    // state (setelah migrasi lokal App), supaya adopsi tidak dianggap "berubah"
    // dan langsung dikirim balik menimpa perubahan teknisi lain.
    if (adoptedPendingRef.current.size > 0) {
      for (const building of buildings) {
        if (!adoptedPendingRef.current.has(building.id)) continue;
        syncedRef.current.set(building.id, fingerprint(building, issuesOf(issues, building.id)));
        adoptedPendingRef.current.delete(building.id);
      }
    }
  }, [buildings, issues]);

  // Gedung yang sudah pernah tersinkron lalu hilang dari state lokal = dihapus
  // teknisi. Dicatat sebagai tombstone agar tetap terkirim walau server mati
  // saat penghapusan dilakukan.
  useEffect(() => {
    const synced = syncedRef.current;
    if (synced.size === 0) return;
    const ids = new Set(buildings.map((building) => building.id));
    const removed = [...synced.keys()].filter(
      (id) => !ids.has(id) && !adoptedPendingRef.current.has(id) && !tombstonesRef.current[id],
    );
    if (removed.length === 0) return;
    const stamped = new Date().toISOString();
    const next = { ...tombstonesRef.current };
    for (const id of removed) next[id] = stamped;
    tombstonesRef.current = next;
    setTombstonesRef.current(next);
  }, [buildings]);

  useEffect(() => {
    onAdoptRef.current = onAdopt;
  }, [onAdopt]);

  useEffect(() => {
    onAckRef.current = onAck;
  }, [onAck]);

  useEffect(() => {
    tombstonesRef.current = tombstones.value;
    setTombstonesRef.current = tombstones.setValue;
  }, [tombstones.value, tombstones.setValue]);

  useEffect(() => {
    conflictRef.current = conflictBackups.value;
    setConflictRef.current = conflictBackups.setValue;
  }, [conflictBackups.value, conflictBackups.setValue]);

  // Catatan konflik lebih dari 24 jam dibuang (sekali saat aplikasi dibuka).
  useEffect(() => {
    const pruned = pruneConflicts(conflictRef.current);
    if (Object.keys(pruned).length !== Object.keys(conflictRef.current).length) {
      conflictRef.current = pruned;
      setConflictRef.current(pruned);
    }
  }, []);

  const conflictCount = useMemo(
    () => Object.keys(pruneConflicts(conflictBackups.value)).length,
    [conflictBackups.value],
  );

  const recordConflict = useCallback((building: Building, result: PushBuildingResult) => {
    if (!result.serverBuilding) return;
    const next = pruneConflicts(conflictRef.current);
    next[building.id] = {
      at: new Date().toISOString(),
      building: result.serverBuilding,
      issues: result.serverIssues ?? [],
    };
    conflictRef.current = next;
    setConflictRef.current(next);
  }, []);

  /**
   * Kirim ke server HANYA gedung yang berubah / terhapus. Snapshot utuh tidak
   * pernah dikirim, jadi properti teknisi lain tidak ikut tertimpa.
   */
  const pushDirty = useCallback(async (): Promise<PushOutcome> => {
    const idle: PushOutcome = { ok: true, pushed: 0, deleted: 0, conflicts: 0 };
    if (!availableRef.current) return { ...idle, ok: false };
    if (busyRef.current) {
      // Ada perubahan saat siklus lain berjalan -> ulangi setelah selesai.
      queuedRef.current = true;
      return { ...idle, ok: false, busy: true };
    }

    const localBuildings = buildingsRef.current;
    const localIssues = issuesRef.current;
    const synced = syncedRef.current;

    const pending = localBuildings.filter(
      (building) => synced.get(building.id) !== fingerprint(building, issuesOf(localIssues, building.id)),
    );

    // Tombstone (gedung yang dihapus teknisi) sudah dicatat efek `[buildings]`.
    let tombstonesNow = tombstonesRef.current;
    const deleteIds = Object.keys(tombstonesNow);

    if (pending.length === 0 && deleteIds.length === 0) {
      setState('synced');
      return idle;
    }

    busyRef.current = true;
    setState('saving');
    let pushed = 0;
    let deleted = 0;
    let conflictHit = 0;
    const ack: Record<string, { rev: number; updatedAt?: string }> = {};

    try {
      for (const building of pending) {
        const buildingIssues = issuesOf(localIssues, building.id);
        const baseRev = typeof building.rev === 'number' ? building.rev : null;
        let result = await pushBuilding({ building, issues: buildingIssues, baseRev });

        if (result.conflict) {
          // Versi server tidak dibuang: dicadangkan dulu, lalu versi lokal yang
          // barusan diedit menang untuk gedung ini (last-write-wins per gedung).
          conflictHit += 1;
          recordConflict(building, result);
          result = await pushBuilding({
            building,
            issues: buildingIssues,
            baseRev: result.rev ?? null,
            force: true,
          });
        }

        if (!result.ok || typeof result.rev !== 'number') {
          setState('error');
          return {
            ok: false,
            pushed,
            deleted,
            conflicts: conflictHit,
            status: result.status,
            error: result.error,
          };
        }

        pushed += 1;
        synced.set(building.id, fingerprint(building, buildingIssues));
        ack[building.id] = { rev: result.rev, updatedAt: result.updatedAt };
        if (result.savedAt) setLastSyncedAt(result.savedAt);

        if (tombstonesNow[building.id]) {
          tombstonesNow = { ...tombstonesNow };
          delete tombstonesNow[building.id];
          tombstonesRef.current = tombstonesNow;
          setTombstonesRef.current(tombstonesNow);
        }
      }

      // Dibaca ulang dari ref: tombstone gedung yang barusan dipulihkan (mis.
      // hasil impor backup) sudah dibuang di loop atas — jangan ikut dihapus.
      const pendingDeletes = Object.keys(tombstonesRef.current);
      if (pendingDeletes.length > 0) {
        const remaining = { ...tombstonesRef.current };
        for (const id of pendingDeletes) {
          const done = await deleteBuildingRemote(id);
          if (!done.ok) continue;
          delete remaining[id];
          synced.delete(id);
          deleted += 1;
        }
        tombstonesRef.current = remaining;
        setTombstonesRef.current(remaining);
      }

      if (Object.keys(ack).length > 0) onAckRef.current(ack);
      setState(conflictHit > 0 ? 'conflict' : 'synced');
      return { ok: true, pushed, deleted, conflicts: conflictHit };
    } finally {
      busyRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        window.setTimeout(() => {
          void pushRef.current();
        }, 0);
      }
    }
  }, [recordConflict]);

  useEffect(() => {
    pushRef.current = pushDirty;
  }, [pushDirty]);

  /** Tarik server lalu gabung per gedung (default) atau timpa lokal (manual). */
  const pullAndMerge = useCallback(async (mode: 'merge' | 'force' = 'merge'): Promise<PullOutcome> => {
    const pulled = await pullSnapshot();
    const snapshot = pulled.snapshot;
    if (!snapshot) {
      // 204 = server hidup tapi belum punya data (bukan kegagalan).
      if (availableRef.current && pulled.ok) setState('synced');
      return { ok: pulled.ok, pulled: 0, adopted: 0, status: pulled.status };
    }

    const serverBuildings = snapshot.buildings;
    const serverIssues = snapshot.issues ?? [];
    const savedAt = snapshot.savedAt ?? new Date().toISOString();

    // "Tarik dari server" (manual): server menang, tombstone lokal dibuang.
    if (mode === 'force') {
      syncedRef.current = new Map();
      adoptedPendingRef.current = new Set(serverBuildings.map((building) => building.id));
      if (Object.keys(tombstonesRef.current).length > 0) {
        tombstonesRef.current = {};
        setTombstonesRef.current({});
      }
      onAdoptRef.current({ ...snapshot, buildings: serverBuildings, issues: serverIssues });
      setLastSyncedAt(savedAt);
      setState('synced');
      return { ok: true, pulled: serverBuildings.length, adopted: serverBuildings.length };
    }

    if (busyRef.current) return { ok: false, pulled: serverBuildings.length, adopted: 0, busy: true };

    const localBuildings = buildingsRef.current;
    const localIssues = issuesRef.current;
    const localById = new Map(localBuildings.map((building) => [building.id, building]));
    const tombstonesNow = tombstonesRef.current;

    const mergedBuildings: Building[] = [];
    const mergedIssues: ColivingIssue[] = [];
    let adopted = 0;

    for (const serverBuilding of serverBuildings) {
      // Sudah dihapus teknisi di perangkat ini -> jangan dihidupkan lagi.
      if (tombstonesNow[serverBuilding.id]) continue;

      const serverBuildingIssues = issuesOf(serverIssues, serverBuilding.id);
      const localBuilding = localById.get(serverBuilding.id);

      if (!localBuilding) {
        // Dulu sudah tersinkron lalu hilang dari lokal = dihapus teknisi:
        // jangan dihidupkan lagi (penghapusannya dikirim siklus berikut).
        if (syncedRef.current.has(serverBuilding.id) && !adoptedPendingRef.current.has(serverBuilding.id)) {
          continue;
        }
        mergedBuildings.push(serverBuilding);
        mergedIssues.push(...serverBuildingIssues);
        adoptedPendingRef.current.add(serverBuilding.id);
        adopted += 1;
        continue;
      }

      const localBuildingIssues = issuesOf(localIssues, serverBuilding.id);
      const localPrint = fingerprint(localBuilding, localBuildingIssues);
      const dirty = syncedRef.current.get(serverBuilding.id) !== localPrint;
      const serverNewer = (serverBuilding.rev ?? 0) > (localBuilding.rev ?? 0);

      if (!dirty && serverNewer) {
        mergedBuildings.push(serverBuilding);
        mergedIssues.push(...serverBuildingIssues);
        adoptedPendingRef.current.add(serverBuilding.id);
        adopted += 1;
        continue;
      }

      // Sedang diedit di perangkat ini -> lokal menang, dikirim siklus berikut.
      mergedBuildings.push(localBuilding);
      mergedIssues.push(...localBuildingIssues);
      if (!dirty) syncedRef.current.set(serverBuilding.id, localPrint);
    }

    const mergedIds = new Set(mergedBuildings.map((building) => building.id));
    for (const localBuilding of localBuildings) {
      if (mergedIds.has(localBuilding.id)) continue;
      mergedBuildings.push(localBuilding);
      mergedIssues.push(...issuesOf(localIssues, localBuilding.id));
    }

    if (signature(mergedBuildings) !== signature(localBuildings)) {
      onAdoptRef.current({ buildings: mergedBuildings, issues: mergedIssues, savedAt });
    }
    setLastSyncedAt(savedAt);
    return { ok: true, pulled: serverBuildings.length, adopted };
  }, []);

  // Buka aplikasi: cek server -> gabung data server -> kirim yang lokal saja.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const health = await probeServer();
      if (cancelled) return;

      availableRef.current = health.available;
      serverVersionRef.current = health.syncVersion;
      setServerAvailable(health.available);
      setServerVersion(health.syncVersion);
      setDataFile(health.dataFile);

      if (!health.available) {
        setState('offline');
        readyRef.current = true;
        return;
      }

      await pullAndMerge('merge');
      if (cancelled) return;
      readyRef.current = true;
      await pushDirty();
    })();

    return () => {
      cancelled = true;
    };
  }, [pullAndMerge, pushDirty]);

  // Setiap perubahan lokal -> kirim gedung yang berubah saja (debounce).
  useEffect(() => {
    if (!serverAvailable || !readyRef.current) return;
    const timer = window.setTimeout(() => {
      void pushDirty();
    }, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [buildings, issues, serverAvailable, pushDirty]);

  // Perubahan teknisi lain: tarik berkala + saat aplikasi kembali aktif.
  useEffect(() => {
    if (!serverAvailable) return;
    const pullIfVisible = () => {
      if (document.visibilityState === 'visible') void pullAndMerge('merge');
    };
    const pullOnFocus = () => {
      void pullAndMerge('merge');
    };
    const timer = window.setInterval(pullIfVisible, PULL_INTERVAL_MS);
    document.addEventListener('visibilitychange', pullIfVisible);
    window.addEventListener('focus', pullOnFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pullIfVisible);
      window.removeEventListener('focus', pullOnFocus);
    };
  }, [serverAvailable, pullAndMerge]);

  const syncNow = useCallback(async (): Promise<SyncReport> => {
    if (!availableRef.current) {
      return {
        ok: false,
        message:
          'Server tidak aktif. Jalankan "python serve.py" lalu buka lewat alamat server — data tetap aman di browser ini.',
        pushed: 0,
        deleted: 0,
        pulled: 0,
        conflicts: 0,
      };
    }

    // Server lama (belum paham simpan per properti) -> jelaskan, jangan gagal misterius.
    if (typeof serverVersionRef.current === 'number' && serverVersionRef.current < 3) {
      return {
        ok: false,
        message:
          'Server yang terhubung masih versi lama (belum bisa simpan per properti). Tutup jendela "python serve.py", jalankan lagi, lalu muat ulang halaman ini.',
        pushed: 0,
        deleted: 0,
        pulled: 0,
        conflicts: 0,
      };
    }

    const push = await pushDirty();
    if (push.busy) {
      return {
        ok: false,
        message: 'Sinkron lain sedang berjalan. Tunggu sebentar lalu klik lagi.',
        pushed: 0,
        deleted: 0,
        pulled: 0,
        conflicts: 0,
      };
    }
    if (!push.ok) {
      return {
        ok: false,
        message: describeHttpFailure(push.status, push.error, 'Kirim ke server'),
        pushed: push.pushed,
        deleted: push.deleted,
        pulled: 0,
        conflicts: push.conflicts,
      };
    }

    const pull = await pullAndMerge('merge');
    if (!pull.ok) {
      // Kirim sukses tapi verifikasi ulang gagal (server mati di tengah jalan).
      const detail = describeHttpFailure(pull.status, undefined, 'Verifikasi ke server');
      return {
        ok: false,
        message:
          push.pushed > 0 || push.deleted > 0
            ? `Terkirim ${push.pushed} properti, tetapi verifikasi ulang gagal. ${detail}`
            : detail,
        pushed: push.pushed,
        deleted: push.deleted,
        pulled: 0,
        conflicts: push.conflicts,
      };
    }

    const parts: string[] = [];
    if (push.pushed > 0) parts.push(`${push.pushed} properti terkirim`);
    if (push.deleted > 0) parts.push(`${push.deleted} properti terhapus`);
    if (pull.adopted > 0) parts.push(`${pull.adopted} properti diperbarui dari server`);
    if (push.conflicts > 0) parts.push(`${push.conflicts} bentrok — versi server dicadangkan`);

    return {
      ok: true,
      message:
        parts.length > 0 ? `Berhasil. ${parts.join(' · ')}.` : 'Berhasil. Semua properti sudah sama dengan server.',
      pushed: push.pushed,
      deleted: push.deleted,
      pulled: pull.pulled,
      conflicts: push.conflicts,
    };
  }, [pushDirty, pullAndMerge]);

  const pullNow = useCallback(async (): Promise<SyncReport> => {
    const pull = await pullAndMerge('force');
    if (pull.busy) {
      return {
        ok: false,
        message: 'Sinkron lain sedang berjalan. Tunggu sebentar lalu klik lagi.',
        pushed: 0,
        deleted: 0,
        pulled: 0,
        conflicts: 0,
      };
    }
    if (!pull.ok) {
      return {
        ok: false,
        message: describeHttpFailure(pull.status, undefined, 'Tarik dari server'),
        pushed: 0,
        deleted: 0,
        pulled: 0,
        conflicts: 0,
      };
    }
    return {
      ok: true,
      message:
        pull.pulled > 0
          ? `Berhasil. ${pull.pulled} properti ditarik dari server (data di perangkat ini diganti versi server).`
          : 'Berhasil, tetapi server belum punya data properti untuk ditarik.',
      pushed: 0,
      deleted: 0,
      pulled: pull.pulled,
      conflicts: 0,
    };
  }, [pullAndMerge]);

  /**
   * "Reset data lokal" / impor backup mengganti seluruh daftar gedung. Baseline
   * sinkron dilupakan supaya penghapusan lokal TIDAK ikut menghapus properti di
   * server (server hanya menerima tambahan/perubahan, bukan penghapusan massal).
   */
  const resetBaseline = useCallback(() => {
    syncedRef.current = new Map();
    adoptedPendingRef.current = new Set();
    if (Object.keys(tombstonesRef.current).length > 0) {
      tombstonesRef.current = {};
      setTombstonesRef.current({});
    }
  }, []);

  return {
    state,
    serverAvailable,
    lastSyncedAt,
    dataFile,
    serverVersion,
    conflictCount,
    syncNow,
    pullNow,
    resetBaseline,
  };
}
