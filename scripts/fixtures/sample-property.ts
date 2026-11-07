import type { Building, ColivingIssue } from '../../src/types/hotel';
import { buildBuildingFromDraft } from '../../src/components/shared/buildingFactory.ts';

/**
 * Properti contoh untuk UJI & LAPORAN.
 *
 * Dibuat lewat `buildBuildingFromDraft` — jalur yang sama dengan form
 * "Gedung baru" di aplikasi — lalu diisi hasil uji lapangan seperti yang
 * dikerjakan teknisi (Wi-Fi per kamar, CCTV online, TV, smartlock, billing).
 * Tidak ada data ini yang di-seed ke aplikasi; hanya dipakai skrip.
 */
export interface SampleProperty {
  building: Building;
  issues: ColivingIssue[];
}

const DOWNLOAD_SPEEDS = [
  86, 74, 68, 92, 71, 64,
  88, 77, 66, 81, 73, 62,
  90, 76, 69, 84, 70, 65,
];

export function createFilledProperty(): SampleProperty {
  const building = buildBuildingFromDraft({
    name: 'Rukita Kebon Jeruk',
    address: 'Jl. Kebon Jeruk Raya No. 18, Jakarta Barat',
    floors: 3,
    roomsPerFloor: 6,
    openingDate: '20 Nov 2026',
    presaleDate: '15 Nov 2026',
    hasTv: true,
    hasSmartlock: true,
    seedStandard: true,
  });

  const testedAt = '2026-11-05T09:30:00.000Z';
  let roomIndex = 0;

  building.floors = building.floors.map((floor) => ({
    ...floor,
    rooms: floor.rooms.map((room) => {
      const download = DOWNLOAD_SPEEDS[roomIndex % DOWNLOAD_SPEEDS.length];
      roomIndex += 1;
      const signal = -46 - (roomIndex % 8);
      return {
        ...room,
        wifiStatus: 'OK',
        wifiSpeedMbps: download,
        wifiUploadMbps: Math.round(download / 3),
        wifiPingMs: 6 + (roomIndex % 4),
        wifiSignalDbm: signal,
        wifiBandTested: 'DUAL_BAND',
        wifiDualBandSupport: true,
        wifiSpeed24Mbps: Math.round(download * 0.55),
        wifiSignal24Dbm: signal - 6,
        wifiTestedAt: testedAt,
        wifiTestSource: 'BROWSER',
        tvStatus: 'OK',
        tvType: 'ANDROID_TV',
        netflixSupport: 'NETFLIX_READY',
        lockStatus: 'OK',
        lockType: 'SMARTLOCK_HANDLE',
        lockBatteryPercent: 88 + (roomIndex % 10),
        rfidTapMs: 320 + (roomIndex % 5) * 40,
        hasBleMobileKey: true,
        ttlockSupport: 'SUPPORT_TTLOCK',
        ttlockTakeoverStatus: 'SUDAH_TAKEOVER',
        ttlockAccountEmail: 'it.smartlock@rukita.co',
        notes: '',
      };
    }),
    facilities: floor.facilities.map((facility) => ({
      ...facility,
      wifiStatus: facility.hasWifi ? 'OK' : 'BELUM_TERSEDIA',
      wifiSpeedMbps: facility.hasWifi ? 78 : undefined,
      wifiSignalDbm: facility.hasWifi ? -52 : undefined,
      wifiUploadMbps: facility.hasWifi ? 30 : undefined,
      wifiTestedAt: facility.hasWifi ? testedAt : undefined,
      wifiTestSource: 'BROWSER',
      tvStatus: facility.hasTv ? 'OK' : 'BELUM_TERSEDIA',
      netflixSupport: facility.hasTv ? 'NETFLIX_READY' : undefined,
      lockStatus: facility.hasLock ? 'OK' : 'BELUM_TERSEDIA',
      lockBatteryPercent: facility.hasLock ? 95 : undefined,
      rfidTapMs: facility.hasLock ? 360 : undefined,
      ttlockTakeoverStatus: facility.hasLock ? 'SUDAH_TAKEOVER' : undefined,
    })),
  }));

  // CCTV: semua titik online, merekam di NVR, retensi 30 hari.
  building.cctvPoints = building.cctvPoints.map((point, index) => ({
    ...point,
    cctvStatus: 'ONLINE',
    status: 'OK',
    isRecording: true,
    notes: index === 3 ? 'Adaptor 12V diganti baru (tiket ISS-9002)' : 'Coverage sesuai standar',
    isStandalone: index % 4 === 0,
    takeoverStatus: 'SUDAH_TAKEOVER',
    masterAccount: 'siaga.it@rukita.co',
    takeoverDate: '04 Nov 2026',
  }));

  // Perangkat: terkonfigurasi, SSID standar, akun sudah di-takeover.
  building.devices = building.devices.map((device, index) => ({
    ...device,
    brandModel:
      device.category === 'ROUTER_GATEWAY'
        ? 'MikroTik hEX RB750Gr3'
        : device.category === 'SWITCH'
          ? 'Ruijie RG-NBS3100-8GT2SFP-P'
          : device.category === 'WIRELESS_DEVICE'
            ? 'Ruijie Reyee RG-RAP2200(E)'
            : 'Hikvision DS-7608NI-K1',
    serialNumber: `SN-KBJ-${String(index + 1).padStart(3, '0')}`,
    ipAddress: `192.168.10.${10 + index}`,
    configStatus: 'CONFIGURED',
    ssidStatus: device.category === 'WIRELESS_DEVICE' ? 'SSID_CHANGED' : device.ssidStatus,
    ssidName: device.category === 'WIRELESS_DEVICE' ? '@Rukita Kebon Jeruk Community' : undefined,
    takeoverStatus: 'SUDAH_TAKEOVER',
    cloudUnbindStatus: 'UNBOUND',
    takeoverDate: '04 Nov 2026',
    adminPassword: 'vault://rukita/kebon-jeruk',
  }));

  building.cctvRetentionDays = 30;

  building.internetConnections = [
    {
      id: 'conn-kbj-1',
      ispName: 'Biznet',
      packageName: 'Metronet Dedicated 150',
      role: 'PRIMARY',
      speedMbps: 150,
      customerNumber: 'CID-8829103',
      accountHolder: 'PT Rukita Bhineka Nusantara',
      billingTakeoverStatus: 'SUDAH_TAKEOVER',
      billingEmail: 'it.billing@rukita.co',
      registeredPhone: '0811-9823-103',
      billingTakeoverDate: '02 Nov 2026',
      ipPublic: '103.28.12.45',
      modemWanPort: 'MikroTik ether1-WAN1',
      nocContact: '1500988',
      monthlyCost: 'Rp 1.750.000 / bln',
      status: 'AKTIF',
    },
    {
      id: 'conn-kbj-2',
      ispName: 'IndiHome',
      packageName: 'Bisnis 100 Mbps',
      role: 'BACKUP',
      speedMbps: 100,
      customerNumber: '122019384756',
      accountHolder: 'PT Rukita Bhineka Nusantara',
      billingTakeoverStatus: 'SUDAH_TAKEOVER',
      billingEmail: 'it.billing@rukita.co',
      registeredPhone: '021-5092-8801',
      billingTakeoverDate: '02 Nov 2026',
      status: 'AKTIF',
    },
  ];

  building.wifiStandardProfile = {
    guestSsid: '@Rukita Kebon Jeruk Community',
    guestPassword: 'KebonJeruk2026!',
    isCaptivePortal: true,
    opsSsid: 'Rukita-Ops-KBJ',
    opsPassword: 'Ops#Kbj2026',
    iotSsid: 'Rukita-IoT-KBJ',
    iotPassword: 'Iot#Kbj2026',
    status: 'STANDAR_TERAPKAN',
    appliedDate: '04 Nov 2026',
    verifiedBy: 'Budi Pratama (IT Lead)',
    notes: 'Semua AP Ruijie Reyee broadcast SSID standar, VLAN guest/ops/IoT terpisah.',
  };

  building.handover = {
    signedBy: 'Budi Pratama',
    role: 'IT Lead',
    signedAt: '05 Nov 2026',
    accountsConfirmed: true,
    billingConfirmed: true,
    credentialsConfirmed: true,
    notes: 'Serah terima akun perangkat, CCTV standalone, TTLock, dan billing ISP selesai.',
  };

  building.inspectionVisits = [
    {
      id: 'vis-kbj-1',
      buildingId: building.id,
      visitNumber: 1,
      visitDate: '03 Nov 2026',
      visitTime: '09:00 WIB',
      inspectorName: 'Rian Saputra (Field Tech)',
      inspectorRole: 'Field Tech',
      visitType: 'INSTALASI_CONFIG',
      readinessScoreSnapshot: 68,
      summaryNote: 'Instalasi kabel UTP Cat6, rack MDF, router MikroTik, 3 AP Ruijie, dan 7 kamera CCTV selesai.',
      blockersFound: 2,
      statusRecommendation: 'RE_INSPECT',
      createdAt: '2026-11-03T09:00:00.000Z',
    },
    {
      id: 'vis-kbj-2',
      buildingId: building.id,
      visitNumber: 2,
      visitDate: '05 Nov 2026',
      visitTime: '14:00 WIB',
      inspectorName: 'Dimas Setiawan (QC Field Ops)',
      inspectorRole: 'QC Field Ops',
      visitType: 'FINAL_AUDIT_SIGN_OFF',
      readinessScoreSnapshot: 96,
      summaryNote: 'Uji ulang 18 kamar + 6 area bersama lulus standar 15 Mbps, CCTV online 7/7, takeover selesai.',
      blockersFound: 0,
      statusRecommendation: 'GO_LIVE',
      createdAt: '2026-11-05T14:00:00.000Z',
    },
  ];

  building.phase = 'LIVE';

  return { building, issues: createSampleIssues(building.id) };
}

