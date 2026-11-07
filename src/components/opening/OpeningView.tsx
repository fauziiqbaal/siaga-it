import React, { useState } from 'react';
import type { Building, ColivingIssue, FloorFacility, HandoverSignOff, RoomColiving, SimpleUser, WifiConfigModel, WifiStandardProfile } from '../../types/hotel';
import { Badge, Bar, Btn, Card, Empty, Field, Section, Segmented, SelectInput, Stat, TextArea, TextInput } from '../ui/kit';
import { BillingEditor } from '../shared/BillingEditor';
import { calculateOpeningScore } from '../../utils/scoring';

interface Props {
  building: Building;
  issues: ColivingIssue[];
  currentUser: SimpleUser;
  onUpdateBuilding: (building: Building) => void;
  onGoTab: (tab: string) => void;
}

type SectionKey = 'wifi' | 'devices' | 'accounts' | 'billing' | 'handover';

const SECTIONS: Array<{ value: SectionKey; label: string }> = [
  { value: 'wifi', label: 'SSID' },
  { value: 'devices', label: 'Perangkat' },
  { value: 'accounts', label: 'Akun' },
  { value: 'billing', label: 'Billing' },
  { value: 'handover', label: 'Serah terima' },
];

const emptyProfile = (building: Building): WifiStandardProfile => ({
  guestSsid: '',
  guestPassword: '',
  isCaptivePortal: true,
  opsSsid: '',
  opsPassword: '',
  iotSsid: '',
  iotPassword: '',
  status: 'BELUM_DISERAGAMKAN',
  ...(building.wifiStandardProfile || {}),
});

const CONFIG_MODEL_OPTIONS = [
  { value: 'SINGLE', label: 'Single SSID' },
  { value: 'MULTI', label: 'Multi SSID' },
  { value: 'PISAH', label: 'Pisah SSID' },
];

const APPLY_STATUS_OPTIONS = [
  { value: 'BELUM_DISERAGAMKAN', label: 'Unconfigured', tone: 'neutral' as const },
  { value: 'SEDANG_PROSES', label: 'Process', tone: 'amber' as const },
  { value: 'STANDAR_TERAPKAN', label: 'Configured', tone: 'green' as const },
];

