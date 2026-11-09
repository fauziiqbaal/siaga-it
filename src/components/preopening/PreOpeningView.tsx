import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AssetCondition,
  Building,
  CCTVPoint,
  ColivingIssue,
  EvidenceMedia,
  FloorFacility,
  ITDevice,
  RoomColiving,
  SimpleUser,
  TvStreamingCapability,
  TvType,
} from '../../types/hotel';
import {
  TV_STREAMING_OPTIONS,
  TV_TYPE_OPTIONS,
  isCheckOk,
  isCheckProblem,
  tvStreamingLabel,
  tvTypeLabel,
} from '../../types/hotel';
import { Badge, Bar, Btn, Card, Empty, Field, Section, Segmented, SelectInput, Sheet, STATUS_OPTIONS, Stat, TextArea, TextInput } from '../ui/kit';
import type { SegmentedOption } from '../ui/kit';
import { BillingEditor } from '../shared/BillingEditor';
import { uid } from '../shared/buildingFactory';
import { SpeedtestSheet } from '../common/SpeedtestSheet';
import { LiveCameraModal } from '../common/LiveCameraModal';
import {
  deleteEvidenceItem,
  fileToBase64,
  compressImage,
  uploadImageToServer,
  generateEvidencePath,
  getBuildingSlug,
  getEvidenceByBuilding,
  saveEvidenceItem,
} from '../../utils/evidenceStorage';
import { calculatePreOpeningScore } from '../../utils/scoring';

interface Props {
  building: Building;
  issues: ColivingIssue[];
  currentUser: SimpleUser;
  onUpdateBuilding: (building: Building) => void;
  onAddIssue: (data: Omit<ColivingIssue, 'id' | 'createdAt' | 'status'>) => void;
  onToggleIssueStatus: (issueId: string) => void;
  onDeleteIssue: (issueId: string) => void;
  onGoTab: (tab: string) => void;
}

type SectionKey = 'wifi' | 'cctv' | 'tv' | 'lock' | 'assets' | 'billing' | 'issues';

// Kondisi fisik aset (Pre-Opening). '' = belum dinilai.
const ASSET_CONDITION_OPTIONS: SegmentedOption<string>[] = [
  { value: 'OK', label: 'OK', tone: 'green' },
  { value: 'NEED_IMPROVE', label: 'Need Improvement', tone: 'amber' },
  { value: 'RUSAK', label: 'Rusak', tone: 'red' },
];

const SECTIONS: Array<{ value: SectionKey; label: string }> = [
  { value: 'assets', label: 'Aset' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'tv', label: 'TV' },
  { value: 'lock', label: 'Lock' },
  { value: 'billing', label: 'Billing' },
  { value: 'issues', label: 'Kendala' },
];

type Endpoint =
  | { kind: 'room'; floorId: string; room: RoomColiving }
  | { kind: 'facility'; floorId: string; facility: FloorFacility };

