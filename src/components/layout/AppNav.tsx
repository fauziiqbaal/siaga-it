import React, { useRef, useState } from 'react';
import type { Building, SimpleUser } from '../../types/hotel';
import { Badge, Btn, Sheet } from '../ui/kit';
import type { SaveStatus } from '../../hooks/usePersistentState';
import type { ServerSyncInfo } from '../../hooks/useServerSync';
import { cn } from '../../lib/utils';

/**
 * Shell navigasi tanpa ikon dekoratif.
 * Mobile: bottom bar 5 tab + header tipis. Desktop: baris tab di bawah header.
 */

export interface NavTab {
  id: string;
  label: string;
  hint?: string;
}

export const MAIN_TABS: NavTab[] = [
  { id: 'setup', label: 'Gedung', hint: 'Isi lantai, kamar, ISP & billing' },
  { id: 'preopening', label: 'Pre-Opening', hint: 'Aset, uji QC & koreksi' },
  { id: 'opening', label: 'Opening', hint: 'Konfigurasi, takeover akun & billing' },
  { id: 'scores', label: 'Skor', hint: 'Laporan Pre-Opening & Opening' },
  { id: 'more', label: 'Lain', hint: 'Administrator, backup data & server' },
];

// Daftar id modul legacy (dashboard/kalender/kendala/bukti/pengguna/properti/QC/perangkat/CCTV/laporan live).
// Menu-nya disembunyikan dari "Lain"; id dipertahankan hanya agar tab lama tetap ditandai sebagai "Lain".
const LEGACY_TAB_IDS = [
  'dashboard',
  'calendar',
  'issues',
  'evidence',
  'user_management',
  'property',
  'evaluation',
  'devices',
  'cctv',
  'readiness',
];

const isMoreActive = (tab: string) => tab === 'more' || LEGACY_TAB_IDS.includes(tab);

interface AppNavProps {
  tab: string;
  onSelectTab: (tab: string) => void;
  building: Building;
  buildings: Building[];
  onSelectBuilding: (id: string) => void;
  onOpenNewBuilding: () => void;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  saveError: string | null;
  currentUser: SimpleUser | null;
  users?: SimpleUser[];
  onOpenAuth: () => void;
  onLogout?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  openIssuesCount: number;
  storageUsage: { usedKb: number; quotaKb: number; percent: number };
  sync: ServerSyncInfo;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetData: () => void;
}

