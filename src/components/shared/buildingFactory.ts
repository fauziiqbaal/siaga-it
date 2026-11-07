import type {
  Building,
  CCTVPoint,
  FloorConfig,
  FloorFacility,
  ITDevice,
  RoomColiving,
} from '../../types/hotel';

/** Pembuat struktur gedung: kamar, fasilitas bersama, titik CCTV, dan perangkat dasar. */

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const roomNumber = (floorNumber: number, index: number) =>
  `${floorNumber}${String(index).padStart(2, '0')}`;

export function makeRoom(
  floorNumber: number,
  index: number,
  options: { hasTv?: boolean; hasSmartlock?: boolean } = {},
): RoomColiving {
  return {
    id: uid('rm'),
    number: roomNumber(floorNumber, index),
    floor: floorNumber,
    hasTv: options.hasTv ?? false,
    hasSmartlock: options.hasSmartlock ?? false,
    wifiStatus: 'PENDING',
    wifiSpeedMbps: 0,
    tvStatus: options.hasTv ? 'PENDING' : 'BELUM_TERSEDIA',
    tvType: options.hasTv ? 'ANDROID_TV' : 'NONE',
    lockStatus: options.hasSmartlock ? 'PENDING' : 'BELUM_TERSEDIA',
    lockType: options.hasSmartlock ? 'SMARTLOCK_HANDLE' : 'KUNCI_BIASA',
  };
}

export function makeFloor(
  floorNumber: number,
  roomsCount: number,
  options: { hasTv?: boolean; hasSmartlock?: boolean } = {},
): FloorConfig {
  return {
    id: uid('fl'),
    floorNumber,
    name: `Lantai ${floorNumber}`,
    rooms: Array.from({ length: roomsCount }, (_, index) => makeRoom(floorNumber, index + 1, options)),
    facilities: [],
  };
}

export function makeFacility(
  floor: number,
  name: string,
  type: FloorFacility['type'],
  flags: { wifi?: boolean; tv?: boolean; lock?: boolean } = {},
): FloorFacility {
  return {
    id: uid('fac'),
    name,
    type,
    floor,
    hasWifi: flags.wifi ?? true,
    wifiStatus: 'PENDING',
    hasTv: flags.tv ?? false,
    tvStatus: flags.tv ? 'PENDING' : 'BELUM_TERSEDIA',
    hasLock: flags.lock ?? false,
    lockType: flags.lock ? 'SMARTLOCK_GATE_ACCESS' : 'NONE',
    lockStatus: flags.lock ? 'PENDING' : 'BELUM_TERSEDIA',
  };
}

/** Fasilitas bersama standar coliving Rukita. */
export function standardFacilities(floorCount: number): FloorFacility[] {
  const top = Math.max(1, floorCount);
  return [
    makeFacility(1, 'Pagar & Gerbang Utama', 'PAGAR_GERBANG', { wifi: false, lock: true }),
    makeFacility(1, 'Area Parkir Motor', 'PARKIRAN', { wifi: true }),
    makeFacility(1, 'Dapur Bersama', 'DAPUR', { wifi: true }),
    makeFacility(1, 'Foyer / Pintu Masuk', 'LAINNYA', { wifi: true }),
    makeFacility(top, 'Communal Lounge', 'COMMUNAL_LOUNGE', { wifi: true, tv: true }),
    makeFacility(top, 'Rooftop & Area Jemuran', 'ROOFTOP', { wifi: true, lock: true }),
  ];
}

/** Titik CCTV standar: pagar, parkir, foyer, dapur, koridor tiap lantai, tangga/rooftop. */
export function standardCctvPoints(floorCount: number): CCTVPoint[] {
  const top = Math.max(1, floorCount);
  const base: Array<{ name: string; coverage: string; floor: number }> = [
    { name: 'CAM 01', coverage: 'Pagar Luar & Gerbang Masuk', floor: 1 },
    { name: 'CAM 02', coverage: 'Area Parkir Motor', floor: 1 },
    { name: 'CAM 03', coverage: 'Pintu Entrance / Foyer', floor: 1 },
    { name: 'CAM 04', coverage: 'Dapur Bersama', floor: 1 },
  ];
  for (let floor = 1; floor <= top; floor += 1) {
    base.push({ name: `CAM ${String(4 + floor).padStart(2, '0')}`, coverage: `Koridor Kamar Lt ${floor}`, floor });
  }
  base.push({ name: `CAM ${String(5 + top).padStart(2, '0')}`, coverage: 'Tangga Akses & Rooftop', floor: top });

  return base.map((item, index) => ({
    id: uid('cctv'),
    pointNumber: index + 1,
    locationName: item.name,
    objectCoverage: item.coverage,
    floorNumber: item.floor,
    cctvStatus: 'BELUM_DIKETAHUI',
    status: 'PENDING',
    isRecording: false,
    installationStatus: 'TERPASANG',
    connectivityType: 'LAN_POE_NVR',
    isStandalone: false,
    takeoverStatus: 'BELUM_TAKEOVER',
  }));
}

