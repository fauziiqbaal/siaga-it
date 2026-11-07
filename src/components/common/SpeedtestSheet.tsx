import React, { useEffect, useState } from 'react';
import type { Building, EvidenceMedia } from '../../types/hotel';
import { Badge, Bar, Btn, Field, Sheet, TextInput } from '../ui/kit';
import { fileToBase64, generateEvidencePath, saveEvidenceItem } from '../../utils/evidenceStorage';
import { isNativeApp, readNativeWifiSignal } from '../../lib/wifiSignal';

/**
 * Uji kecepatan Wi-Fi yang BENAR-BENAR mengukur.
 *
 * Versi lama (WifiSpeedtestModal) mengarang hasil: nilai awal dipakai sebagai
 * "hasil", ditambah Math.random(), dan dBm dihitung dari throughput. Itu sebabnya
 * laporan speedtest tidak valid.
 *
 * Di sini:
 * - Download  : fetch streaming dari endpoint uji, byte dihitung nyata (Mbps = bit/detik).
 * - Upload    : POST payload nyata, diukur dari waktu kirim.
 * - Latensi   : RTT HTTP diukur 5x (sampel pertama dibuang), bukan ICMP ping.
 * - Sinyal dBm: diisi manual, karena browser TIDAK mengizinkan baca RSSI Wi-Fi.
 *               (Chrome/Android hanya ekspos estimasi "downlink" yang tidak akurat.)
 */

const DOWN_ENDPOINT = 'https://speed.cloudflare.com/__down';
const UP_ENDPOINT = 'https://speed.cloudflare.com/__up';
const DOWNLOAD_BYTES = 25_000_000;
const UPLOAD_BYTES = 4_000_000;

export interface SpeedtestSavePayload {
  downloadMbps: number;
  uploadMbps?: number;
  pingMs?: number;
  signalDbm?: number;
  testedAt: string;
  source: 'BROWSER' | 'MANUAL';
  /** Asal angka dBm: sensor HP (APK Android) atau diketik manual. */
  signalSource?: 'MANUAL' | 'NATIVE';
  evidenceFile?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  building: Building;
  entityId: string;
  entityName: string;
  initialDownloadMbps?: number;
  initialUploadMbps?: number;
  initialPingMs?: number;
  initialSignalDbm?: number;
  onSave: (payload: SpeedtestSavePayload) => void;
}

type Phase = 'idle' | 'ping' | 'download' | 'upload' | 'done' | 'error';

async function measurePing(): Promise<{ ping: number; jitter: number }> {
  const samples: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    const started = performance.now();
    try {
      await fetch(`${DOWN_ENDPOINT}?bytes=0&r=${Date.now()}-${i}`, { cache: 'no-store' });
      samples.push(performance.now() - started);
    } catch {
      // sample gagal -> dilewati
    }
  }
  const usable = samples.slice(1); // sampel pertama masih DNS/TLS handshake
  if (usable.length === 0) throw new Error('Server uji tidak dapat dijangkau. Periksa koneksi internet.');
  const average = usable.reduce((sum, value) => sum + value, 0) / usable.length;
  const jitter = usable.length > 1 ? Math.max(...usable) - Math.min(...usable) : 0;
  return { ping: Math.round(average), jitter: Math.round(jitter) };
}