const formatSaved = (iso: string | null) => {
  if (!iso) return 'tersimpan';
  try {
    return `tersimpan ${new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return 'tersimpan';
  }
};

export const AppNav: React.FC<AppNavProps> = ({
  tab,
  onSelectTab,
  building,
  buildings,
  onSelectBuilding,
  onOpenNewBuilding,
  saveStatus,
  lastSavedAt,
  saveError,
  currentUser,
  users,
  onOpenAuth,
  onLogout,
  isDark,
  onToggleTheme,
  openIssuesCount,
  storageUsage,
  sync,
  onExportBackup,
  onImportBackup,
  onResetData,
}) => {
  const [isBuildingSheetOpen, setIsBuildingSheetOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState<'push' | 'pull' | null>(null);
  const [syncNotice, setSyncNotice] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  /** Aksi manual sinkron + hasilnya ditampilkan langsung di panel (berhasil/gagal). */
  const runSync = async (mode: 'push' | 'pull') => {
    if (syncBusy) return;
    setSyncBusy(mode);
    setSyncNotice(null);
    try {
      const report = mode === 'push' ? await sync.syncNow() : await sync.pullNow();
      setSyncNotice({
        tone: report.ok ? (report.conflicts > 0 ? 'warn' : 'ok') : 'error',
        text: report.message,
      });
    } catch (error) {
      console.error('[sync] aksi manual gagal', error);
      setSyncNotice({
        tone: 'error',
        text: 'Gagal menghubungi server. Pastikan "python serve.py" masih jalan lalu coba lagi.',
      });
    } finally {
      setSyncBusy(null);
    }
  };

  const go = (next: string) => {
    setIsMoreSheetOpen(false);
    setIsBuildingSheetOpen(false);
    onSelectTab(next);
  };

  const saveTone = saveStatus === 'error' ? 'red' : saveStatus === 'saving' ? 'amber' : 'green';
  const saveText =
    saveStatus === 'error' ? 'gagal simpan' : saveStatus === 'saving' ? 'menyimpan…' : formatSaved(lastSavedAt);

  const syncText = !sync.serverAvailable
    ? 'lokal saja'
    : sync.conflictCount > 0
      ? `konflik ${sync.conflictCount}`
      : sync.state === 'checking'
        ? 'cek server…'
        : sync.state === 'saving'
          ? 'sinkron…'
          : sync.state === 'error'
            ? 'gagal sinkron'
            : sync.lastSyncedAt
              ? `server ${new Date(sync.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : 'server siap';
  const syncTone =
    !sync.serverAvailable
      ? 'neutral'
      : sync.conflictCount > 0 || sync.state === 'error' || sync.state === 'conflict'
        ? 'red'
        : sync.state === 'saving' || sync.state === 'checking'
          ? 'amber'
          : 'blue';

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">Siaga IT</span>
              <Badge tone={saveTone}>{saveText}</Badge>
              <Badge tone={syncTone} className="hidden sm:inline-flex">{syncText}</Badge>
            </div>
            <button
              type="button"
              onClick={() => setIsBuildingSheetOpen(true)}
              className="mt-0.5 flex max-w-full items-center gap-1 truncate text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">{building.name}</span>
              <span className="text-[9px]">▾</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Btn variant="ghost" onClick={onToggleTheme} className="min-h-[32px] px-2 text-[11px]">
              {isDark ? 'Terang' : 'Gelap'}
            </Btn>
            <Btn variant="secondary" onClick={onOpenAuth} className="min-h-[32px] px-2 text-[11px]">
              {currentUser ? currentUser.name.split(' ')[0] : 'Login'}
            </Btn>
          </div>
        </div>

        <nav className="mx-auto hidden max-w-5xl items-center gap-1 px-3 pb-2 sm:px-5 md:flex">
          {MAIN_TABS.map((item) => {
            const active = tab === item.id || (item.id === 'more' && isMoreActive(tab));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => (item.id === 'more' ? setIsMoreSheetOpen(true) : go(item.id))}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  active ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
                {item.id === 'preopening' && openIssuesCount > 0 && (
                  <span className={cn('ml-1.5 rounded px-1 text-[10px] font-bold', active ? 'bg-white/20' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400')}>
                    {openIssuesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {saveError && (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] text-amber-800 dark:text-amber-300 sm:px-5">
            {saveError}
          </div>
        )}
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden print:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
          {MAIN_TABS.map((item) => {
            const active = tab === item.id || (item.id === 'more' && isMoreActive(tab));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => (item.id === 'more' ? setIsMoreSheetOpen(true) : go(item.id))}
                className={cn(
                  'relative flex-1 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors',
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground',
                )}
              >
                {item.label}
                {item.id === 'preopening' && openIssuesCount > 0 && (
                  <span className="absolute right-1 top-0.5 rounded bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {openIssuesCount}
                  </span>
                )}
                <span className={cn('mx-auto mt-1 block h-0.5 w-6 rounded-full', active ? 'bg-blue-600 dark:bg-blue-400' : 'bg-transparent')} />
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet
        open={isBuildingSheetOpen}
        onClose={() => setIsBuildingSheetOpen(false)}
        title="Pilih gedung"
        subtitle={`${buildings.length} properti dalam pipeline`}
        footer={
          <div className="flex gap-2">
            <Btn block onClick={() => { setIsBuildingSheetOpen(false); onOpenNewBuilding(); }}>Gedung baru</Btn>
            <Btn block variant="primary" onClick={() => go('setup')}>Kelola gedung</Btn>
          </div>
        }
      >
        <div className="space-y-1.5">
          {buildings.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelectBuilding(item.id); setIsBuildingSheetOpen(false); }}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                item.id === building.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-border hover:bg-muted',
              )}
            >
              <span className="block text-xs font-semibold text-foreground">{item.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{item.address}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet
        open={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        title="Menu lain & data"
        subtitle="Data QC tersimpan di browser ini; foto bukti tersimpan di IndexedDB."
      >
        <div className="rounded-lg border border-border p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-foreground">Administrator</p>
            {currentUser && (
              <Badge tone={currentUser.role === 'ADMIN' ? 'blue' : currentUser.role === 'BACKOFFICE' ? 'amber' : 'neutral'}>
                {currentUser.role}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            Kelola akun tim Siaga IT ({users ? `${users.length} pengguna` : 'pengguna'}), peran hak akses (Admin, Backoffice, Teknisi), dan PIN login.
          </p>
          {currentUser && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Login aktif: <strong className="text-foreground">{currentUser.name}</strong> (@{currentUser.username || 'user'})
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Btn onClick={() => go('user_management')} className="flex-1">
              User management
            </Btn>
            <Btn
              onClick={() => {
                setIsMoreSheetOpen(false);
                onOpenAuth();
              }}
              className="flex-1"
            >
              Ganti akun
            </Btn>
            {currentUser && onLogout && (
              <Btn
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  onLogout();
                }}
                variant="ghost"
                className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                Keluar
              </Btn>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border p-2.5">
          <p className="text-[11px] font-semibold text-foreground">Sinkron server (JSON)</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            {sync.serverAvailable
              ? `Terhubung ke server (${sync.dataFile || 'data/siaga-it.json'}). Yang dikirim hanya properti yang Anda ubah, jadi teknisi lain di properti berbeda tidak tertimpa.`
              : 'Server tidak aktif. Aplikasi tetap jalan dengan penyimpanan browser.'}
          </p>
          {sync.serverAvailable && typeof sync.serverVersion === 'number' && sync.serverVersion < 3 && (
            <p className="mt-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-medium leading-snug text-amber-800 dark:text-amber-200">
              Server masih versi lama (belum bisa simpan per properti). Tutup jendela{' '}
              <code className="font-mono">python serve.py</code>, jalankan lagi, lalu muat ulang halaman ini.
            </p>
          )}
          {sync.serverAvailable && sync.conflictCount > 0 && (
            <p className="mt-1 text-[10px] leading-snug text-rose-700 dark:text-rose-300">
              {sync.conflictCount} properti diubah teknisi lain hampir bersamaan. Versi server dicadangkan
              di browser ini (kunci <code className="font-mono">siaga_it_v2:sync_conflict_backup</code>)
              sebelum versi Anda disimpan.
            </p>
          )}
          {sync.serverAvailable ? (
            <>
              <div className="mt-1.5 flex gap-1.5">
                <Btn onClick={() => void runSync('push')} disabled={syncBusy !== null} className="flex-1">
                  {syncBusy === 'push' ? 'Mengirim…' : 'Kirim ke server'}
                </Btn>
                <Btn onClick={() => void runSync('pull')} disabled={syncBusy !== null} className="flex-1">
                  {syncBusy === 'pull' ? 'Menarik…' : 'Tarik dari server'}
                </Btn>
              </div>
              {syncNotice && (
                <p
                  role="status"
                  className={cn(
                    'mt-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium leading-snug',
                    syncNotice.tone === 'ok'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : syncNotice.tone === 'warn'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
                  )}
                >
                  {syncNotice.text}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
              Jalankan <code className="font-mono">python serve.py</code> lalu buka{' '}
              <code className="font-mono">http://localhost:5173</code>.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border p-2.5">
          <p className="text-[11px] font-semibold text-foreground">Penyimpanan browser</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {storageUsage.usedKb} KB dari ±{storageUsage.quotaKb} KB ({storageUsage.percent}%)
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <Btn onClick={onExportBackup} className="flex-1">Ekspor backup</Btn>
            <Btn onClick={() => importRef.current?.click()} className="flex-1">Impor backup</Btn>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportBackup(file);
              event.target.value = '';
            }}
          />
          <Btn
            variant="danger"
            className="mt-1.5 w-full"
            onClick={() => {
              if (window.confirm('Hapus semua data QC gedung di browser ini? Tindakan ini tidak bisa dibatalkan.')) {
                onResetData();
              }
            }}
          >
            Reset data lokal
          </Btn>
          <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
            Ekspor backup setiap selesai visit, lalu simpan file JSON ke Drive tim.
          </p>
        </div>
      </Sheet>
    </>
  );
};