/** Perangkat minimum: router gateway, switch PoE, 1 AP per lantai, NVR. */
export function standardDevices(floors: FloorConfig[]): ITDevice[] {
  const firstFloor = floors[0];
  const devices: ITDevice[] = [
    {
      id: uid('dev'),
      name: 'Router Gateway (MDF)',
      brandModel: '',
      category: 'ROUTER_GATEWAY',
      subCategory: 'Router',
      floorNumber: 1,
      floorId: firstFloor?.id ?? '',
      locationDetail: 'Rack MDF Lt 1',
      serialNumber: '',
      adminUser: 'admin',
      adminPassword: '',
      configStatus: 'NEEDS_CONFIG',
      ssidStatus: 'SSID_DEFAULT',
      takeoverStatus: 'BELUM_TAKEOVER',
      cloudUnbindStatus: 'NOT_APPLICABLE',
    },
    {
      id: uid('dev'),
      name: 'Switch PoE Utama',
      brandModel: '',
      category: 'SWITCH',
      subCategory: 'Switch POE Managed',
      floorNumber: 1,
      floorId: firstFloor?.id ?? '',
      locationDetail: 'Rack MDF Lt 1',
      serialNumber: '',
      adminUser: 'admin',
      adminPassword: '',
      configStatus: 'NEEDS_CONFIG',
      takeoverStatus: 'BELUM_TAKEOVER',
    },
  ];

  floors.forEach((floor) => {
    devices.push({
      id: uid('dev'),
      name: `Access Point Lt ${floor.floorNumber}`,
      brandModel: '',
      category: 'WIRELESS_DEVICE',
      subCategory: 'Access Point',
      floorNumber: floor.floorNumber,
      floorId: floor.id,
      locationDetail: `Koridor Lt ${floor.floorNumber}`,
      serialNumber: '',
      adminUser: 'admin',
      adminPassword: '',
      configStatus: 'NEEDS_CONFIG',
      ssidStatus: 'SSID_DEFAULT',
      takeoverStatus: 'BELUM_TAKEOVER',
      cloudUnbindStatus: 'NOT_APPLICABLE',
    });
  });

  if (floors.length > 0) {
    devices.push({
      id: uid('dev'),
      name: 'NVR CCTV',
      brandModel: '',
      category: 'SURVEILLANCE',
      subCategory: 'NVR',
      floorNumber: 1,
      floorId: firstFloor?.id ?? '',
      locationDetail: 'Rack MDF Lt 1',
      serialNumber: '',
      adminUser: 'admin',
      adminPassword: '',
      configStatus: 'NEEDS_CONFIG',
      takeoverStatus: 'BELUM_TAKEOVER',
    });
  }

  return devices;
}

export const countRooms = (building: Building) =>
  building.floors.reduce((total, floor) => total + floor.rooms.length, 0);

export const countFacilities = (building: Building) =>
  building.floors.reduce((total, floor) => total + floor.facilities.length, 0);

/** Isian form "Gedung baru" (dipakai onboarding & sheet di fase Setup). */
export interface BuildingDraft {
  name: string;
  address?: string;
  openingDate?: string;
  presaleDate?: string;
  floors: number | string;
  roomsPerFloor: number | string;
  hasTv?: boolean;
  hasSmartlock?: boolean;
  /** true = langsung buat template standar (7 CCTV, AP per lantai, area bersama). */
  seedStandard?: boolean;
}

/**
 * Satu sumber pembuatan gedung.
 * Dipakai onboarding (belum ada properti) dan form di fase Setup, supaya
 * struktur gedung selalu identik dan tidak ada dua implementasi yang menyimpang.
 */
export function buildBuildingFromDraft(draft: BuildingDraft): Building {
  const floorCount = Math.max(1, Math.floor(Number(draft.floors) || 1));
  const roomsPerFloor = Math.max(0, Math.floor(Number(draft.roomsPerFloor) || 0));
  const seed = draft.seedStandard ?? true;
  const floors = Array.from({ length: floorCount }, (_, index) =>
    makeFloor(index + 1, roomsPerFloor, { hasTv: draft.hasTv, hasSmartlock: draft.hasSmartlock }),
  );

  return {
    id: uid('bld'),
    name: draft.name.trim(),
    address: (draft.address ?? '').trim(),
    openingDate: (draft.openingDate ?? '').trim(),
    presaleDate: (draft.presaleDate ?? '').trim() || undefined,
    ispProvider: '',
    phase: 'SETUP',
    internetConnections: [],
    floors: seed
      ? floors.map((floor) => ({
          ...floor,
          facilities: standardFacilities(floorCount).filter((facility) => facility.floor === floor.floorNumber),
        }))
      : floors,
    cctvPoints: seed ? standardCctvPoints(floorCount) : [],
    devices: seed ? standardDevices(floors) : [],
    cctvRetentionDays: seed ? 30 : undefined,
    wifiStandardProfile: seed
      ? {
          guestSsid: '',
          guestPassword: '',
          isCaptivePortal: true,
          opsSsid: '',
          opsPassword: '',
          iotSsid: '',
          iotPassword: '',
          status: 'BELUM_DISERAGAMKAN',
        }
      : undefined,
  };
}