export const OpeningView: React.FC<Props> = ({ building, issues, currentUser, onUpdateBuilding, onGoTab }) => {
  const [section, setSection] = useState<SectionKey>('wifi');
  const score = calculateOpeningScore(building, issues);
  const profile = emptyProfile(building);
  const isSingleSsid = profile.configModel === 'SINGLE';
  const devices = building.devices || [];
  const connections = building.internetConnections || [];
  const standaloneCctv = building.cctvPoints.filter((point) => point.isStandalone);
  const rooms = building.floors.flatMap((floor) => floor.rooms);
  const facilities = building.floors.flatMap((floor) => floor.facilities);
  const lockEndpoints = [
    ...rooms.filter((room) => room.hasSmartlock),
    ...facilities.filter((facility) => facility.hasLock),
  ];
  const cctvTakenOver = standaloneCctv.filter((point) => point.takeoverStatus === 'SUDAH_TAKEOVER').length;
  const locksTakenOver = lockEndpoints.filter((item) => item.ttlockTakeoverStatus === 'SUDAH_TAKEOVER').length;

  const [handover, setHandover] = useState<HandoverSignOff>(() => ({
    signedBy: building.handover?.signedBy || currentUser.name,
    role: building.handover?.role || currentUser.roleTitle || currentUser.role,
    signedAt: building.handover?.signedAt || new Date().toLocaleDateString('id-ID'),
    accountsConfirmed: building.handover?.accountsConfirmed || false,
    billingConfirmed: building.handover?.billingConfirmed || false,
    credentialsConfirmed: building.handover?.credentialsConfirmed || false,
    notes: building.handover?.notes || '',
  }));

  const update = (patch: Partial<Building>) => onUpdateBuilding({ ...building, ...patch });
  const updateProfile = (patch: Partial<typeof profile>) => update({ wifiStandardProfile: { ...profile, ...patch } });

  const patchRoom = (floorId: string, roomId: string, changes: Partial<RoomColiving>) => {
    update({
      floors: building.floors.map((floor) =>
        floor.id === floorId
          ? { ...floor, rooms: floor.rooms.map((room) => (room.id === roomId ? { ...room, ...changes } : room)) }
          : floor,
      ),
    });
  };

  const patchFacility = (floorId: string, facilityId: string, changes: Partial<FloorFacility>) => {
    update({
      floors: building.floors.map((floor) =>
        floor.id === floorId
          ? {
              ...floor,
              facilities: floor.facilities.map((facility) =>
                facility.id === facilityId ? { ...facility, ...changes } : facility,
              ),
            }
          : floor,
      ),
    });
  };

  return (
    <div className="space-y-3">
      <Card className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Opening Score</p>
            <p className="text-2xl font-bold leading-none text-foreground">
              {score.total}
              <span className="text-sm text-muted-foreground">/100</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{score.verdict}</p>
          </div>
          <Badge tone={score.grade === 'A' ? 'green' : score.grade === 'B' ? 'blue' : score.grade === 'C' ? 'amber' : 'red'}>
            Grade {score.grade}
          </Badge>
        </div>
        <div className="mt-2">
          <Bar value={score.total} tone={score.total >= 90 ? 'green' : score.total >= 60 ? 'amber' : 'red'} />
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Stat label="Perangkat" value={`${devices.filter((d) => d.configStatus === 'CONFIGURED').length}/${devices.length}`} hint="configured" />
          <Stat
            label="Akun"
            value={`${cctvTakenOver + locksTakenOver}/${standaloneCctv.length + lockEndpoints.length}`}
            hint="CCTV & lock"
          />
          <Stat label="Billing" value={`${connections.filter((c) => c.billingTakeoverStatus === 'SUDAH_TAKEOVER' || c.isBillingTakeover).length}/${connections.length}`} hint="dialihkan" />
        </div>
        <div className="mt-2.5">
          <Segmented size="sm" value={section} onChange={(next) => setSection(next as SectionKey)} options={SECTIONS} />
        </div>
      </Card>

      {section === 'wifi' && (
        <Section
          title="Catatan SSID"
          subtitle="Data acuan konfigurasi Wi-Fi gedung ini. Informasi saja — tidak memengaruhi skor Opening."
        >
          <p className="mb-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[10px] leading-snug text-muted-foreground">
            Isi apa adanya sesuai hasil konfigurasi di lapangan: SSID, password, model konfigurasi, dan status penerapan.
            Skor Opening dihitung dari konfigurasi perangkat, takeover akun CCTV/smartlock, dan takeover billing ISP.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="SSID Guest" hint="Contoh: @Rukita NamaGedung Community">
              <TextInput value={profile.guestSsid} onChange={(event) => updateProfile({ guestSsid: event.target.value })} />
            </Field>
            <Field label="Password guest">
              <TextInput value={profile.guestPassword} onChange={(event) => updateProfile({ guestPassword: event.target.value })} placeholder="RukitaLive2026!" />
            </Field>
            {!isSingleSsid && (
              <>
                <Field label="SSID Ops (internal)">
                  <TextInput value={profile.opsSsid || ''} onChange={(event) => updateProfile({ opsSsid: event.target.value })} />
                </Field>
                <Field label="Password Ops">
                  <TextInput value={profile.opsPassword || ''} onChange={(event) => updateProfile({ opsPassword: event.target.value })} />
                </Field>
                <Field label="SSID IoT (2.4 GHz)">
                  <TextInput value={profile.iotSsid || ''} onChange={(event) => updateProfile({ iotSsid: event.target.value })} />
                </Field>
                <Field label="Password IoT">
                  <TextInput value={profile.iotPassword || ''} onChange={(event) => updateProfile({ iotPassword: event.target.value })} />
                </Field>
              </>
            )}
          </div>

          <div className="mt-2">
            <Field
              label="Model konfigurasi"
              hint="Single SSID = satu SSID untuk semua · Multi SSID = satu AP banyak SSID · Pisah SSID = SSID terpisah per fungsi"
            >
              <Segmented<string>
                value={profile.configModel || ''}
                onChange={(next) => updateProfile({ configModel: next as WifiConfigModel })}
                options={CONFIG_MODEL_OPTIONS}
              />
            </Field>
          </div>

          <div className="mt-2">
            <Field label="Metode akses guest">
              <Segmented
                value={profile.isCaptivePortal ? 'PORTAL' : 'PASSWORD'}
                onChange={(next) => updateProfile({ isCaptivePortal: next === 'PORTAL' })}
                options={[
                  { value: 'PORTAL', label: 'Captive portal', tone: 'blue' },
                  { value: 'PASSWORD', label: 'Password WPA', tone: 'neutral' },
                ]}
              />
            </Field>
          </div>

          <div className="mt-2">
            <Field label="Status penerapan">
              <Segmented<string>
                value={profile.status}
                onChange={(next) =>
                  updateProfile({
                    status: next as typeof profile.status,
                    appliedDate: next === 'STANDAR_TERAPKAN' ? new Date().toLocaleDateString('id-ID') : profile.appliedDate,
                  })
                }
                options={APPLY_STATUS_OPTIONS}
              />
            </Field>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field label="Tanggal terpasang">
              <TextInput value={profile.appliedDate || ''} onChange={(event) => updateProfile({ appliedDate: event.target.value })} placeholder="20 Okt 2026" />
            </Field>
            <Field label="Diverifikasi oleh">
              <TextInput value={profile.verifiedBy || ''} onChange={(event) => updateProfile({ verifiedBy: event.target.value })} placeholder={currentUser.name} />
            </Field>
          </div>
        </Section>
      )}

      {section === 'devices' && (
        <Section
          title="Konfigurasi perangkat"
          subtitle="Cek konfigurasi & SSID. Akun jaringan dicatat lewat pilihan Cloud; takeover akun ada di tab Akun."
        >
          {devices.length === 0 && <Empty text="Belum ada perangkat" hint="Lengkapi inventaris di fase Pre-Opening." />}
          <div className="space-y-1.5">
            {devices.map((device) => (
              <div key={device.id} className="rounded-lg border border-border p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {device.name}
                    <span className="ml-1 text-[10px] font-medium text-muted-foreground">Lt {device.floorNumber}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {device.brandModel || 'model —'} · IP {device.ipAddress || '—'} · {device.adminUser || 'admin'}
                  </p>
                  {(device.category === 'WIRELESS_DEVICE' || device.category === 'ACCESS_POINT') && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge tone={device.ssidStatus === 'SSID_CHANGED' ? 'green' : 'red'}>
                        {device.ssidStatus === 'SSID_CHANGED' ? 'SSID standar' : 'SSID default'}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="mt-1.5 space-y-1.5">
                  <Segmented
                    size="sm"
                    value={device.configStatus}
                    onChange={(next) =>
                      update({
                        devices: devices.map((item) =>
                          item.id === device.id ? { ...item, configStatus: next as typeof item.configStatus } : item,
                        ),
                      })
                    }
                    options={[
                      { value: 'CONFIGURED', label: 'Configured', tone: 'green' },
                      { value: 'NEEDS_CONFIG', label: 'Perlu config', tone: 'amber' },
                      { value: 'OFFLINE', label: 'Offline', tone: 'red' },
                    ]}
                  />
                  {(device.category === 'WIRELESS_DEVICE' || device.category === 'ACCESS_POINT') && (
                    <Segmented
                      size="sm"
                      value={device.ssidStatus === 'SSID_CHANGED' ? 'DONE' : 'DEFAULT'}
                      onChange={(next) =>
                        update({
                          devices: devices.map((item) =>
                            item.id === device.id
                              ? {
                                  ...item,
                                  ssidStatus: next === 'DONE' ? 'SSID_CHANGED' : 'SSID_DEFAULT',
                                  ssidName: next === 'DONE' ? profile.guestSsid : '',
                                }
                              : item,
                          ),
                        })
                      }
                      options={[
                        { value: 'DONE', label: 'SSID diganti', tone: 'green' },
                        { value: 'DEFAULT', label: 'Masih default', tone: 'red' },
                      ]}
                    />
                  )}
                  <SelectInput
                    value={device.cloudUnbindStatus || 'NOT_APPLICABLE'}
                    onChange={(event) =>
                      update({
                        devices: devices.map((item) =>
                          item.id === device.id
                            ? { ...item, cloudUnbindStatus: event.target.value as typeof item.cloudUnbindStatus }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="NOT_APPLICABLE">Cloud: tidak relevan</option>
                    <option value="UNBOUND">Cloud: sudah unbind</option>
                    <option value="STILL_BOUND">Cloud: masih akun lama</option>
                  </SelectInput>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}


      {section === 'accounts' && (
        <Section title="Takeover akun CCTV & smartlock" subtitle="CCTV standalone & smartlock sering masih memakai akun pemilik lama — rebut sebelum live.">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">CCTV standalone</p>
          {standaloneCctv.length === 0 && <Empty text="Tidak ada CCTV standalone" hint="Semua kamera terhubung ke NVR." />}
          <div className="space-y-1.5">
            {standaloneCctv.map((point) => (
              <div key={point.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{point.locationName}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{point.objectCoverage || '—'}</p>
                  </div>
                  <Btn
                    variant={point.takeoverStatus === 'SUDAH_TAKEOVER' ? 'secondary' : 'primary'}
                    className="min-h-[30px] shrink-0 px-2 text-[10px]"
                    onClick={() =>
                      update({
                        cctvPoints: building.cctvPoints.map((item) =>
                          item.id === point.id
                            ? {
                                ...item,
                                takeoverStatus: item.takeoverStatus === 'SUDAH_TAKEOVER' ? 'BELUM_TAKEOVER' : 'SUDAH_TAKEOVER',
                                takeoverDate: new Date().toLocaleDateString('id-ID'),
                                masterAccount: item.takeoverStatus === 'SUDAH_TAKEOVER' ? item.masterAccount : 'siaga.it@rukita.co',
                              }
                            : item,
                        ),
                      })
                    }
                  >
                    {point.takeoverStatus === 'SUDAH_TAKEOVER' ? 'Sudah IT' : 'Takeover'}
                  </Btn>
                </div>
                <TextInput
                  className="mt-1.5"
                  value={point.masterAccount || ''}
                  onChange={(event) =>
                    update({
                      cctvPoints: building.cctvPoints.map((item) =>
                        item.id === point.id ? { ...item, masterAccount: event.target.value } : item,
                      ),
                    })
                  }
                  placeholder="akun master (email IT)"
                />
              </div>
            ))}
          </div>

          <p className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Smartlock (TTLock)</p>
          {lockEndpoints.length === 0 && <Empty text="Tidak ada smartlock" hint="Semua pintu memakai kunci biasa." />}
          <div className="space-y-1.5">
            {building.floors.flatMap((floor) =>
              [
                ...floor.rooms.filter((room) => room.hasSmartlock).map((room) => ({ floorId: floor.id, room, facility: null as FloorFacility | null })),
                ...floor.facilities.filter((facility) => facility.hasLock).map((facility) => ({ floorId: floor.id, room: null as RoomColiving | null, facility })),
              ].map((entry) => {
                const item = entry.room || entry.facility;
                if (!item) return null;
                const label = entry.room ? `Kamar ${entry.room.number}` : entry.facility?.name;
                const patch = (changes: Partial<RoomColiving> & Partial<FloorFacility>) =>
                  entry.room
                    ? patchRoom(entry.floorId, entry.room.id, changes)
                    : patchFacility(entry.floorId, entry.facility!.id, changes);

                return (
                  <div key={item.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-xs font-semibold text-foreground">{label}</p>
                      <Btn
                        variant={item.ttlockTakeoverStatus === 'SUDAH_TAKEOVER' ? 'secondary' : 'primary'}
                        className="min-h-[30px] shrink-0 px-2 text-[10px]"
                        onClick={() =>
                          patch({
                            ttlockTakeoverStatus:
                              item.ttlockTakeoverStatus === 'SUDAH_TAKEOVER' ? 'BELUM_TAKEOVER' : 'SUDAH_TAKEOVER',
                          })
                        }
                      >
                        {item.ttlockTakeoverStatus === 'SUDAH_TAKEOVER' ? 'Sudah IT' : 'Takeover'}
                      </Btn>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <SelectInput
                        value={item.ttlockSupport || 'SUPPORT_TTLOCK'}
                        onChange={(event) => patch({ ttlockSupport: event.target.value as RoomColiving['ttlockSupport'] })}
                      >
                        <option value="SUPPORT_TTLOCK">TTLock</option>
                        <option value="NON_TTLOCK">Non-TTLock</option>
                      </SelectInput>
                      <TextInput
                        value={item.ttlockAccountEmail || ''}
                        onChange={(event) => patch({ ttlockAccountEmail: event.target.value })}
                        placeholder="email akun TTLock"
                      />
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        </Section>
      )}

      {section === 'billing' && (
        <Section title="Takeover billing ISP" subtitle="Ganti penagihan ke akun IT (it.billing@rukita.co) dan simpan tanggal takeover.">
          <BillingEditor
            connections={connections}
            showTakeover
            onChange={(next) => update({ internetConnections: next, ispProvider: next[0]?.ispName || building.ispProvider })}
          />
        </Section>
      )}

      {section === 'handover' && (
        <>
          <Section title="Berita acara serah terima" subtitle="Ditandatangani setelah akun & billing benar-benar dipegang IT.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Nama penanggung jawab">
                <TextInput value={handover.signedBy} onChange={(event) => setHandover({ ...handover, signedBy: event.target.value })} />
              </Field>
              <Field label="Jabatan">
                <TextInput value={handover.role} onChange={(event) => setHandover({ ...handover, role: event.target.value })} />
              </Field>
              <Field label="Tanggal">
                <TextInput value={handover.signedAt} onChange={(event) => setHandover({ ...handover, signedAt: event.target.value })} />
              </Field>
            </div>

            <div className="mt-2 space-y-1.5">
              <label className="flex items-start gap-2 text-[11px] text-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                  checked={handover.accountsConfirmed}
                  onChange={(event) => setHandover({ ...handover, accountsConfirmed: event.target.checked })}
                />
                <span>Semua akun perangkat (router, AP, NVR, CCTV standalone, smartlock) sudah dipegang IT.</span>
              </label>
              <label className="flex items-start gap-2 text-[11px] text-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                  checked={handover.billingConfirmed}
                  onChange={(event) => setHandover({ ...handover, billingConfirmed: event.target.checked })}
                />
                <span>Tagihan ISP sudah dialihkan ke billing IT / pemilik baru.</span>
              </label>
              <label className="flex items-start gap-2 text-[11px] text-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                  checked={handover.credentialsConfirmed}
                  onChange={(event) => setHandover({ ...handover, credentialsConfirmed: event.target.checked })}
                />
                <span>Kredensial & SN perangkat tercatat di password manager / inventaris.</span>
              </label>
            </div>

            <Field label="Catatan serah terima" className="mt-2">
              <TextArea value={handover.notes || ''} onChange={(event) => setHandover({ ...handover, notes: event.target.value })} />
            </Field>

            <Btn block variant="primary" className="mt-2" onClick={() => update({ handover })}>
              Simpan berita acara
            </Btn>

            {building.handover?.signedBy && (
              <Btn
                block
                className="mt-1.5"
                onClick={() => {
                  update({ handover, phase: 'LIVE' });
                  onGoTab('scores');
                }}
              >
                Tandai gedung LIVE & buka laporan
              </Btn>
            )}
          </Section>

          <Section title="Pemeriksaan akhir" subtitle={`Opening ${score.total}/100 · ${score.blockers.length} item belum beres`}>
            {score.blockers.length === 0 ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Semua syarat opening terpenuhi. Aman untuk live.</p>
            ) : (
              <ul className="space-y-1">
                {score.blockers.map((blocker) => (
                  <li key={blocker} className="flex gap-1.5 text-[11px] text-rose-700 dark:text-rose-300">
                    <span className="shrink-0">•</span>
                    <span>{blocker}</span>
                  </li>
                ))}
              </ul>
            )}
            <Btn block className="mt-2" onClick={() => onGoTab('scores')}>Lihat laporan lengkap</Btn>
          </Section>
        </>
      )}
    </div>
  );
};