export function createSampleIssues(buildingId: string): ColivingIssue[] {
  return [
    {
      id: 'ISS-9001',
      buildingId,
      category: 'INTERNET',
      location: 'Kamar 204 (Lantai 2)',
      issue: 'Kecepatan Wi-Fi drop ke 14 Mbps saat pintu kamar ditutup',
      vendorNote: 'Biznet / Teknisi AP Ruijie',
      status: 'RESOLVED',
      createdAt: '03 Nov 2026',
      resolvedAt: '04 Nov 2026',
      resolvedBy: 'Rian Saputra',
      resolutionNote: 'Posisi AP koridor digeser 1,5 m dan channel 5 GHz dipindah ke 149. Re-test stabil.',
      recheckSpeedMbps: 82,
      recheckSignalDbm: -55,
      recheckNotes: 'Re-test SpeedtestSheet: 82 Mbps down / 31 Mbps up / -55 dBm',
      resolutionTimestamp: '04 Nov 2026, 15:10 WIB',
    },
    {
      id: 'ISS-9002',
      buildingId,
      category: 'CCTV',
      location: 'Titik 4 (Dapur Bersama)',
      issue: 'CAM 04 offline di NVR, adaptor power DC tidak keluar tegangan',
      vendorNote: 'Teknisi CCTV Lokal',
      status: 'RESOLVED',
      createdAt: '03 Nov 2026',
      resolvedAt: '04 Nov 2026',
      resolvedBy: 'Dimas Setiawan',
      resolutionNote: 'Adaptor 12V 1A diganti baru, kamera online dan terekam di NVR.',
      resolutionTimestamp: '04 Nov 2026, 11:20 WIB',
    },
  ];
}