export const PreOpeningView: React.FC<Props> = ({
  building,
  issues,
  currentUser,
  onUpdateBuilding,
  onAddIssue,
  onToggleIssueStatus,
  onDeleteIssue,
  onGoTab,
}) => {
  const [section, setSection] = useState<SectionKey>('assets');
  const [wifiFilter, setWifiFilter] = useState<'ALL' | 'PENDING' | 'PROBLEM'>('ALL');
  const [speedtestTarget, setSpeedtestTarget] = useState<Endpoint | null>(null);
  const [cctvDraft, setCctvDraft] = useState<CCTVPoint | null>(null);
  const [deviceDraft, setDeviceDraft] = useState<ITDevice | null>(null);
  const [assetPhotos, setAssetPhotos] = useState<EvidenceMedia[]>([]);
  const [assetPhotoPreview, setAssetPhotoPreview] = useState<EvidenceMedia | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [assetCameraOpen, setAssetCameraOpen] = useState(false);
  const assetCameraRef = useRef<HTMLInputElement>(null);
  const assetGalleryRef = useRef<HTMLInputElement>(null);
  const [issueForm, setIssueForm] = useState({ category: 'INTERNET' as ColivingIssue['category'], location: '', issue: '' });

  const score = calculatePreOpeningScore(building, issues);
  const buildingIssues = issues.filter((issue) => issue.buildingId === building.id || issue.buildingId === 'current');
  const openIssues = buildingIssues.filter((issue) => issue.status === 'OPEN');

  const endpoints = useMemo<Endpoint[]>(() => {
    const list: Endpoint[] = [];
    building.floors.forEach((floor) => {
      floor.rooms.forEach((room) => list.push({ kind: 'room', floorId: floor.id, room }));
      floor.facilities.forEach((facility) => list.push({ kind: 'facility', floorId: floor.id, facility }));
    });
    return list;
  }, [building]);

  const wifiEndpoints = endpoints.filter((endpoint) =>
    endpoint.kind === 'room' ? true : endpoint.facility.hasWifi,
  );
  const tvEndpoints = endpoints.filter((endpoint) =>
    endpoint.kind === 'room' ? endpoint.room.hasTv : endpoint.facility.hasTv,
  );
  const lockEndpoints = endpoints.filter((endpoint) =>
    endpoint.kind === 'room' ? endpoint.room.hasSmartlock : endpoint.facility.hasLock,
  );

  // Foto aset perangkat disimpan di IndexedDB (evidenceStorage), bukan di localStorage bersama.
  const reloadAssetPhotos = async () => {
    try {
      setAssetPhotos(await getEvidenceByBuilding(building.id));
    } catch (error) {
      console.warn('Gagal memuat foto aset perangkat', error);
    }
  };

  useEffect(() => {
    if (section !== 'assets') return;
    let active = true;
    getEvidenceByBuilding(building.id)
      .then((items) => {
        if (active) setAssetPhotos(items);
      })
      .catch(() => {
        if (active) setAssetPhotos([]);
      });
    return () => {
      active = false;
    };
  }, [building.id, section]);

  const devicePhotos = useMemo(
    () => (deviceDraft ? assetPhotos.filter((photo) => photo.entityId === deviceDraft.id) : []),
    [assetPhotos, deviceDraft],
  );

  const photoCountOf = (deviceId: string) => assetPhotos.filter((photo) => photo.entityId === deviceId).length;

  // Tutup viewfinder kamera setiap kali ganti perangkat.
  useEffect(() => {
    setAssetCameraOpen(false);
  }, [deviceDraft?.id]);

  const saveAssetPhoto = async (file?: File) => {
    if (!file || !deviceDraft) return;
    setPhotoBusy(true);
    try {
      const entityName = deviceDraft.name.trim() || 'Perangkat IT';
      const extension = file.name.includes('.') ? file.name.split('.').pop() || 'jpg' : 'jpg';
      const { fileName, folderPath } = generateEvidencePath(building, 'DEVICE_ASSET', entityName, extension);
      
      const compressed = await compressImage(file);
      const serverUrl = await uploadImageToServer(compressed, fileName);
      const finalUrl = serverUrl || compressed;

      await saveEvidenceItem({
        id: uid('evd'),
        buildingId: building.id,
        buildingSlug: getBuildingSlug(building.name),
        entityId: deviceDraft.id,
        entityName,
        category: 'DEVICE_ASSET',
        mediaType: 'image',
        fileUrl: finalUrl,
        fileName,
        folderPath,
        originalName: file.name,
        sizeBytes: finalUrl.startsWith('data:') ? Math.round(finalUrl.length * 0.75) : file.size,
        capturedAt: new Date().toISOString(),
      });

      const updatedDraft = { ...deviceDraft, photoUrl: finalUrl };
      setDeviceDraft(updatedDraft);
      const exists = (building.devices || []).some((item) => item.id === deviceDraft.id);
      update({
        devices: exists
          ? (building.devices || []).map((item) => (item.id === deviceDraft.id ? updatedDraft : item))
          : [updatedDraft, ...(building.devices || [])],
      });
      await reloadAssetPhotos();
    } catch (error) {
      console.warn('Gagal menyimpan foto aset', error);
      window.alert('Foto gagal disimpan. Coba lagi atau kurangi ukuran file.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removeAssetPhoto = async (photoId: string) => {
    if (!window.confirm('Hapus foto aset ini?')) return;
    try {
      await deleteEvidenceItem(photoId);
      await reloadAssetPhotos();
    } catch (error) {
      console.warn('Gagal menghapus foto aset', error);
    }
  };

  const update = (patch: Partial<Building>) => onUpdateBuilding({ ...building, ...patch });

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

  const endpointLabel = (endpoint: Endpoint) =>
    endpoint.kind === 'room' ? `Kamar ${endpoint.room.number}` : endpoint.facility.name;

  const endpointFloor = (endpoint: Endpoint) =>
    endpoint.kind === 'room' ? endpoint.room.floor : endpoint.facility.floor;

  type WifiFields = {
    wifiStatus: RoomColiving['wifiStatus'];
    wifiSpeedMbps?: number;
    wifiUploadMbps?: number;
    wifiPingMs?: number;
    wifiSignalDbm?: number;
    wifiTestedAt?: string;
    wifiTestSource?: 'BROWSER' | 'MANUAL' | 'NATIVE';
    wifiEvidenceUrl?: string;
  };

  const applySpeedtest = (payload: {
    downloadMbps: number;
    uploadMbps?: number;
    pingMs?: number;
    signalDbm?: number;
    testedAt: string;
    source: 'BROWSER' | 'MANUAL';
    signalSource?: 'MANUAL' | 'NATIVE';
    evidenceFile?: string;
  }) => {
    if (!speedtestTarget) return;
    const pass = payload.downloadMbps >= 15 && (payload.signalDbm === undefined || payload.signalDbm >= -65);
    const changes: WifiFields = {
      wifiStatus: pass ? 'OK' : 'NEED_IMPROVE',
      wifiSpeedMbps: payload.downloadMbps,
      wifiUploadMbps: payload.uploadMbps,
      wifiPingMs: payload.pingMs,
      wifiSignalDbm: payload.signalDbm,
      wifiTestedAt: payload.testedAt,
      // dBm dari sensor HP (APK) dicatat terpisah dari sumber kecepatan.
      wifiTestSource: payload.signalSource === 'NATIVE' ? 'NATIVE' : payload.source,
      wifiEvidenceUrl: payload.evidenceFile,
    };

    if (speedtestTarget.kind === 'room') {
      patchRoom(speedtestTarget.floorId, speedtestTarget.room.id, changes);
    } else {
      patchFacility(speedtestTarget.floorId, speedtestTarget.facility.id, changes);
    }

    if (!pass) {
      onAddIssue({
        buildingId: building.id,
        category: 'INTERNET',
        location: `${endpointLabel(speedtestTarget)} (Lantai ${endpointFloor(speedtestTarget)})`,
        issue: `Wi-Fi di bawah standar: ${payload.downloadMbps} Mbps${
          payload.signalDbm !== undefined ? `, sinyal ${payload.signalDbm} dBm` : ''
        } (target ≥ 15 Mbps).`,
        vendorNote: building.ispProvider || 'ISP',
      });
    }
  };

  const saveCctv = (point: CCTVPoint) => {
    const exists = building.cctvPoints.some((item) => item.id === point.id);
    update({
      cctvPoints: exists
        ? building.cctvPoints.map((item) => (item.id === point.id ? point : item))
        : [...building.cctvPoints, point],
    });
    setCctvDraft(null);
  };

  const saveDevice = (device: ITDevice) => {
    const exists = (building.devices || []).some((item) => item.id === device.id);
    update({
      devices: exists
        ? (building.devices || []).map((item) => (item.id === device.id ? device : item))
        : [device, ...(building.devices || [])],
    });
    setDeviceDraft(null);
  };

  const submitIssue = () => {
    if (!issueForm.issue.trim()) return;
    onAddIssue({
      buildingId: building.id,
      category: issueForm.category,
      location: issueForm.location.trim() || building.name,
      issue: issueForm.issue.trim(),
      vendorNote: building.ispProvider || 'Teknisi Siaga IT',
    });
    setIssueForm({ ...issueForm, issue: '' });
  };

  const testedWifi = wifiEndpoints.filter((endpoint) => {
    const status = endpoint.kind === 'room' ? endpoint.room.wifiStatus : endpoint.facility.wifiStatus;
    return isCheckOk(status) || isCheckProblem(status);
  }).length;

  const problemWifi = wifiEndpoints.filter((endpoint) => {
    const status = endpoint.kind === 'room' ? endpoint.room.wifiStatus : endpoint.facility.wifiStatus;
    return isCheckProblem(status);
  }).length;

  const visibleWifi = wifiEndpoints.filter((endpoint) => {
    const status = endpoint.kind === 'room' ? endpoint.room.wifiStatus : endpoint.facility.wifiStatus;
    if (wifiFilter === 'ALL') return true;
    if (wifiFilter === 'PENDING') return !isCheckOk(status) && !isCheckProblem(status);
    return isCheckProblem(status);
  });

  return (
    <div className="space-y-3">
      <Card className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pre-Opening Score</p>
            <p className="text-2xl font-bold leading-none text-foreground">{score.total}<span className="text-sm text-muted-foreground">/100</span></p>
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
          <Stat label="Coverage Wi-Fi" value={`${score.coverage.wifiPercent}%`} hint={`${testedWifi}/${wifiEndpoints.length} titik`} />
          <Stat label="CCTV" value={building.cctvPoints.filter((point) => point.status === 'OK' && point.isRecording).length + '/' + building.cctvPoints.length} hint="online & rekam" />
          <Stat label="Kendala" value={openIssues.length} hint={`${buildingIssues.length - openIssues.length} selesai`} />
        </div>
        <div className="mt-2.5">
          <Segmented size="sm" value={section} onChange={(next) => setSection(next as SectionKey)} options={SECTIONS} />
        </div>
      </Card>

      {section === 'wifi' && (
        <Section
          title="Internet & Wi-Fi"
          subtitle="Standar: ≥ 15 Mbps di sudut kerja tiap kamar dan area bersama. Uji memakai koneksi HP saat ini."
        >
          <div className="mb-2 flex gap-1">
            {([
              { value: 'ALL', label: 'Semua' },
              { value: 'PENDING', label: `Belum dinilai (${wifiEndpoints.length - testedWifi})` },
              { value: 'PROBLEM', label: `Bermasalah (${problemWifi})` },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setWifiFilter(option.value)}
                className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                  wifiFilter === option.value
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {visibleWifi.length === 0 && (
            <Empty text="Tidak ada titik pada filter ini" hint="Ubah filter atau tambah kamar/area di fase Setup." />
          )}

          <div className="space-y-1.5">
            {visibleWifi.map((endpoint) => {
              const isRoom = endpoint.kind === 'room';
              const status = isRoom ? endpoint.room.wifiStatus : endpoint.facility.wifiStatus;
              const speed = isRoom ? endpoint.room.wifiSpeedMbps : endpoint.facility.wifiSpeedMbps;
              const dbm = isRoom ? endpoint.room.wifiSignalDbm : endpoint.facility.wifiSignalDbm;
              const testedAt = isRoom ? endpoint.room.wifiTestedAt : endpoint.facility.wifiTestedAt;
              const source = isRoom ? endpoint.room.wifiTestSource : endpoint.facility.wifiTestSource;
              const patch = (changes: WifiFields) =>
                isRoom
                  ? patchRoom(endpoint.floorId, endpoint.room.id, changes)
                  : patchFacility(endpoint.floorId, endpoint.facility.id, changes);

              return (
                <div key={isRoom ? endpoint.room.id : endpoint.facility.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {endpointLabel(endpoint)}
                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">Lt {endpointFloor(endpoint)}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {speed ? `${speed} Mbps` : 'belum diukur'} · {dbm ? `${dbm} dBm` : 'dBm belum diisi'}
                        {testedAt ? ` · ${new Date(testedAt).toLocaleDateString('id-ID')}` : ''}
                        {source ? ` (${source === 'BROWSER' ? 'uji browser' : 'manual'})` : ''}
                      </p>
                    </div>
                    <Btn className="min-h-[30px] shrink-0 px-2 text-[10px]" onClick={() => setSpeedtestTarget(endpoint)}>
                      Uji
                    </Btn>
                  </div>
                  <div className="mt-1.5">
                    <Segmented size="sm" value={status} onChange={(next) => patch({ wifiStatus: next })} options={STATUS_OPTIONS} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {section === 'cctv' && (
        <Section
          title="CCTV & Security"
          subtitle="Cek layar NVR: kamera online, merekam, dan sudut pandang sesuai target."
          action={
            <Btn
              onClick={() =>
                setCctvDraft({
                  id: uid('cctv'),
                  pointNumber: building.cctvPoints.length + 1,
                  locationName: `CAM ${String(building.cctvPoints.length + 1).padStart(2, '0')}`,
                  objectCoverage: '',
                  floorNumber: 1,
                  cctvStatus: 'BELUM_DIKETAHUI',
                  status: 'PENDING',
                  isRecording: false,
                  installationStatus: 'TERPASANG',
                  connectivityType: 'LAN_POE_NVR',
                  isStandalone: false,
                  takeoverStatus: 'BELUM_TAKEOVER',
                })
              }
            >
              + Titik
            </Btn>
          }
        >
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Field label="Retensi NVR (hari)" hint="Standar ≥ 30 hari.">
              <TextInput
                type="number"
                inputMode="numeric"
                value={building.cctvRetentionDays ?? ''}
                onChange={(event) => update({ cctvRetentionDays: Number(event.target.value) || 0 })}
              />
            </Field>
            <div className="flex items-end pb-1">
              <Badge tone={(building.cctvRetentionDays ?? 0) >= 30 ? 'green' : 'red'}>
                {(building.cctvRetentionDays ?? 0) >= 30 ? 'retensi memenuhi standar' : 'retensi di bawah standar'}
              </Badge>
            </div>
          </div>

          {building.cctvPoints.length === 0 && (
            <Empty text="Belum ada titik CCTV" hint="Tambahkan titik sesuai denah keamanan gedung." />
          )}

          <div className="space-y-1.5">
            {building.cctvPoints.map((point) => (
              <div key={point.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {point.locationName}
                      {point.floorNumber ? <span className="ml-1 text-[10px] font-medium text-muted-foreground">Lt {point.floorNumber}</span> : null}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{point.objectCoverage || 'coverage belum diisi'}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge tone={point.isRecording ? 'green' : 'amber'}>{point.isRecording ? 'merekam' : 'tidak merekam'}</Badge>
                      {point.isStandalone && <Badge tone="blue">standalone</Badge>}
                      {point.takeoverStatus === 'SUDAH_TAKEOVER' && <Badge tone="green">akun IT</Badge>}
                    </div>
                  </div>
                  <Btn className="min-h-[30px] shrink-0 px-2 text-[10px]" onClick={() => setCctvDraft({ ...point })}>Ubah</Btn>
                </div>
                <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <Segmented
                    size="sm"
                    value={point.status}
                    onChange={(next) => {
                      const cctvStatus =
                        next === 'OK'
                          ? 'ONLINE'
                          : next === 'NEED_IMPROVE'
                            ? 'PERLU_REPOSISI'
                            : next === 'BELUM_TERSEDIA'
                              ? 'PERLU_INSTALASI'
                              : 'OFFLINE';
                      update({
                        cctvPoints: building.cctvPoints.map((item) =>
                          item.id === point.id ? { ...item, status: next, cctvStatus } : item,
                        ),
                      });
                    }}
                    options={STATUS_OPTIONS}
                  />
                  <Segmented
                    size="sm"
                    value={point.isRecording ? 'YA' : 'TIDAK'}
                    onChange={(next) => {
                      update({
                        cctvPoints: building.cctvPoints.map((item) =>
                          item.id === point.id ? { ...item, isRecording: next === 'YA' } : item,
                        ),
                      });
                    }}
                    options={[{ value: 'YA', label: 'Rekam', tone: 'green' }, { value: 'TIDAK', label: 'Tidak rekam', tone: 'red' }]}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {section === 'tv' && (
        <Section title="TV & IPTV" subtitle="Uji tonton: YouTube/Netflix jalan, remote berfungsi, audio sinkron.">
          {tvEndpoints.length === 0 && (
            <Empty text="Tidak ada TV terpasang" hint="Aktifkan TV pada kamar/area di fase Setup bila unit memiliki TV." />
          )}
          <div className="space-y-1.5">
            {tvEndpoints.map((endpoint) => {
              const isRoom = endpoint.kind === 'room';
              const item = isRoom ? endpoint.room : endpoint.facility;
              const patch = (changes: Partial<RoomColiving> & Partial<FloorFacility>) =>
                isRoom
                  ? patchRoom(endpoint.floorId, endpoint.room.id, changes)
                  : patchFacility(endpoint.floorId, endpoint.facility.id, changes);

              return (
                <div key={isRoom ? endpoint.room.id : endpoint.facility.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {endpointLabel(endpoint)}
                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">Lt {endpointFloor(endpoint)}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {tvTypeLabel(item.tvType)} · {tvStreamingLabel(item.netflixSupport)}
                      </p>
                    </div>
                    <SelectInput
                      className="w-40 shrink-0 sm:w-56"
                      value={item.tvType || 'ANDROID_TV'}
                      onChange={(event) => patch({ tvType: event.target.value as TvType })}
                    >
                      {TV_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <Segmented size="sm" value={item.tvStatus} onChange={(next) => patch({ tvStatus: next })} options={STATUS_OPTIONS} />
                    <SelectInput
                      className="min-h-[38px]"
                      aria-label="Kemampuan streaming TV"
                      value={item.netflixSupport || ''}
                      onChange={(event) =>
                        patch({ netflixSupport: (event.target.value || undefined) as TvStreamingCapability | undefined })
                      }
                    >
                      <option value="">Kemampuan streaming belum diisi</option>
                      {TV_STREAMING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {section === 'lock' && (
        <Section title="Smartlock & Access" subtitle="Standar: tap kartu < 1 detik, baterai > 80%, mobile key BLE aktif.">
          {lockEndpoints.length === 0 && (
            <Empty text="Tidak ada smartlock" hint="Aktifkan smartlock pada kamar/gerbang di fase Setup bila terpasang." />
          )}
          <div className="space-y-1.5">
            {lockEndpoints.map((endpoint) => {
              const isRoom = endpoint.kind === 'room';
              const item = isRoom ? endpoint.room : endpoint.facility;
              const patch = (changes: Partial<RoomColiving> & Partial<FloorFacility>) =>
                isRoom
                  ? patchRoom(endpoint.floorId, endpoint.room.id, changes)
                  : patchFacility(endpoint.floorId, endpoint.facility.id, changes);
              const battery = item.lockBatteryPercent;
              const tapMs = item.rfidTapMs;

              return (
                <div key={isRoom ? endpoint.room.id : endpoint.facility.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {endpointLabel(endpoint)}
                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">Lt {endpointFloor(endpoint)}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {item.lockType === 'KUNCI_BIASA' ? 'Kunci biasa' : item.lockType === 'SMARTLOCK_HANDLE' ? 'Smartlock handle' : 'Access gate'}
                        {' · '}
                        {battery ? `baterai ${battery}%` : 'baterai belum diisi'}
                        {tapMs ? ` · tap ${tapMs} ms` : ''}
                      </p>
                    </div>
                    <Btn
                      className="min-h-[30px] shrink-0 px-2 text-[10px]"
                      onClick={() => patch({ hasBleMobileKey: !item.hasBleMobileKey })}
                    >
                      {item.hasBleMobileKey ? 'BLE aktif' : 'BLE off'}
                    </Btn>
                  </div>
                  <div className="mt-1.5">
                    <Segmented size="sm" value={item.lockStatus} onChange={(next) => patch({ lockStatus: next })} options={STATUS_OPTIONS} />
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <Field label="Baterai (%)">
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        value={battery ?? ''}
                        onChange={(event) => patch({ lockBatteryPercent: Number(event.target.value) || 0 })}
                        placeholder="85"
                      />
                    </Field>
                    <Field label="Tap RFID (ms)">
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        value={tapMs ?? ''}
                        onChange={(event) => patch({ rfidTapMs: Number(event.target.value) || 0 })}
                        placeholder="600"
                      />
                    </Field>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {battery !== undefined && battery > 0 && battery < 80 ? 'Baterai di bawah standar 80% — ganti sebelum opening. ' : ''}
                    {tapMs !== undefined && tapMs > 1000 ? 'Tap kartu > 1 detik — cek konfigurasi reader.' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}


      {section === 'assets' && (
        <Section
          title="Inventaris aset IT"
          subtitle="Router, switch, AP, NVR, STB, smartlock gateway — termasuk kredensial admin."
          action={
            <Btn
              onClick={() =>
                setDeviceDraft({
                  id: uid('dev'),
                  name: '',
                  brandModel: '',
                  category: 'WIRELESS_DEVICE',
                  subCategory: 'Access Point',
                  floorNumber: 1,
                  floorId: building.floors[0]?.id || '',
                  locationDetail: '',
                  serialNumber: '',
                  adminUser: 'admin',
                  adminPassword: '',
                  configStatus: 'NEEDS_CONFIG',
                  condition: 'OK',
                  ssidStatus: 'SSID_DEFAULT',
                  takeoverStatus: 'BELUM_TAKEOVER',
                })
              }
            >
              + Aset
            </Btn>
          }
        >
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Stat label="Total" value={building.devices?.length || 0} />
            <Stat label="OK" value={(building.devices || []).filter((device) => device.condition === 'OK').length} />
            <Stat
              label="Perlu tindakan"
              value={(building.devices || []).filter((device) => device.condition === 'NEED_IMPROVE' || device.condition === 'RUSAK').length}
            />
          </div>

          {(building.devices || []).length === 0 && (
            <Empty text="Belum ada perangkat" hint="Tambahkan minimal router, switch PoE, dan 1 AP per lantai." />
          )}

          <div className="space-y-1.5">
            {(building.devices || []).map((device) => (
              <div key={device.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {device.name || '(tanpa nama)'}
                      <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                        {device.category.replace(/_/g, ' ').toLowerCase()} · Lt {device.floorNumber}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {device.brandModel || 'model belum diisi'} · SN {device.serialNumber || '—'}
                      {photoCountOf(device.id) > 0 && ` · ${photoCountOf(device.id)} foto`}
                    </p>
                  </div>
                  <Btn className="min-h-[30px] shrink-0 px-2 text-[10px]" onClick={() => setDeviceDraft({ ...device })}>Ubah</Btn>
                </div>
                <div className="mt-1.5">
                  <Segmented
                    size="sm"
                    value={device.condition || ''}
                    onChange={(next) => {
                      if (!next) return;
                      update({
                        devices: (building.devices || []).map((item) =>
                          item.id === device.id ? { ...item, condition: next as AssetCondition } : item,
                        ),
                      });
                    }}
                    options={ASSET_CONDITION_OPTIONS}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {section === 'billing' && (
        <Section
          title="Billing & koneksi internet"
          subtitle="Lengkapi CID, paket, biaya, dan email billing. Takeover dilakukan di fase Opening."
        >
          <BillingEditor
            connections={building.internetConnections || []}
            onChange={(next) => update({ internetConnections: next, ispProvider: next[0]?.ispName || building.ispProvider })}
          />
        </Section>
      )}

      {section === 'issues' && (
        <Section title="Kendala & koreksi" subtitle="Semua temuan lapangan yang harus dibereskan vendor sebelum opening.">
          <div className="space-y-2 rounded-lg border border-border p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Kategori">
                <SelectInput
                  value={issueForm.category}
                  onChange={(event) => setIssueForm({ ...issueForm, category: event.target.value as ColivingIssue['category'] })}
                >
                  <option value="INTERNET">Internet / Wi-Fi</option>
                  <option value="CCTV">CCTV</option>
                  <option value="TV">TV</option>
                  <option value="SMARTLOCK">Smartlock</option>
                </SelectInput>
              </Field>
              <Field label="Lokasi">
                <TextInput
                  value={issueForm.location}
                  onChange={(event) => setIssueForm({ ...issueForm, location: event.target.value })}
                  placeholder="Kamar 204 / Dapur Lt 1"
                />
              </Field>
            </div>
            <Field label="Temuan">
              <TextArea
                value={issueForm.issue}
                onChange={(event) => setIssueForm({ ...issueForm, issue: event.target.value })}
                placeholder="mis. sinyal drop saat pintu ditutup — perlu tambah AP koridor"
              />
            </Field>
            <Btn block variant="primary" onClick={submitIssue} disabled={!issueForm.issue.trim()}>Tambah kendala</Btn>
          </div>

          <div className="mt-2 space-y-1.5">
            {buildingIssues.length === 0 && <Empty text="Tidak ada kendala tercatat" hint="Bagus — atau memang belum ada yang diuji." />}
            {buildingIssues.map((issue) => (
              <div key={issue.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {issue.category} · {issue.location}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground">{issue.issue}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Vendor: {issue.vendorNote || '—'}</p>
                  </div>
                  <Badge tone={issue.status === 'OPEN' ? 'red' : 'green'}>{issue.status === 'OPEN' ? 'OPEN' : 'SELESAI'}</Badge>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <Btn block className="min-h-[32px] text-[10px]" onClick={() => onToggleIssueStatus(issue.id)}>
                    {issue.status === 'OPEN' ? 'Tandai selesai' : 'Buka kembali'}
                  </Btn>
                  <Btn
                    block
                    variant="danger"
                    className="min-h-[32px] text-[10px]"
                    onClick={() => {
                      if (window.confirm(`Hapus kendala "${issue.issue.slice(0, 60)}"?`)) onDeleteIssue(issue.id);
                    }}
                  >
                    Hapus
                  </Btn>
                </div>
              </div>
            ))}
          </div>

          <Btn block className="mt-2" onClick={() => onGoTab('scores')}>Lihat rekap skor</Btn>
        </Section>
      )}

      {speedtestTarget && (
        <SpeedtestSheet
          open={Boolean(speedtestTarget)}
          onClose={() => setSpeedtestTarget(null)}
          building={building}
          entityId={speedtestTarget.kind === 'room' ? speedtestTarget.room.id : speedtestTarget.facility.id}
          entityName={endpointLabel(speedtestTarget)}
          initialDownloadMbps={speedtestTarget.kind === 'room' ? speedtestTarget.room.wifiSpeedMbps : speedtestTarget.facility.wifiSpeedMbps}
          initialUploadMbps={speedtestTarget.kind === 'room' ? speedtestTarget.room.wifiUploadMbps : speedtestTarget.facility.wifiUploadMbps}
          initialPingMs={speedtestTarget.kind === 'room' ? speedtestTarget.room.wifiPingMs : speedtestTarget.facility.wifiPingMs}
          initialSignalDbm={speedtestTarget.kind === 'room' ? speedtestTarget.room.wifiSignalDbm : speedtestTarget.facility.wifiSignalDbm}
          onSave={applySpeedtest}
        />
      )}

      <Sheet
        open={Boolean(cctvDraft)}
        onClose={() => setCctvDraft(null)}
        title="Titik CCTV"
        subtitle="Isi target pandang dan tipe koneksi agar tim vendor paham konteksnya."
        footer={
          <div className="flex gap-2">
            {cctvDraft && building.cctvPoints.some((point) => point.id === cctvDraft.id) && (
              <Btn
                variant="danger"
                onClick={() => {
                  update({ cctvPoints: building.cctvPoints.filter((point) => point.id !== cctvDraft.id) });
                  setCctvDraft(null);
                }}
              >
                Hapus
              </Btn>
            )}
            <Btn block variant="primary" onClick={() => cctvDraft && saveCctv(cctvDraft)}>Simpan</Btn>
          </div>
        }
      >
        {cctvDraft && (
          <>
            <Field label="Nama titik">
              <TextInput value={cctvDraft.locationName} onChange={(event) => setCctvDraft({ ...cctvDraft, locationName: event.target.value })} placeholder="CAM 05" />
            </Field>
            <Field label="Target coverage">
              <TextInput
                value={cctvDraft.objectCoverage || ''}
                onChange={(event) => setCctvDraft({ ...cctvDraft, objectCoverage: event.target.value })}
                placeholder="Koridor Kamar Lt 2"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Lantai">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  value={cctvDraft.floorNumber ?? ''}
                  onChange={(event) => setCctvDraft({ ...cctvDraft, floorNumber: Number(event.target.value) || 1 })}
                />
              </Field>
              <Field label="Konektivitas">
                <SelectInput
                  value={cctvDraft.connectivityType || 'LAN_POE_NVR'}
                  onChange={(event) => setCctvDraft({ ...cctvDraft, connectivityType: event.target.value as CCTVPoint['connectivityType'] })}
                >
                  <option value="LAN_POE_NVR">LAN PoE ke NVR</option>
                  <option value="LAN_NON_POE_NVR">LAN non-PoE ke NVR</option>
                  <option value="COAXIAL_DVR">Coaxial ke DVR</option>
                  <option value="WIFI_CAM_NVR">Wi-Fi cam ke NVR</option>
                  <option value="WIFI_CAM_STANDALONE">Wi-Fi standalone</option>
                </SelectInput>
              </Field>
            </div>
            <Field label="Kamera standalone? (akun harus di-takeover)">
              <Segmented
                value={cctvDraft.isStandalone ? 'YA' : 'TIDAK'}
                onChange={(next) => setCctvDraft({ ...cctvDraft, isStandalone: next === 'YA' })}
                options={[{ value: 'YA', label: 'Standalone', tone: 'amber' }, { value: 'TIDAK', label: 'Via NVR', tone: 'neutral' }]}
              />
            </Field>
            <Field label="Catatan">
              <TextInput
                value={cctvDraft.notes || ''}
                onChange={(event) => setCctvDraft({ ...cctvDraft, notes: event.target.value })}
                placeholder="sudut terlalu menunduk, perlu reposisi"
              />
            </Field>
          </>
        )}
      </Sheet>

      <Sheet
        open={Boolean(deviceDraft)}
        onClose={() => {
          setAssetPhotoPreview(null);
          setDeviceDraft(null);
        }}
        title="Aset perangkat IT"
        subtitle="Catat SN + kredensial akun. Jangan simpan password penting di catatan bebas."
        footer={
          <div className="flex gap-2">
            {deviceDraft && (building.devices || []).some((device) => device.id === deviceDraft.id) && (
              <Btn
                variant="danger"
                onClick={() => {
                  update({ devices: (building.devices || []).filter((device) => device.id !== deviceDraft.id) });
                  setDeviceDraft(null);
                }}
              >
                Hapus
              </Btn>
            )}
            <Btn block variant="primary" onClick={() => deviceDraft && saveDevice(deviceDraft)} disabled={!deviceDraft?.name.trim()}>
              Simpan
            </Btn>
          </div>
        }
      >
        {deviceDraft && (
          <>
            <Field label="Nama perangkat">
              <TextInput value={deviceDraft.name} onChange={(event) => setDeviceDraft({ ...deviceDraft, name: event.target.value })} placeholder="AP Koridor Lt 2" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Kategori">
                <SelectInput
                  value={deviceDraft.category}
                  onChange={(event) => setDeviceDraft({ ...deviceDraft, category: event.target.value as ITDevice['category'] })}
                >
                  <option value="ROUTER_GATEWAY">Router gateway</option>
                  <option value="SWITCH">Switch</option>
                  <option value="WIRELESS_DEVICE">Wireless / AP</option>
                  <option value="SURVEILLANCE">CCTV / NVR</option>
                  <option value="CABLE_TV">Cable TV / STB</option>
                  <option value="SMART_LOCK">Smartlock</option>
                  <option value="RACK">Rack</option>
                  <option value="LAINNYA">Lainnya</option>
                </SelectInput>
              </Field>
              <Field label="Lantai">
                <SelectInput
                  value={String(deviceDraft.floorNumber)}
                  onChange={(event) => {
                    const floorNumber = Number(event.target.value) || 1;
                    const floor = building.floors.find((item) => item.floorNumber === floorNumber);
                    setDeviceDraft({ ...deviceDraft, floorNumber, floorId: floor?.id || deviceDraft.floorId });
                  }}
                >
                  {building.floors.map((floor) => (
                    <option key={floor.id} value={floor.floorNumber}>{floor.name}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <Field label="Merek / model">
              <TextInput value={deviceDraft.brandModel} onChange={(event) => setDeviceDraft({ ...deviceDraft, brandModel: event.target.value })} placeholder="Ruijie RG-RAP2200(E)" />
            </Field>
            <Field label="Lokasi pemasangan">
              <TextInput value={deviceDraft.locationDetail} onChange={(event) => setDeviceDraft({ ...deviceDraft, locationDetail: event.target.value })} placeholder="Plafon depan kamar 204" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Serial number">
                <TextInput value={deviceDraft.serialNumber} onChange={(event) => setDeviceDraft({ ...deviceDraft, serialNumber: event.target.value })} />
              </Field>
              <Field label="Admin user">
                <TextInput value={deviceDraft.adminUser} onChange={(event) => setDeviceDraft({ ...deviceDraft, adminUser: event.target.value })} />
              </Field>
            </div>
            <Field label="Password admin">
              <TextInput value={deviceDraft.adminPassword} onChange={(event) => setDeviceDraft({ ...deviceDraft, adminPassword: event.target.value })} placeholder="simpan di password manager" />
            </Field>
            <Field label="Catatan">
              <TextInput value={deviceDraft.notes || ''} onChange={(event) => setDeviceDraft({ ...deviceDraft, notes: event.target.value })} placeholder="PoE port 4, VLAN 20" />
            </Field>
            <Field label="Foto aset">
              <div className="flex flex-wrap items-center gap-1.5">
                <Btn className="min-h-[38px]" onClick={() => setAssetCameraOpen(true)} disabled={photoBusy}>
                  Ambil foto
                </Btn>
                <Btn className="min-h-[38px]" onClick={() => assetGalleryRef.current?.click()} disabled={photoBusy}>
                  Upload
                </Btn>
                <span className="self-center text-[10px] text-muted-foreground">
                  {photoBusy ? 'Menyimpan foto…' : devicePhotos.length > 0 ? `${devicePhotos.length} foto` : 'Belum ada foto'}
                </span>
              </div>
              {devicePhotos.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {devicePhotos.map((photo) => (
                    <div key={photo.id} className="flex items-center gap-2 rounded-lg border border-border p-1.5">
                      <button
                        type="button"
                        onClick={() => setAssetPhotoPreview(photo)}
                        className="shrink-0"
                        aria-label={`Lihat foto ${photo.fileName}`}
                      >
                        <img src={photo.fileUrl} alt={photo.fileName} className="h-11 w-11 rounded-md object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssetPhotoPreview(photo)}
                        className="min-w-0 flex-1 truncate text-left text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {photo.fileName}
                      </button>
                      <Btn className="min-h-[32px] shrink-0 px-2 text-[10px]" onClick={() => removeAssetPhoto(photo.id)}>
                        Hapus
                      </Btn>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={assetCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  void saveAssetPhoto(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <input
                ref={assetGalleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void saveAssetPhoto(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </Field>
          </>
        )}
      </Sheet>

      {deviceDraft && (
        <LiveCameraModal
          isOpen={assetCameraOpen}
          onClose={() => setAssetCameraOpen(false)}
          onCapture={(_dataUrl, file) => void saveAssetPhoto(file)}
          onFallbackToFileInput={() => assetCameraRef.current?.click()}
          title={`Foto aset: ${deviceDraft.name.trim() || 'Perangkat IT'}`}
          subtitle={building.name}
        />
      )}
      {assetPhotoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm"
          onClick={() => setAssetPhotoPreview(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-border bg-card p-2.5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 px-1 pb-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{assetPhotoPreview.fileName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {assetPhotoPreview.entityName} ·{' '}
                  {assetPhotoPreview.capturedAt
                    ? new Date(assetPhotoPreview.capturedAt).toLocaleString('id-ID')
                    : 'waktu foto tidak tercatat'}
                </p>
              </div>
              <Btn className="min-h-[32px] shrink-0 px-2 text-[10px]" onClick={() => setAssetPhotoPreview(null)}>
                Tutup
              </Btn>
            </div>
            <img
              src={assetPhotoPreview.fileUrl}
              alt={assetPhotoPreview.fileName}
              className="max-h-[70vh] w-full rounded-lg bg-black object-contain"
            />
            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] text-muted-foreground">
                {Math.max(1, Math.round(assetPhotoPreview.sizeBytes / 1024))} KB · {assetPhotoPreview.category}
              </span>
              <Btn
                className="min-h-[38px]"
                onClick={() => {
                  const id = assetPhotoPreview.id;
                  setAssetPhotoPreview(null);
                  void removeAssetPhoto(id);
                }}
              >
                Hapus foto
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
