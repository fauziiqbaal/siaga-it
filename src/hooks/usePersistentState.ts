import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { APP_DATA_VERSION, loadStored, removeStored, saveStored, storageKey } from '../lib/storage';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface PersistentState<T> {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  status: SaveStatus;
  lastSavedAt: string | null;
  error: string | null;
  reset: (next?: T) => void;
  /** Simpan sekarang juga (tombol "Simpan" / sebelum cetak / sebelum tutup tab). */
  saveNow: () => void;
}

interface Options<T> {
  version?: number;
  debounceMs?: number;
  /** Normalisasi data tersimpan (mis. status uji versi lama) saat dimuat. */
  migrate?: (value: T) => T;
}

/**
 * React state that survives refresh / tab close / accidental back navigation.
 *
 * - writes are debounced (250 ms) so typing an Mbps value does not hammer storage
 * - values written by another tab are applied without re-writing them (no loop)
 * - exposes a save status so the shell can show "Tersimpan 14:02"
 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  options: Options<T> = {},
): PersistentState<T> {
  const { version = APP_DATA_VERSION, debounceMs = 250, migrate } = options;

  const initialRef = useRef<T>(
    typeof initial === 'function' ? (initial as () => T)() : initial,
  );
  const [value, setValue] = useState<T>(() => {
    const loaded = loadStored(key, initialRef.current, version);
    return migrate ? migrate(loaded) : loaded;
  });
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const remoteRef = useRef(false);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Persist (debounced)
  useEffect(() => {
    if (remoteRef.current) {
      remoteRef.current = false;
      return;
    }

    setStatus('saving');
    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const result = saveStored(key, value, version);
      if (result.ok) {
        setStatus('saved');
        setLastSavedAt(result.savedAt);
        setError(result.notice ?? null);
      } else {
        setStatus('error');
        setError(result.error ?? 'Gagal menyimpan data.');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [key, value, version, debounceMs]);

  // Flush segera saat tab ditutup / aplikasi ditinggal, supaya perubahan
  // yang masih dalam debounce tidak hilang saat teknisi menutup browser.
  useEffect(() => {
    const flush = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      saveStored(key, valueRef.current, version);
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [key, version]);

  // Cross-tab sync (read only)
  useEffect(() => {
    const expectedKey = storageKey(key);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== expectedKey || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as { data?: T };
        if (parsed && 'data' in parsed && parsed.data !== undefined) {
          remoteRef.current = true;
          setValue(migrate ? migrate(parsed.data) : parsed.data);
          setStatus('saved');
          setLastSavedAt(new Date().toISOString());
        }
      } catch (syncError) {
        console.warn('[storage] gagal sinkron antar-tab', syncError);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, migrate]);

  const reset = useCallback(
    (next?: T) => {
      removeStored(key);
      setValue(next !== undefined ? next : initialRef.current);
    },
    [key],
  );

  // Simpan segera tanpa menunggu debounce (dipakai tombol "Simpan sekarang",
  // sebelum cetak PDF, dan sebelum aplikasi ditutup).
  const saveNow = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const result = saveStored(key, valueRef.current, version);
    if (result.ok) {
      setStatus('saved');
      setLastSavedAt(result.savedAt);
      setError(result.notice ?? null);
    } else {
      setStatus('error');
      setError(result.error ?? 'Gagal menyimpan data.');
    }
  }, [key, version]);

  return { value, setValue, status, lastSavedAt, error, reset, saveNow };
}