async function measureDownload(onProgress: (percent: number, mbps: number) => void) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${DOWN_ENDPOINT}?bytes=${DOWNLOAD_BYTES}&r=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Server uji menolak permintaan (HTTP ${response.status}).`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Browser ini tidak mendukung pengukuran streaming.');

    let received = 0;
    const started = performance.now();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value?.byteLength ?? 0;
      const seconds = (performance.now() - started) / 1000;
      if (seconds > 0) {
        onProgress(Math.min(100, Math.round((received / DOWNLOAD_BYTES) * 100)), (received * 8) / seconds / 1e6);
      }
    }
    const seconds = (performance.now() - started) / 1000;
    if (received === 0 || seconds === 0) throw new Error('Tidak ada data yang terunduh.');
    return { mbps: (received * 8) / seconds / 1e6, bytes: received };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function measureUpload(onProgress: (percent: number) => void) {
  const payload = new Blob([new Uint8Array(UPLOAD_BYTES)]);
  onProgress(10);
  const started = performance.now();
  const response = await fetch(UP_ENDPOINT, { method: 'POST', body: payload, cache: 'no-store' });
  if (!response.ok) throw new Error(`Server uji menolak unggahan (HTTP ${response.status}).`);
  onProgress(100);
  const seconds = (performance.now() - started) / 1000;
  if (seconds === 0) throw new Error('Durasi unggah tidak terukur.');
  return { mbps: (UPLOAD_BYTES * 8) / seconds / 1e6 };
}

export const SpeedtestSheet: React.FC<Props> = ({
  open,
  onClose,
  building,
  entityId,
  entityName,
  initialDownloadMbps,
  initialUploadMbps,
  initialPingMs,
  initialSignalDbm,
  onSave,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [liveMbps, setLiveMbps] = useState(0);
  const [download, setDownload] = useState<string>(initialDownloadMbps ? String(initialDownloadMbps) : '');
  const [upload, setUpload] = useState<string>(initialUploadMbps ? String(initialUploadMbps) : '');
  const [ping, setPing] = useState<string>(initialPingMs ? String(initialPingMs) : '');
  const [jitter, setJitter] = useState<number | null>(null);
  const [signal, setSignal] = useState<string>(initialSignalDbm ? String(initialSignalDbm) : '');
  const [source, setSource] = useState<'BROWSER' | 'MANUAL'>('BROWSER');
  const [signalSource, setSignalSource] = useState<'MANUAL' | 'NATIVE'>('MANUAL');
  const [nativeNote, setNativeNote] = useState<string | null>(null);
  const [nativeOk, setNativeOk] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const native = isNativeApp();
  const [error, setError] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('idle');
    setProgress(0);
    setLiveMbps(0);
    setError(null);
    setJitter(null);
    setPhotoName(null);
    setPhotoData(null);
    setDownload(initialDownloadMbps ? String(initialDownloadMbps) : '');
    setUpload(initialUploadMbps ? String(initialUploadMbps) : '');
    setPing(initialPingMs ? String(initialPingMs) : '');
    setSignal(initialSignalDbm ? String(initialSignalDbm) : '');
    setSource(initialDownloadMbps ? 'MANUAL' : 'BROWSER');
    setSignalSource('MANUAL');
    setNativeNote(null);
    setNativeOk(false);
  }, [open, initialDownloadMbps, initialUploadMbps, initialPingMs, initialSignalDbm]);

  /**
   * Ambil dBm dari sensor Wi-Fi HP (plugin native WifiSignal di APK Android).
   * Kalau gagal / dijalankan di browser, tidak ada angka yang diisi — teknisi
   * tetap mengisi manual. Tidak ada estimasi.
   */
  const readSignalFromPhone = async () => {
    setNativeBusy(true);
    setNativeNote(null);
    const reading = await readNativeWifiSignal();
    setNativeBusy(false);

    if (!reading.supported || typeof reading.dbm !== 'number') {
      setNativeOk(false);
      setNativeNote(reading.reason || 'Gagal membaca sinyal HP — isi manual dari Wi-Fi analyzer.');
      return;
    }

    setSignal(String(reading.dbm));
    setSignalSource('NATIVE');
    setNativeOk(true);
    const parts = [`${reading.dbm} dBm`];
    if (reading.ssid) parts.push(reading.ssid);
    parts.push(reading.method || 'sensor HP');
    setNativeNote(`Terbaca: ${parts.join(' · ')}`);
  };

  const runTest = async () => {
    setError(null);
    setPhase('ping');
    setProgress(3);
    setLiveMbps(0);
    try {
      const pingResult = await measurePing();
      setPing(String(pingResult.ping));
      setJitter(pingResult.jitter);

      setPhase('download');
      const down = await measureDownload((percent, mbps) => {
        setProgress(percent);
        setLiveMbps(round(mbps));
      });
      setDownload(String(round(down.mbps)));

      setPhase('upload');
      setProgress(10);
      const up = await measureUpload(setProgress);
      setUpload(String(round(up.mbps)));

      setSource('BROWSER');
      setProgress(100);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pengujian gagal.');
      setPhase('error');
      setProgress(0);
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setPhotoName(file.name);
      setPhotoData(base64);
    } catch {
      setError('Gagal membaca file foto.');
    }
  };

  const handleSave = async () => {
    const downloadValue = Number(download);
    if (!downloadValue || downloadValue <= 0) {
      setError('Hasil download wajib diisi. Jalankan uji, atau isi manual dari aplikasi speedtest.');
      return;
    }

    const signalValue = signal.trim() === '' ? undefined : Number(signal);
    if (signalValue !== undefined && (Number.isNaN(signalValue) || signalValue < -95 || signalValue > -20)) {
      setError('Sinyal dBm harus di antara -95 dan -20 (contoh: -58).');
      return;
    }

    let evidenceFile: string | undefined;
    if (photoData && photoName) {
      try {
        const { fileName, folderPath } = generateEvidencePath(building, 'WIFI_SPEEDTEST', entityName, 'jpg');
        const item: EvidenceMedia = {
          id: `ev-wifi-${entityId}-${Date.now()}`,
          buildingId: building.id,
          buildingSlug: building.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          entityId,
          entityName,
          category: 'WIFI_SPEEDTEST',
          mediaType: 'image',
          fileUrl: photoData,
          fileName,
          folderPath,
          originalName: photoName,
          sizeBytes: Math.round((photoData.length * 3) / 4),
          capturedAt: new Date().toISOString(),
          notes: `${downloadValue} Mbps · ${upload || '—'} Mbps upload · sinyal ${signalValue ?? '—'} dBm`,
        };
        await saveEvidenceItem(item);
        evidenceFile = fileName;
      } catch (evidenceError) {
        console.warn('[speedtest] gagal menyimpan foto bukti', evidenceError);
      }
    }

    onSave({
      downloadMbps: downloadValue,
      uploadMbps: upload ? Number(upload) : undefined,
      pingMs: ping ? Number(ping) : undefined,
      signalDbm: signalValue,
      testedAt: new Date().toISOString(),
      source,
      signalSource: signalValue !== undefined ? signalSource : undefined,
      evidenceFile,
    });
    onClose();
  };

  const busy = phase === 'ping' || phase === 'download' || phase === 'upload';
  const phaseLabel =
    phase === 'ping' ? 'Mengukur latensi…'
      : phase === 'download' ? 'Mengunduh data uji…'
      : phase === 'upload' ? 'Mengunggah data uji…'
      : phase === 'done' ? 'Selesai diuji'
      : phase === 'error' ? 'Gagal diukur'
      : 'Belum diuji';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Uji Wi-Fi — ${entityName}`}
      subtitle="Berdiri di sudut kerja/meja, HP tersambung ke SSID gedung."
      footer={
        <div className="flex gap-2">
          <Btn block onClick={onClose}>Batal</Btn>
          <Btn block variant="primary" onClick={handleSave} disabled={busy}>Simpan hasil</Btn>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <Badge tone={phase === 'done' ? 'green' : phase === 'error' ? 'red' : busy ? 'blue' : 'neutral'}>
          {phaseLabel}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          Sumber: {source === 'BROWSER' ? 'uji browser (terukur)' : 'input manual'}
          {signal.trim() !== '' && signalSource === 'NATIVE' ? ' · dBm sensor HP' : ''}
        </span>
      </div>

      {busy && (
        <div className="space-y-1.5">
          <Bar value={progress} tone="blue" />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{progress}%</span>
            <span className="font-mono font-bold text-foreground">{liveMbps ? `${liveMbps} Mbps` : '—'}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Download (Mbps)">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.1"
            value={download}
            onChange={(event) => { setDownload(event.target.value); setSource('MANUAL'); }}
            placeholder="mis. 42.5"
          />
        </Field>
        <Field label="Upload (Mbps)">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.1"
            value={upload}
            onChange={(event) => { setUpload(event.target.value); setSource('MANUAL'); }}
            placeholder="opsional"
          />
        </Field>
        <Field label="Latensi RTT (ms)" hint={jitter !== null ? `Jitter ${jitter} ms` : 'RTT HTTP, bukan ping ICMP'}>
          <TextInput type="number" inputMode="numeric" value={ping} onChange={(event) => setPing(event.target.value)} placeholder="opsional" />
        </Field>
        <Field
          label="Sinyal Wi-Fi (dBm)"
          hint={native ? 'Dibaca dari sensor HP (APK Android) atau isi manual.' : 'Browser tidak bisa baca RSSI — isi manual dari Wi-Fi analyzer.'}
        >
          <div className="flex gap-1.5">
            <TextInput
              className="flex-1"
              type="number"
              inputMode="numeric"
              value={signal}
              onChange={(event) => {
                setSignal(event.target.value);
                setSignalSource('MANUAL');
              }}
              placeholder="mis. -58"
            />
            {native && (
              <Btn className="min-h-[38px] px-2 text-[10px]" onClick={readSignalFromPhone} disabled={nativeBusy}>
                {nativeBusy ? '…' : 'Baca HP'}
              </Btn>
            )}
          </div>
        </Field>
      </div>

      {nativeNote && (
        <div
          className={`rounded-lg border px-2.5 py-2 text-[10px] leading-snug ${
            nativeOk
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          }`}
        >
          {nativeNote}
        </div>
      )}

      <Btn block variant="primary" onClick={runTest} disabled={busy}>
        {phase === 'done' || phase === 'error' ? 'Uji ulang' : 'Mulai uji kecepatan'}
      </Btn>

      <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
        Uji memakai endpoint publik <span className="font-mono">speed.cloudflare.com</span> (25 MB download, 4 MB upload).
        Hasil dipengaruhi Wi-Fi HP, jadi catat posisi uji. Bila jaringan memblokir uji browser, isi angka dari
        speedtest.net/Fast dan sumber akan tercatat sebagai <strong>input manual</strong>.
      </div>

      <div className="rounded-lg border border-border p-2.5">
        <p className="text-[11px] font-semibold text-foreground">Foto bukti (opsional)</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Screenshot hasil speedtest / layar Wi-Fi analyzer — masuk ke Bukti QC gedung.
        </p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => handlePhoto(event.target.files?.[0])}
          className="mt-2 block w-full text-[11px] text-muted-foreground file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-foreground"
        />
        {photoName && <p className="mt-1 truncate text-[10px] text-emerald-600 dark:text-emerald-400">Terlampir: {photoName}</p>}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11px] text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
    </Sheet>
  );
};


const round = (value: number) => Math.round(value * 10) / 10;
