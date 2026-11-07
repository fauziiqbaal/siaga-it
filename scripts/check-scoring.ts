import { calculateOpeningScore, calculatePreOpeningScore, suggestPhase } from '../src/utils/scoring.ts';

const room = (id: string, number: string, status: 'OK' | 'RUSAK' | 'PENDING') => ({
  id,
  number,
  floor: 1,
  hasTv: true,
  hasSmartlock: true,
  wifiStatus: status,
  wifiSpeedMbps: status === 'OK' ? 40 : 0,
  wifiSignalDbm: -58,
  tvStatus: 'OK',
  lockStatus: 'OK',
});

const building = {
  id: 'bld-test',
  name: 'Test Building',
  address: 'Jl. Test',
  openingDate: '15 Nov 2026',
  ispProvider: 'Biznet',
  cctvRetentionDays: 30,
  floors: [
    {
      id: 'fl-1',
      floorNumber: 1,
      name: 'Lantai 1',
      rooms: [room('rm-1', '101', 'OK'), room('rm-2', '102', 'RUSAK'), room('rm-3', '103', 'PENDING')],
      facilities: [
        {
          id: 'fac-1',
          name: 'Dapur Bersama',
          type: 'DAPUR',
          floor: 1,
          hasWifi: true,
          wifiStatus: 'OK',
          hasTv: false,
          tvStatus: 'BELUM_TERSEDIA',
          hasLock: false,
          lockType: 'NONE',
          lockStatus: 'BELUM_TERSEDIA',
        },
      ],
    },
  ],
  cctvPoints: [
    { id: 'c1', pointNumber: 1, locationName: 'CAM 01', objectCoverage: 'Gerbang', floorNumber: 1, status: 'OK', isRecording: true, isStandalone: true, takeoverStatus: 'SUDAH_TAKEOVER' },
    { id: 'c2', pointNumber: 2, locationName: 'CAM 02', objectCoverage: 'Parkir', floorNumber: 1, status: 'RUSAK', isRecording: false, isStandalone: false },
  ],
  devices: [
    { id: 'd1', name: 'Router', category: 'ROUTER_GATEWAY', floorNumber: 1, configStatus: 'CONFIGURED', ssidStatus: 'SSID_CHANGED', takeoverStatus: 'SUDAH_TAKEOVER', adminUser: 'admin' },
    { id: 'd2', name: 'AP Lt1', category: 'WIRELESS_DEVICE', floorNumber: 1, configStatus: 'NEEDS_CONFIG', ssidStatus: 'SSID_DEFAULT', takeoverStatus: 'BELUM_TAKEOVER', adminUser: 'admin' },
  ],
  internetConnections: [
    { id: 'i1', ispName: 'Biznet', packageName: 'Metronet 150', speedMbps: 150, customerNumber: 'CID-1', billingEmail: 'it.billing@rukita.co', role: 'PRIMARY', status: 'AKTIF', billingTakeoverStatus: 'SUDAH_TAKEOVER' },
  ],
  wifiStandardProfile: {
    guestSsid: 'Rukita Test Community',
    guestPassword: 'x',
    isCaptivePortal: true,
    opsSsid: 'Rukita-Ops',
    opsPassword: 'x',
    iotSsid: 'Rukita-IoT',
    iotPassword: 'x',
    status: 'STANDAR_TERAPKAN',
  },
} as unknown as Parameters<typeof calculatePreOpeningScore>[0];

const pre = calculatePreOpeningScore(building, []);
const opening = calculateOpeningScore(building, []);
const sum = (pillars: typeof pre.pillars) => Math.round(pillars.reduce((total, pillar) => total + pillar.score, 0));
const weight = (pillars: typeof pre.pillars) => pillars.reduce((total, pillar) => total + pillar.weight, 0);

console.log('Pre-opening:', pre.total, pre.grade, '| pillar sum', sum(pre.pillars), '| weights', weight(pre.pillars));
console.log('Opening    :', opening.total, opening.grade, '| pillar sum', sum(opening.pillars), '| weights', weight(opening.pillars));
console.log('Suggested phase:', suggestPhase(building, []));
console.log('Pre blockers:', pre.blockers);
console.log('Opening blockers:', opening.blockers);

if (weight(pre.pillars) !== 100) throw new Error('pre-opening weights must sum to 100');
if (weight(opening.pillars) !== 100) throw new Error('opening weights must sum to 100');
if (pre.total < 0 || pre.total > 100 || opening.total < 0 || opening.total > 100) throw new Error('score out of range');
if (Math.abs(pre.total - sum(pre.pillars)) > 1) throw new Error('pre-opening total mismatch');

// Catatan SSID hanya informasi: mengosongkan/mengubahnya tidak boleh menggeser skor atau menambah blocker.
const withoutSsidInfo = {
  ...building,
  wifiStandardProfile: undefined,
} as unknown as Parameters<typeof calculateOpeningScore>[0];
const openingWithoutSsid = calculateOpeningScore(withoutSsidInfo, []);
if (openingWithoutSsid.total !== opening.total) throw new Error('SSID notes must not affect opening score');
if (openingWithoutSsid.blockers.length !== opening.blockers.length) {
  throw new Error('SSID notes must not add opening blockers');
}

// Takeover akun perangkat jaringan tidak dinilai lagi — hanya CCTV standalone & smartlock.
const openingWithoutDeviceTakeover = calculateOpeningScore(
  {
    ...building,
    devices: (building.devices || []).map((device) => ({ ...device, takeoverStatus: 'BELUM_TAKEOVER' as const })),
  },
  [],
);
if (openingWithoutDeviceTakeover.total !== opening.total) {
  throw new Error('device account takeover must not affect opening score');
}

const empty = {
  ...building,
  id: 'empty',
  floors: [],
  cctvPoints: [],
  devices: [],
  internetConnections: [],
  wifiStandardProfile: undefined,
  handover: undefined,
  cctvRetentionDays: 0,
} as unknown as Parameters<typeof calculatePreOpeningScore>[0];
const emptyPre = calculatePreOpeningScore(empty, []);
const emptyOpen = calculateOpeningScore(empty, []);
console.log('Empty pre:', emptyPre.total, '| empty opening:', emptyOpen.total, '| phase:', suggestPhase(empty, []));
if (emptyPre.total !== 0 || emptyOpen.total !== 0) throw new Error('empty building should score 0');

console.log('OK — scoring engine validated');
