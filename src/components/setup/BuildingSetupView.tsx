import React, { useState } from 'react';
import type { Building, ColivingIssue, FloorFacility, RoomColiving } from '../../types/hotel';
import { Badge, Bar, Btn, Card, Empty, Field, Section, Segmented, Sheet, Stat, TextInput } from '../ui/kit';
import { BillingEditor } from '../shared/BillingEditor';
import { FacilityLegend, FacilityMarks } from '../shared/FacilityMarks';
import {
  buildBuildingFromDraft,
  countFacilities,
  countRooms,
  makeFacility,
  makeFloor,
  makeRoom,
} from '../shared/buildingFactory';
import { PHASE_LABEL, calculateOpeningScore, calculatePreOpeningScore, suggestPhase } from '../../utils/scoring';

interface Props {
  buildings: Building[];
  building: Building;
  issues: ColivingIssue[];
  onSelectBuilding: (id: string) => void;
  onUpdateBuilding: (building: Building) => void;
  onCreateBuilding: (building: Building) => void;
  onDeleteBuilding: (building: Building) => void;
  onGoTab: (tab: string) => void;
}

const FACILITY_TYPES: Array<{ value: FloorFacility['type']; label: string }> = [
  { value: 'DAPUR', label: 'Dapur bersama' },
  { value: 'COMMUNAL_LOUNGE', label: 'Communal lounge' },
  { value: 'ROOFTOP', label: 'Rooftop / jemuran' },
  { value: 'PAGAR_GERBANG', label: 'Pagar & gerbang' },
  { value: 'PARKIRAN', label: 'Parkir' },
  { value: 'BALCONY', label: 'Balkon' },
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'SERVER_IT', label: 'Ruang server / MDF' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

export const BuildingSetupView: React.FC<Props> = ({
  buildings,
  building,
  issues,
  onSelectBuilding,
  onUpdateBuilding,
  onCreateBuilding,
  onDeleteBuilding,
  onGoTab,
}) => {
  const [roomDraft, setRoomDraft] = useState<{ floorId: string; room: RoomColiving } | null>(null);
  const [facilityDraft, setFacilityDraft] = useState<{ floorNumber: number; facility: FloorFacility } | null>(null);
  const [floorDraft, setFloorDraft] = useState<{
    floorId: string;
    name: string;
    addRooms: string;
    hasTv: boolean;
    hasSmartlock: boolean;
  } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [buildingQuery, setBuildingQuery] = useState('');
  const [newForm, setNewForm] = useState({
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

  const update = (patch: Partial<Building>) => onUpdateBuilding({ ...building, ...patch });
  const phase = building.phase ?? 'SETUP';
  const recommended = suggestPhase(building, issues);
  const preScore = calculatePreOpeningScore(building, issues);
  const openScore = calculateOpeningScore(building, issues);
  const buildingQueryText = buildingQuery.trim().toLowerCase();
  const filteredBuildings = buildingQueryText
    ? buildings.filter((item) => `${item.name} ${item.address}`.toLowerCase().includes(buildingQueryText))
    : buildings;
  const pickFirstMatch = () => {
    if (filteredBuildings.length > 0) onSelectBuilding(filteredBuildings[0].id);
  };

  const updateRoom = (floorId: string, updated: RoomColiving) => {
    update({
      floors: building.floors.map((floor) =>
        floor.id === floorId ? { ...floor, rooms: floor.rooms.map((room) => (room.id === updated.id ? updated : room)) } : floor,
      ),
    });
  };

  const addRoom = (floorId: string) => {
    update({
      floors: building.floors.map((floor) => {
        if (floor.id !== floorId) return floor;
        const next = Math.max(0, ...floor.rooms.map((room) => Number(room.number.slice(-2)) || 0)) + 1;
        return { ...floor, rooms: [...floor.rooms, makeRoom(floor.floorNumber, next)] };
      }),
    });
  };

  const deleteRoom = (floorId: string, roomId: string) => {
    update({
      floors: building.floors.map((floor) =>
        floor.id === floorId ? { ...floor, rooms: floor.rooms.filter((room) => room.id !== roomId) } : floor,
      ),
    });
  };

  /** Tambah banyak kamar sekaligus (nomor lanjut otomatis dari kamar terakhir). */
  const addRoomsBulk = (
    floorId: string,
    count: number,
    options: { hasTv?: boolean; hasSmartlock?: boolean } = {},
  ) => {
    const total = Math.max(1, Math.min(60, Math.floor(count) || 1));
    update({
      floors: building.floors.map((floor) => {
        if (floor.id !== floorId) return floor;
        const start = Math.max(0, ...floor.rooms.map((room) => Number(room.number.slice(-2)) || 0)) + 1;
        const rooms = Array.from({ length: total }, (_, index) => makeRoom(floor.floorNumber, start + index, options));
        return { ...floor, rooms: [...floor.rooms, ...rooms] };
      }),
    });
  };

  const applyFloorDraft = () => {
    if (!floorDraft) return;
    const { floorId, name, addRooms, hasTv, hasSmartlock } = floorDraft;
    update({
      floors: building.floors.map((floor) => (floor.id === floorId ? { ...floor, name: name.trim() || floor.name } : floor)),
    });
    const addCount = Number(addRooms);
    if (Number.isFinite(addCount) && addCount > 0) {
      addRoomsBulk(floorId, addCount, { hasTv, hasSmartlock });
    }
    setFloorDraft(null);
  };

  const deleteFloor = (floorId: string) => {
    const floor = building.floors.find((item) => item.id === floorId);
    if (!floor) return;
    const ok = window.confirm(
      `Hapus ${floor.name}? ${floor.rooms.length} kamar dan ${floor.facilities.length} area bersama beserta hasil ujinya ikut terhapus.`,
    );
    if (!ok) return;
    update({ floors: building.floors.filter((item) => item.id !== floorId) });
    setFloorDraft(null);
  };

  const addFacility = (floorNumber: number, facility: FloorFacility) => {
    update({
      floors: building.floors.map((floor) =>
        floor.floorNumber === floorNumber ? { ...floor, facilities: [...floor.facilities, facility] } : floor,
      ),
    });
  };

  const deleteFacility = (facilityId: string) => {
    update({
      floors: building.floors.map((floor) => ({
        ...floor,
        facilities: floor.facilities.filter((facility) => facility.id !== facilityId),
      })),
    });
  };

  const addFloor = () => {
    const next = Math.max(0, ...building.floors.map((floor) => floor.floorNumber)) + 1;
    update({ floors: [...building.floors, makeFloor(next, 0)] });
  };

  const createBuilding = () => {
    if (!newForm.name.trim()) return;
    onCreateBuilding(buildBuildingFromDraft(newForm));
    setIsCreateOpen(false);
    setNewForm({
      name: '', address: '', floors: '3', roomsPerFloor: '6', openingDate: '', presaleDate: '',
      hasTv: false, hasSmartlock: false, seedStandard: true,
    });
  };

  return (
    <div className="space-y-3">
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fase onboarding</p>
            <p className="text-sm font-bold text-foreground">{PHASE_LABEL[phase]}</p>
            <p className="text-[10px] text-muted-foreground">Rekomendasi sistem: {PHASE_LABEL[recommended]}</p>
          </div>
          <div className="w-full sm:w-64">
            <Segmented
              size="sm"
              value={phase}
              onChange={(next) => update({ phase: next as Building['phase'] })}
              options={[
                { value: 'SETUP', label: 'Setup' },
                { value: 'PRE_OPENING', label: 'Pre-Open' },
                { value: 'OPENING', label: 'Opening' },
                { value: 'LIVE', label: 'Live' },
              ]}
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Lantai" value={building.floors.length} />
          <Stat label="Kamar" value={countRooms(building)} hint={`${countFacilities(building)} area bersama`} />
          <Stat label="Skor" value={`${preScore.total}/${openScore.total}`} hint="pre-open / opening" />
        </div>
        <div className="mt-2">
          <Bar value={preScore.total} tone={preScore.total >= 90 ? 'green' : preScore.total >= 60 ? 'amber' : 'red'} />
        </div>
        <div className="mt-3 flex gap-1.5">
          <Btn block onClick={() => onGoTab('preopening')}>Lanjut Pre-Opening</Btn>
          <Btn block variant="primary" onClick={() => onGoTab('scores')}>Lihat skor</Btn>
        </div>
      </Card>

      <Section
        title="Pilih gedung"
        subtitle={
          buildingQueryText
            ? `${filteredBuildings.length} dari ${buildings.length} gedung cocok dengan "${buildingQuery.trim()}".`
            : 'Setup sekali, visit berikutnya tinggal pilih. Ketik nama / alamat untuk menyaring.'
        }
        action={<Btn onClick={() => setIsCreateOpen(true)}>+ Gedung</Btn>}
      >
        <div className="mb-2 flex items-center gap-1.5">
          <TextInput
            value={buildingQuery}
            onChange={(event) => setBuildingQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                pickFirstMatch();
              }
            }}
            placeholder="Cari gedung: nama, alamat, area…"
            aria-label="Cari gedung"
            className="min-h-[38px]"
          />
          {buildingQuery && (
            <Btn variant="ghost" onClick={() => setBuildingQuery('')} className="shrink-0">
              Hapus
            </Btn>
          )}
        </div>
        <div className="max-h-[420px] space-y-1.5 overflow-y-auto">
          {buildings.length === 0 && (
            <Empty text="Belum ada gedung" hint="Tap + Gedung untuk mendaftarkan properti pertama." />
          )}
          {buildings.length > 0 && filteredBuildings.length === 0 && (
            <Empty text="Tidak ada gedung yang cocok" hint="Cek ejaan kata kunci, atau tambah gedung baru." />
          )}

          {filteredBuildings.map((item) => {
            const itemScore = calculatePreOpeningScore(item, issues);
            const active = item.id === building.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectBuilding(item.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left ${
                  active ? 'border-blue-500/50 bg-blue-500/10' : 'border-border hover:bg-muted'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-foreground">{item.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {item.address ? `${item.address} · ` : ''}
                    {item.floors.length} lantai · {countRooms(item)} kamar · {item.openingDate || 'tanggal live belum diisi'}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Badge tone={item.phase === 'LIVE' ? 'green' : item.phase === 'OPENING' ? 'blue' : 'amber'}>
                    {PHASE_LABEL[item.phase ?? 'SETUP']}
                  </Badge>
                  <Badge tone="neutral">{itemScore.total}</Badge>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Identitas & jadwal" subtitle="Dasar hitung due date IT (H-3 pre-sale / live) dan laporan.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Nama gedung">
            <TextInput value={building.name} onChange={(event) => update({ name: event.target.value })} />
          </Field>
          <Field label="Alamat">
            <TextInput value={building.address} onChange={(event) => update({ address: event.target.value })} />
          </Field>
          <Field label="Target live">
            <TextInput
              value={building.openingDate}
              onChange={(event) => update({ openingDate: event.target.value })}
              placeholder="15 Nov 2026"
            />
          </Field>
          <Field label="Pre-sale (opsional)" hint="Jika diisi, due date IT = H-3 pre-sale.">
            <TextInput
              value={building.presaleDate || ''}
              onChange={(event) => update({ presaleDate: event.target.value })}
              placeholder="10 Nov 2026"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Lantai & kamar"
        subtitle="Kode kamar otomatis (101, 102, …). Tap kamar atau area untuk ubah nomor / fasilitasnya."
        action={<Btn onClick={addFloor}>+ Lantai</Btn>}
      >
        <FacilityLegend className="mb-2 rounded-md border border-border bg-muted/30 px-2 py-1.5" />
        <div className="space-y-2">
          {building.floors.length === 0 && (
            <Empty text="Belum ada lantai" hint="Tambah lantai, lalu isi jumlah kamar per lantai." />
          )}

          {building.floors.map((floor) => (
            <div key={floor.id} className="rounded-lg border border-border p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">{floor.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {floor.rooms.length} kamar · {floor.facilities.length} area bersama
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Btn className="min-h-[30px] px-2 text-[10px]" onClick={() => addRoom(floor.id)}>+ Kamar</Btn>
                  <Btn
                    className="min-h-[30px] px-2 text-[10px]"
                    onClick={() => setFacilityDraft({ floorNumber: floor.floorNumber, facility: makeFacility(floor.floorNumber, '', 'LAINNYA') })}
                  >
                    + Area
                  </Btn>
                  <Btn
                    variant="ghost"
                    className="min-h-[30px] px-2 text-[10px]"
                    onClick={() =>
                      setFloorDraft({
                        floorId: floor.id,
                        name: floor.name,
                        addRooms: '0',
                        hasTv: false,
                        hasSmartlock: false,
                      })
                    }
                  >
                    Kelola
                  </Btn>
                </div>
              </div>

              {floor.rooms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {floor.rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setRoomDraft({ floorId: floor.id, room })}
                      className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-muted"
                      title="Ubah kamar"
                    >
                      {room.number}
                      <FacilityMarks flags={{ wifi: true, tv: room.hasTv, lock: room.hasSmartlock }} />
                    </button>
                  ))}
                </div>
              )}

              {floor.facilities.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {floor.facilities.map((facility) => (
                    <button
                      key={facility.id}
                      type="button"
                      onClick={() => setFacilityDraft({ floorNumber: floor.floorNumber, facility })}
                      className="rounded-md border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
                    >
                      {facility.name || 'Area tanpa nama'}
                      <FacilityMarks flags={{ wifi: facility.hasWifi, tv: facility.hasTv, lock: facility.hasLock }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Billing & koneksi internet"
        subtitle="Isi CID, paket, dan email billing sejak awal supaya takeover di fase Opening tidak tertunda."
      >
        <BillingEditor
          connections={building.internetConnections || []}
          onChange={(next) => update({
            internetConnections: next,
            ispProvider: next[0]?.ispName || building.ispProvider,
          })}
        />
      </Section>

      <Section title="Zona berbahaya" subtitle="Hapus properti beserta seluruh data QC-nya.">
        <Btn variant="danger" block onClick={() => onDeleteBuilding(building)}>Hapus gedung ini</Btn>
      </Section>

      <Sheet
        open={Boolean(roomDraft)}
        onClose={() => setRoomDraft(null)}
        title={`Kamar ${roomDraft?.room.number ?? ''}`}
        subtitle="Data ini dipakai sebagai target uji QC di fase Pre-Opening."
        footer={
          <div className="flex gap-2">
            {roomDraft && (
              <Btn
                variant="danger"
                onClick={() => {
                  deleteRoom(roomDraft.floorId, roomDraft.room.id);
                  setRoomDraft(null);
                }}
              >
                Hapus
              </Btn>
            )}
            <Btn block variant="primary" onClick={() => setRoomDraft(null)}>Selesai</Btn>
          </div>
        }
      >
        {roomDraft && (
          <>
            <Field label="Nomor kamar">
              <TextInput
                value={roomDraft.room.number}
                onChange={(event) => setRoomDraft({ ...roomDraft, room: { ...roomDraft.room, number: event.target.value } })}
              />
            </Field>
            <p className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
              Wi-Fi kamar selalu diuji (penanda <strong>W</strong>). TV dan smartlock bisa dinyalakan/dimatikan di bawah —
              penandanya <strong>T</strong> dan <strong>L</strong>, sama seperti di area bersama.
            </p>
            <Field label="Ada TV di kamar?">
              <Segmented
                value={roomDraft.room.hasTv ? 'YA' : 'TIDAK'}
                onChange={(next) => {
                  const hasTv = next === 'YA';
                  setRoomDraft({
                    ...roomDraft,
                    room: {
                      ...roomDraft.room,
                      hasTv,
                      tvStatus: hasTv ? roomDraft.room.tvStatus : 'BELUM_TERSEDIA',
                      tvType: hasTv ? roomDraft.room.tvType || 'ANDROID_TV' : 'NONE',
                    },
                  });
                }}
                options={[{ value: 'YA', label: 'Ada TV', tone: 'blue' }, { value: 'TIDAK', label: 'Tanpa TV', tone: 'neutral' }]}
              />
            </Field>
            <Field label="Kunci pintu">
              <Segmented
                value={roomDraft.room.hasSmartlock ? 'SMART' : 'BIASA'}
                onChange={(next) => {
                  const hasSmartlock = next === 'SMART';
                  setRoomDraft({
                    ...roomDraft,
                    room: {
                      ...roomDraft.room,
                      hasSmartlock,
                      lockStatus: hasSmartlock ? roomDraft.room.lockStatus : 'BELUM_TERSEDIA',
                      lockType: hasSmartlock ? 'SMARTLOCK_HANDLE' : 'KUNCI_BIASA',
                    },
                  });
                }}
                options={[{ value: 'SMART', label: 'Smartlock', tone: 'green' }, { value: 'BIASA', label: 'Kunci biasa', tone: 'neutral' }]}
              />
            </Field>
            <Field label="Catatan">
              <TextInput
                value={roomDraft.room.notes || ''}
                onChange={(event) => setRoomDraft({ ...roomDraft, room: { ...roomDraft.room, notes: event.target.value } })}
                placeholder="mis. kamar pojok, sinyal lemah"
              />
            </Field>
            <Btn
              block
              variant="primary"
              onClick={() => {
                updateRoom(roomDraft.floorId, roomDraft.room);
                setRoomDraft(null);
              }}
            >
              Simpan kamar
            </Btn>
          </>
        )}
      </Sheet>

      <Sheet
        open={Boolean(facilityDraft)}
        onClose={() => setFacilityDraft(null)}
        title="Area bersama"
        subtitle="Dapur, lounge, rooftop, parkir, gerbang — semua titik QC bersama."
        footer={
          <div className="flex gap-2">
            {facilityDraft && building.floors.some((floor) => floor.facilities.some((item) => item.id === facilityDraft.facility.id)) && (
              <Btn
                variant="danger"
                onClick={() => {
                  deleteFacility(facilityDraft.facility.id);
                  setFacilityDraft(null);
                }}
              >
                Hapus
              </Btn>
            )}
            <Btn
              block
              variant="primary"
              onClick={() => {
                if (!facilityDraft) return;
                const exists = building.floors.some((floor) => floor.facilities.some((item) => item.id === facilityDraft.facility.id));
                if (exists) {
                  update({
                    floors: building.floors.map((floor) => ({
                      ...floor,
                      facilities: floor.facilities.map((item) =>
                        item.id === facilityDraft.facility.id ? facilityDraft.facility : item,
                      ),
                    })),
                  });
                } else {
                  addFacility(facilityDraft.floorNumber, facilityDraft.facility);
                }
                setFacilityDraft(null);
              }}
            >
              Simpan area
            </Btn>
          </div>
        }
      >
        {facilityDraft && (
          <>
            <Field label="Nama area">
              <TextInput
                value={facilityDraft.facility.name}
                onChange={(event) => setFacilityDraft({ ...facilityDraft, facility: { ...facilityDraft.facility, name: event.target.value } })}
                placeholder="Dapur Bersama"
              />
            </Field>
            <Field label="Jenis area">
              <select
                value={facilityDraft.facility.type}
                onChange={(event) => setFacilityDraft({ ...facilityDraft, facility: { ...facilityDraft.facility, type: event.target.value as FloorFacility['type'] } })}
                className="min-h-[38px] w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs"
              >
                {FACILITY_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'hasWifi' as const, label: 'Wi-Fi' },
                { key: 'hasTv' as const, label: 'TV' },
                { key: 'hasLock' as const, label: 'Akses' },
              ]).map((item) => (
                <div key={item.key}>
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground">{item.label}</p>
                  <Segmented
                    size="sm"
                    value={facilityDraft.facility[item.key] ? 'YA' : 'TIDAK'}
                    onChange={(next) => {
                      const on = next === 'YA';
                      const facility = { ...facilityDraft.facility, [item.key]: on } as FloorFacility;
                      if (item.key === 'hasLock') {
                        facility.lockType = on ? 'SMARTLOCK_GATE_ACCESS' : 'NONE';
                        facility.lockStatus = on ? 'PENDING' : 'BELUM_TERSEDIA';
                      }
                      setFacilityDraft({ ...facilityDraft, facility });
                    }}
                    options={[{ value: 'YA', label: 'Ya', tone: 'green' }, { value: 'TIDAK', label: 'Tdk', tone: 'neutral' }]}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </Sheet>

      <Sheet
        open={Boolean(floorDraft)}
        onClose={() => setFloorDraft(null)}
        title={`Kelola ${floorDraft?.name ?? 'lantai'}`}
        subtitle="Ubah nama, tambah beberapa kamar sekaligus, atau hapus lantai."
        footer={
          <div className="flex gap-2">
            <Btn block variant="danger" onClick={() => floorDraft && deleteFloor(floorDraft.floorId)}>
              Hapus lantai
            </Btn>
            <Btn block variant="primary" onClick={applyFloorDraft}>
              Simpan
            </Btn>
          </div>
        }
      >
        {floorDraft && (
          <>
            <Field label="Nama lantai">
              <TextInput
                value={floorDraft.name}
                onChange={(event) => setFloorDraft({ ...floorDraft, name: event.target.value })}
                placeholder="Lantai 1"
              />
            </Field>
            <Field label="Tambah kamar" hint="Nomor lanjut otomatis dari kamar terakhir. Isi 0 kalau tidak menambah.">
              <TextInput
                type="number"
                inputMode="numeric"
                value={floorDraft.addRooms}
                onChange={(event) => setFloorDraft({ ...floorDraft, addRooms: event.target.value })}
              />
            </Field>
            <Field label="Fasilitas kamar baru">
              <div className="grid grid-cols-2 gap-2">
                <Segmented
                  size="sm"
                  value={floorDraft.hasTv ? 'YA' : 'TIDAK'}
                  onChange={(next) => setFloorDraft({ ...floorDraft, hasTv: next === 'YA' })}
                  options={[{ value: 'YA', label: 'Ada TV', tone: 'blue' }, { value: 'TIDAK', label: 'Tanpa TV', tone: 'neutral' }]}
                />
                <Segmented
                  size="sm"
                  value={floorDraft.hasSmartlock ? 'YA' : 'TIDAK'}
                  onChange={(next) => setFloorDraft({ ...floorDraft, hasSmartlock: next === 'YA' })}
                  options={[{ value: 'YA', label: 'Smartlock', tone: 'green' }, { value: 'TIDAK', label: 'Kunci biasa', tone: 'neutral' }]}
                />
              </div>
            </Field>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Menghapus lantai akan menghapus kamar, area bersama, dan hasil uji di lantai tersebut. Data lantai lain tidak berubah.
            </p>
          </>
        )}
      </Sheet>

      <Sheet
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Gedung baru"
        subtitle="Cukup isi jumlah lantai & kamar per lantai; template QC langsung terbentuk."
        footer={
          <div className="flex gap-2">
            <Btn block onClick={() => setIsCreateOpen(false)}>Batal</Btn>
            <Btn block variant="primary" onClick={createBuilding} disabled={!newForm.name.trim()}>Buat gedung</Btn>
          </div>
        }
      >
        <Field label="Nama gedung">
          <TextInput value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Rukita Tawakal Tomang" />
        </Field>
        <Field label="Alamat">
          <TextInput value={newForm.address} onChange={(e) => setNewForm({ ...newForm, address: e.target.value })} placeholder="Jl. Tawakal No. 12, Jakarta Barat" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Jumlah lantai">
            <TextInput type="number" inputMode="numeric" value={newForm.floors} onChange={(e) => setNewForm({ ...newForm, floors: e.target.value })} />
          </Field>
          <Field label="Kamar per lantai">
            <TextInput type="number" inputMode="numeric" value={newForm.roomsPerFloor} onChange={(e) => setNewForm({ ...newForm, roomsPerFloor: e.target.value })} />
          </Field>
          <Field label="Target live">
            <TextInput value={newForm.openingDate} onChange={(e) => setNewForm({ ...newForm, openingDate: e.target.value })} placeholder="15 Nov 2026" />
          </Field>
          <Field label="Pre-sale (opsional)">
            <TextInput value={newForm.presaleDate} onChange={(e) => setNewForm({ ...newForm, presaleDate: e.target.value })} placeholder="10 Nov 2026" />
          </Field>
        </div>
        <Field label="Fasilitas kamar standar">
          <div className="grid grid-cols-2 gap-2">
            <Segmented
              size="sm"
              value={newForm.hasTv ? 'YA' : 'TIDAK'}
              onChange={(next) => setNewForm({ ...newForm, hasTv: next === 'YA' })}
              options={[{ value: 'YA', label: 'Ada TV', tone: 'blue' }, { value: 'TIDAK', label: 'Tanpa TV', tone: 'neutral' }]}
            />
            <Segmented
              size="sm"
              value={newForm.hasSmartlock ? 'YA' : 'TIDAK'}
              onChange={(next) => setNewForm({ ...newForm, hasSmartlock: next === 'YA' })}
              options={[{ value: 'YA', label: 'Smartlock', tone: 'green' }, { value: 'TIDAK', label: 'Kunci biasa', tone: 'neutral' }]}
            />
          </div>
        </Field>
        <Field label="Template standar">
          <Segmented
            value={newForm.seedStandard ? 'YA' : 'TIDAK'}
            onChange={(next) => setNewForm({ ...newForm, seedStandard: next === 'YA' })}
            options={[
              { value: 'YA', label: 'CCTV + perangkat dasar + area bersama', tone: 'blue' },
              { value: 'TIDAK', label: 'Kosongkan', tone: 'neutral' },
            ]}
          />
        </Field>
      </Sheet>
    </div>
  );
};

