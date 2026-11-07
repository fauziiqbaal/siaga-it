import React, { useRef, useState } from 'react';
import type { Building, SimpleUser } from '../../types/hotel';
import { Badge, Btn, Card, Field, Segmented, TextInput } from '../ui/kit';
import { buildBuildingFromDraft } from '../shared/buildingFactory';
import type { SaveStatus } from '../../hooks/usePersistentState';
import type { StorageHealth } from '../../lib/storage';

interface Props {
  onCreateBuilding: (building: Building) => void;
  onImportBackup: (file: File) => void;
  saveStatus: SaveStatus;
  storage: StorageHealth;
  currentUser?: SimpleUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

/**
 * Layar pertama saat belum ada properti.
 *
 * Aplikasi ini TIDAK memuat data contoh: gedung pertama dibuat di sini, lalu
 * seluruh isian (lantai, kamar, uji QC, takeover) tersimpan di browser.
 */
export const OnboardingView: React.FC<Props> = ({
  onCreateBuilding,
  onImportBackup,
  saveStatus,
  storage,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const importRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    floors: '3',
    roomsPerFloor: '6',
    openingDate: '',
    presaleDate: '',
    hasTv: false,
    hasSmartlock: false,
    seedStandard: true,
  });

  const submit = () => {
    if (!form.name.trim()) return;
    onCreateBuilding(buildBuildingFromDraft(form));
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-3 py-4 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">Siaga IT</h1>
          <p className="text-[11px] text-muted-foreground">Checklist pre-opening &amp; opening tim IT — properti coliving</p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-foreground">{currentUser.name}</span>
              <Badge tone="blue">{currentUser.role}</Badge>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1"
                >
                  Ganti
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline ml-1"
                >
                  Keluar
                </button>
              )}
            </div>
          )}
          <Badge tone={saveStatus === 'error' ? 'red' : 'green'}>
            {saveStatus === 'error' ? 'gagal simpan' : storage.available ? 'siap dipakai' : 'tanpa simpan'}
          </Badge>
        </div>
      </div>

      <Card className="mt-3 p-3.5">
        <p className="text-sm font-bold text-foreground">Belum ada properti</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Isi identitas gedung di bawah. Kode kamar dibuat otomatis (101, 102, …) dan template QC
          (Wi-Fi, CCTV, TV, smartlock) langsung terbentuk.
        </p>

        <div className="mt-3 space-y-2">
          <Field label="Nama gedung">
            <TextInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Nama properti (mis. Rukita Kebon Jeruk)"
              autoFocus
            />
          </Field>
          <Field label="Alamat">
            <TextInput
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              placeholder="Jl. Kebon Jeruk Raya No. 18, Jakarta Barat"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Jumlah lantai">
              <TextInput
                type="number"
                inputMode="numeric"
                value={form.floors}
                onChange={(event) => setForm({ ...form, floors: event.target.value })}
              />
            </Field>
            <Field label="Kamar per lantai">
              <TextInput
                type="number"
                inputMode="numeric"
                value={form.roomsPerFloor}
                onChange={(event) => setForm({ ...form, roomsPerFloor: event.target.value })}
              />
            </Field>
            <Field label="Target live">
              <TextInput
                value={form.openingDate}
                onChange={(event) => setForm({ ...form, openingDate: event.target.value })}
                placeholder="15 Nov 2026"
              />
            </Field>
            <Field label="Pre-sale (opsional)">
              <TextInput
                value={form.presaleDate}
                onChange={(event) => setForm({ ...form, presaleDate: event.target.value })}
                placeholder="10 Nov 2026"
              />
            </Field>
          </div>
          <Field label="Fasilitas kamar standar">
            <div className="grid grid-cols-2 gap-2">
              <Segmented
                size="sm"
                value={form.hasTv ? 'YA' : 'TIDAK'}
                onChange={(next) => setForm({ ...form, hasTv: next === 'YA' })}
                options={[{ value: 'YA', label: 'Ada TV', tone: 'blue' }, { value: 'TIDAK', label: 'Tanpa TV', tone: 'neutral' }]}
              />
              <Segmented
                size="sm"
                value={form.hasSmartlock ? 'YA' : 'TIDAK'}
                onChange={(next) => setForm({ ...form, hasSmartlock: next === 'YA' })}
                options={[{ value: 'YA', label: 'Smartlock', tone: 'green' }, { value: 'TIDAK', label: 'Kunci biasa', tone: 'neutral' }]}
              />
            </div>
          </Field>
          <Field label="Template standar">
            <Segmented
              value={form.seedStandard ? 'YA' : 'TIDAK'}
              onChange={(next) => setForm({ ...form, seedStandard: next === 'YA' })}
              options={[
                { value: 'YA', label: 'CCTV + perangkat + area bersama', tone: 'blue' },
                { value: 'TIDAK', label: 'Kosongkan', tone: 'neutral' },
              ]}
            />
          </Field>

          <Btn block variant="primary" onClick={submit} disabled={!form.name.trim()}>
            Buat gedung &amp; mulai QC
          </Btn>
          <Btn block onClick={() => importRef.current?.click()}>
            Muat dari backup JSON
          </Btn>
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
        </div>
      </Card>

      <div
        className={`mt-3 rounded-lg border p-2.5 text-[10px] leading-snug ${
          storage.available ? 'border-border bg-muted/30 text-muted-foreground' : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
        }`}
      >
        {storage.available ? (
          <>
            <strong className="text-foreground">Penyimpanan aktif.</strong> Semua isian disimpan otomatis di browser ini
            (localStorage) dan tetap ada setelah refresh. Ekspor backup JSON setiap selesai visit.
          </>
        ) : (
          <>
            <strong>Penyimpanan diblokir browser.</strong> {storage.reason} Data akan hilang saat refresh. Jalankan
            aplikasi lewat <code className="font-mono">npm run dev</code> atau{' '}
            <code className="font-mono">python serve.py</code> (http://localhost), bukan dengan membuka file HTML
            langsung.
          </>
        )}
      </div>
    </div>
  );
};
