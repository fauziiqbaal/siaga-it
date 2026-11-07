import React, { useState } from 'react';
import type { InternetConnection } from '../../types/hotel';
import { Badge, Btn, Empty, Field, Sheet, TextInput } from '../ui/kit';

interface Props {
  connections: InternetConnection[];
  onChange: (next: InternetConnection[]) => void;
  /** Tombol + status takeover billing. Hanya untuk fase Opening. */
  showTakeover?: boolean;
}

const emptyConnection = (): InternetConnection => ({
  id: `inet-${Date.now().toString(36)}`,
  ispName: '',
  packageName: '',
  role: 'PRIMARY',
  speedMbps: 0,
  customerNumber: '',
  accountHolder: '',
  billingEmail: '',
  registeredPhone: '',
  billingTakeoverStatus: 'BELUM_TAKEOVER',
  status: 'AKTIF',
});

/**
 * Editor billing internet. Dipakai fase Setup (data ISP/CID) dan fase Opening
 * (takeover tagihan ke akun IT).
 *
 * Field sengaja diringkas: ISP, paket, bandwidth, no. pelanggan, atas nama,
 * no. telepon terdaftar, email terdaftar. Status & aksi takeover hanya muncul
 * di fase Opening (`showTakeover`).
 */
export const BillingEditor: React.FC<Props> = ({ connections, onChange, showTakeover = false }) => {
  const [draft, setDraft] = useState<InternetConnection | null>(null);

  const patch = (id: string, changes: Partial<InternetConnection>) => {
    onChange(connections.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const saveDraft = () => {
    if (!draft) return;
    const exists = connections.some((item) => item.id === draft.id);
    onChange(exists ? connections.map((item) => (item.id === draft.id ? draft : item)) : [...connections, draft]);
    setDraft(null);
  };

  return (
    <div className="space-y-2">
      {connections.length === 0 && (
        <Empty text="Belum ada koneksi internet" hint="Isi ISP, paket, bandwidth, no. pelanggan, atas nama, no. telepon & email terdaftar." />
      )}

      {connections.map((connection) => (
        <div key={connection.id} className="rounded-lg border border-border p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">{connection.ispName || '(ISP belum diisi)'}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {connection.packageName || 'paket —'} · {connection.speedMbps || 0} Mbps · CID {connection.customerNumber || '—'}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {connection.accountHolder || 'atas nama —'}
                {connection.registeredPhone ? ` · ${connection.registeredPhone}` : ''}
                {connection.billingEmail ? ` · ${connection.billingEmail}` : ''}
              </p>
              {showTakeover && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge tone={connection.billingTakeoverStatus === 'SUDAH_TAKEOVER' ? 'green' : 'neutral'}>
                    billing {connection.billingTakeoverStatus === 'SUDAH_TAKEOVER' ? 'IT' : 'belum takeover'}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Btn className="min-h-[30px] px-2 text-[10px]" onClick={() => setDraft({ ...connection })}>Ubah</Btn>
              {showTakeover && (connection.billingTakeoverStatus === 'SUDAH_TAKEOVER' ? (
                <Btn className="min-h-[30px] px-2 text-[10px]" onClick={() => patch(connection.id, { billingTakeoverStatus: 'BELUM_TAKEOVER' })}>
                  Batalkan
                </Btn>
              ) : (
                <Btn
                  variant="primary"
                  className="min-h-[30px] px-2 text-[10px]"
                  onClick={() => patch(connection.id, {
                    billingTakeoverStatus: 'SUDAH_TAKEOVER',
                    billingTakeoverDate: new Date().toLocaleDateString('id-ID'),
                  })}
                >
                  Takeover
                </Btn>
              ))}
            </div>
          </div>
        </div>
      ))}

      <Btn block onClick={() => setDraft(emptyConnection())}>+ Tambah koneksi internet</Btn>

      <Sheet
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={connections.some((item) => item.id === draft?.id) ? 'Ubah koneksi internet' : 'Koneksi internet baru'}
        subtitle="Data ini menjadi dasar laporan billing dan takeover ISP."
        footer={
          <div className="flex gap-2">
            {draft && connections.some((item) => item.id === draft.id) && (
              <Btn
                variant="danger"
                onClick={() => {
                  onChange(connections.filter((item) => item.id !== draft.id));
                  setDraft(null);
                }}
              >
                Hapus
              </Btn>
            )}
            <Btn block variant="primary" onClick={saveDraft}>Simpan</Btn>
          </div>
        }
      >
        {draft && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ISP">
                <TextInput value={draft.ispName} onChange={(e) => setDraft({ ...draft, ispName: e.target.value })} placeholder="Biznet / Telkomsel Orbit" />
              </Field>
              <Field label="Paket">
                <TextInput value={draft.packageName || ''} onChange={(e) => setDraft({ ...draft, packageName: e.target.value })} placeholder="Metronet 150M" />
              </Field>
              <Field label="Bandwidth (Mbps)">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  value={draft.speedMbps || ''}
                  onChange={(e) => setDraft({ ...draft, speedMbps: Number(e.target.value) })}
                  placeholder="150"
                />
              </Field>
              <Field label="No. pelanggan / CID">
                <TextInput value={draft.customerNumber} onChange={(e) => setDraft({ ...draft, customerNumber: e.target.value })} placeholder="CID-8829103" />
              </Field>
              <Field label="Atas nama">
                <TextInput value={draft.accountHolder || ''} onChange={(e) => setDraft({ ...draft, accountHolder: e.target.value })} placeholder="PT Rukita Bhineka Nusantara" />
              </Field>
              <Field label="No. telepon terdaftar">
                <TextInput
                  type="tel"
                  inputMode="tel"
                  value={draft.registeredPhone || ''}
                  onChange={(e) => setDraft({ ...draft, registeredPhone: e.target.value })}
                  placeholder="0811-9823-123"
                />
              </Field>
            </div>
            <Field label="Email terdaftar">
              <TextInput
                type="email"
                inputMode="email"
                value={draft.billingEmail || ''}
                onChange={(e) => setDraft({ ...draft, billingEmail: e.target.value })}
                placeholder="it.billing@rukita.co"
              />
            </Field>
          </>
        )}
      </Sheet>
    </div>
  );
};
