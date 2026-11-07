// Status QC 1-tap per titik/perangkat: OK, Need Improvement, Rusak, atau Belum Tersedia.
// PENDING hanya dipakai sebagai "belum dinilai" (default perangkat baru) dan tidak
// punya tombol sendiri di UI.
export type CheckStatus = 'OK' | 'NEED_IMPROVE' | 'RUSAK' | 'BELUM_TERSEDIA' | 'PENDING';

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  OK: 'OK',
  NEED_IMPROVE: 'Need Improvement',
  RUSAK: 'Rusak',
  BELUM_TERSEDIA: 'Belum Tersedia',
  PENDING: 'Belum dinilai',
};

/** Titik sudah memenuhi standar (tidak butuh tindakan). */
export const isCheckOk = (status?: CheckStatus): boolean => status === 'OK';

/** Perlu perbaikan atau rusak — masuk blocker & kandidat tiket vendor. */
export const isCheckProblem = (status?: CheckStatus): boolean =>
  status === 'NEED_IMPROVE' || status === 'RUSAK';

/** Belum dinilai sama sekali. */
export const isCheckPending = (status?: CheckStatus): boolean =>
  status === 'PENDING' || status === undefined;

/** Migrasi nilai status lama (PASS/FAIL/NA) saat memuat data tersimpan. */
export const migrateCheckStatus = (status: unknown): CheckStatus => {
  switch (status) {
    case 'OK':
    case 'NEED_IMPROVE':
    case 'RUSAK':
    case 'BELUM_TERSEDIA':
    case 'PENDING':
      return status;
    case 'PASS':
      return 'OK';
    case 'FAIL':
      return 'RUSAK';
    case 'NA':
      return 'BELUM_TERSEDIA';
    default:
      return 'PENDING';
  }
};

// Jenis perangkat TV per kamar / area bersama.
export type TvType =
  | 'ANDROID_TV'
  | 'TV_DIGITAL'
  | 'TV_DIGITAL_STB_ANDROID'
  | 'TV_ANALOG_STB_DIGITAL'
  | 'TV_ANALOG_STB_ANDROID'
  | 'NONE';

export const TV_TYPE_OPTIONS: Array<{ value: TvType; label: string }> = [
  { value: 'ANDROID_TV', label: 'Android TV' },
  { value: 'TV_DIGITAL', label: 'TV Digital' },
  { value: 'TV_DIGITAL_STB_ANDROID', label: 'TV Digital + STB Android' },
  { value: 'TV_ANALOG_STB_DIGITAL', label: 'TV Analog + STB Digital' },
  { value: 'TV_ANALOG_STB_ANDROID', label: 'TV Analog + STB Android' },
  { value: 'NONE', label: 'Tidak Tersedia TV' },
];

export const TV_TYPE_LABELS: Record<TvType, string> = {
  ANDROID_TV: 'Android TV',
  TV_DIGITAL: 'TV Digital',
  TV_DIGITAL_STB_ANDROID: 'TV Digital + STB Android',
  TV_ANALOG_STB_DIGITAL: 'TV Analog + STB Digital',
  TV_ANALOG_STB_ANDROID: 'TV Analog + STB Android',
  NONE: 'Tidak Tersedia TV',
};

export const tvTypeLabel = (value?: TvType): string =>
  value ? TV_TYPE_LABELS[value] ?? 'Tipe TV belum diisi' : 'Tipe TV belum diisi';

export const migrateTvType = (value: unknown): TvType => {
  switch (value) {
    case 'ANDROID_TV':
    case 'TV_DIGITAL':
    case 'TV_DIGITAL_STB_ANDROID':
    case 'TV_ANALOG_STB_DIGITAL':
    case 'TV_ANALOG_STB_ANDROID':
    case 'NONE':
      return value;
    case 'ANDROID_GOOGLE_TV':
      return 'ANDROID_TV';
    case 'CABLE_TV':
      return 'TV_DIGITAL';
    default:
      return 'NONE';
  }
};

// Kemampuan streaming TV (Netflix) per kamar / area bersama.
export type TvStreamingCapability = 'NETFLIX_READY' | 'BASIC_ANDROID' | 'TV_DIGITAL';

export const TV_STREAMING_OPTIONS: Array<{ value: TvStreamingCapability; label: string }> = [
  { value: 'NETFLIX_READY', label: 'Netflix Ready' },
  { value: 'BASIC_ANDROID', label: 'Basic Android' },
  { value: 'TV_DIGITAL', label: 'TV Digital' },
];

export const TV_STREAMING_LABELS: Record<TvStreamingCapability, string> = {
  NETFLIX_READY: 'Netflix Ready',
  BASIC_ANDROID: 'Basic Android',
  TV_DIGITAL: 'TV Digital',
};

export const tvStreamingLabel = (value?: TvStreamingCapability): string =>
  value ? TV_STREAMING_LABELS[value] : 'Kemampuan streaming belum diisi';

export const migrateTvStreaming = (value: unknown): TvStreamingCapability | undefined => {
  switch (value) {
    case 'NETFLIX_READY':
    case 'BASIC_ANDROID':
    case 'TV_DIGITAL':
      return value;
    case 'SUPPORT':
      return 'NETFLIX_READY';
    case 'NOT_SUPPORT':
      return 'BASIC_ANDROID';
    default:
      return undefined;
  }
};

export type LockType = 'KUNCI_BIASA' | 'SMARTLOCK_HANDLE' | 'SMARTLOCK_GATE_ACCESS' | 'NONE';

// Alur kerja 3 fase + status live
export type BuildingPhase = 'SETUP' | 'PRE_OPENING' | 'OPENING' | 'LIVE';

// Serah terima akun & billing saat fase Opening
export interface HandoverSignOff {
  signedBy: string;
  role: string;
  signedAt: string; // ISO / tanggal teks
  accountsConfirmed: boolean; // akun perangkat sudah dipegang IT
  billingConfirmed: boolean; // billing ISP sudah dialihkan ke IT billing
  credentialsConfirmed: boolean; // kredensial tersimpan di password manager
  notes?: string;
}

export interface RoomColiving {
  id: string;
  number: string;
  floor: number;
  hasTv: boolean; // Menandai ketersediaan TV di kamar
  hasSmartlock: boolean; // Menandai apakah kamar menggunakan Smartlock atau Kunci Biasa
  wifiStatus: CheckStatus;
  wifiSpeedMbps: number;
  wifiSignalDbm?: number; // Level desibel sinyal Wi-Fi terdekat (e.g. -50 dBm)
  wifiBandTested?: '5GHz' | '2.4GHz' | 'DUAL_BAND';
  wifiSpeed24Mbps?: number; // Kecepatan download pada frekuensi 2.4 GHz
  wifiSignal24Dbm?: number; // Sinyal desibel pada frekuensi 2.4 GHz
  wifiDualBandSupport?: boolean; // true jika kedua frekuensi (5GHz & 2.4GHz) aktif & didukung
  wifiEvidenceUrl?: string; // URL / Base64 bukti sertifikat speedtest & coverage
  // Hasil uji (diisi dari SpeedtestSheet — angka asli, bukan simulasi)
  wifiUploadMbps?: number;
  wifiPingMs?: number;
  wifiTestedAt?: string;
  wifiTestSource?: 'BROWSER' | 'MANUAL' | 'NATIVE';
  // Standar smartlock: tap RFID < 1 detik, baterai > 80%
  lockBatteryPercent?: number;
  rfidTapMs?: number;
  hasBleMobileKey?: boolean;
  tvStatus: CheckStatus;
  lockStatus: CheckStatus;
  tvType?: TvType;
  netflixSupport?: TvStreamingCapability;
  lockType?: LockType;
  ttlockSupport?: TtlockSupportStatus;
  ttlockTakeoverStatus?: TakeoverStatus;
  ttlockAccountEmail?: string;
  type?: string;
  notes?: string;
  // Tracking issue & resolution evidence per pilar
  wifiIssueText?: string;
  wifiIssuePhoto?: string;
  wifiResolvedNote?: string;
  wifiResolvedPhoto?: string;
  tvIssueText?: string;
  tvIssuePhoto?: string;
  tvResolvedNote?: string;
  tvResolvedPhoto?: string;
  lockIssueText?: string;
  lockIssuePhoto?: string;
  lockResolvedNote?: string;
  lockResolvedPhoto?: string;
}

export type FacilityType = 'DAPUR' | 'BALCONY' | 'COMMUNAL_LOUNGE' | 'PAGAR_GERBANG' | 'ROOFTOP' | 'PARKIRAN' | 'LAUNDRY' | 'SERVER_IT' | 'LAINNYA';

export interface FloorFacility {
  id: string;
  name: string;
  type: FacilityType;
  floor: number;
  hasWifi: boolean;
  wifiStatus: CheckStatus;
  wifiSpeedMbps?: number;
  wifiSignalDbm?: number; // Level desibel sinyal Wi-Fi terdekat (e.g. -50 dBm)
  wifiBandTested?: '5GHz' | '2.4GHz' | 'DUAL_BAND';
  wifiSpeed24Mbps?: number; // Kecepatan download pada frekuensi 2.4 GHz
  wifiSignal24Dbm?: number; // Sinyal desibel pada frekuensi 2.4 GHz
  wifiDualBandSupport?: boolean; // true jika kedua frekuensi didukung
  wifiEvidenceUrl?: string; // URL / Base64 bukti sertifikat speedtest & coverage
  wifiUploadMbps?: number;
  wifiPingMs?: number;
  wifiTestedAt?: string;
  wifiTestSource?: 'BROWSER' | 'MANUAL' | 'NATIVE';
  lockBatteryPercent?: number;
  rfidTapMs?: number;
  hasBleMobileKey?: boolean;
  hasTv: boolean;
  tvType?: TvType;
  netflixSupport?: TvStreamingCapability;
  tvStatus: CheckStatus;
  hasLock: boolean;
  lockType: LockType;
  lockStatus: CheckStatus;
  ttlockSupport?: TtlockSupportStatus;
  ttlockTakeoverStatus?: TakeoverStatus;
  ttlockAccountEmail?: string;
  notes?: string;
  // Tracking issue & resolution evidence per pilar
  wifiIssueText?: string;
  wifiIssuePhoto?: string;
  wifiResolvedNote?: string;
  wifiResolvedPhoto?: string;
  tvIssueText?: string;
  tvIssuePhoto?: string;
  tvResolvedNote?: string;
  tvResolvedPhoto?: string;
  lockIssueText?: string;
  lockIssuePhoto?: string;
  lockResolvedNote?: string;
  lockResolvedPhoto?: string;
}

export type DeviceCategory = 
  | 'WIRELESS_DEVICE'
  | 'SWITCH'
  | 'ROUTER_GATEWAY'
  | 'SURVEILLANCE'
  | 'CABLE_TV'
  | 'SMART_LOCK'
  | 'RACK'
  | 'LAINNYA'
  // Backward compatibility aliases
  | 'ACCESS_POINT'
  | 'SWITCH_POE'
  | 'ROUTER_MODEM'
  | 'CCTV_NVR'
  | 'SMARTLOCK_GATEWAY'
  | 'STB_TV';

export const ASSET_CATEGORIES: Record<string, { label: string; subCategories: string[] }> = {
  WIRELESS_DEVICE: {
    label: 'Wireless Device',
    subCategories: ['Access Point', 'Router Wireless Desktop'],
  },
  SWITCH: {
    label: 'Switch',
    subCategories: ['Switch Managed', 'Switch Unmanaged', 'Switch POE Managed', 'Switch POE Unmanaged'],
  },
  ROUTER_GATEWAY: {
    label: 'Router Gateway',
    subCategories: ['Router'],
  },
  SURVEILLANCE: {
    label: 'Surveillance',
    subCategories: ['Camera CCTV', 'IP Camera CCTV', 'Wireless Camera CCTV', 'DVR', 'NVR', 'HDD', 'Layar CCTV'],
  },
  CABLE_TV: {
    label: 'Cable TV',
    subCategories: ['STB Digital', 'STB Android', 'Smart TV', 'Google TV'],
  },
  SMART_LOCK: {
    label: 'Smart Lock',
    subCategories: ['Smartlock Handle', 'Smartlock Non handle', 'Access Door', 'Access Card'],
  },
  RACK: {
    label: 'Rack',
    subCategories: ['Wall Mount', 'Standing Rack', 'Ambalan kayu', 'Lemari Kabinet'],
  },
  LAINNYA: {
    label: 'Lainnya',
    subCategories: ['Lainnya'],
  },
};

export type TakeoverStatus = 'SUDAH_TAKEOVER' | 'BELUM_TAKEOVER' | 'PROSES_TAKEOVER';

// Kondisi fisik aset saat inspeksi Pre-Opening (bukan status konfigurasi — itu milik fase Opening).
export type AssetCondition = 'OK' | 'NEED_IMPROVE' | 'RUSAK';

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  OK: 'OK',
  NEED_IMPROVE: 'Need improve',
  RUSAK: 'Rusak',
};

export type NetflixSupportStatus = 'SUPPORT' | 'NOT_SUPPORT' | 'NOT_TESTED';

export type TtlockSupportStatus = 'SUPPORT_TTLOCK' | 'NON_TTLOCK';

export interface ITDevice {
  id: string;
  name: string; // e.g. "AP Koridor Lt 2", "Switch PoE IDF-1", "Router MikroTik"
  brandModel: string; // e.g. "Ruijie Reyee RG-RAP2200(E)", "MikroTik hEX RB750Gr3"
  category: DeviceCategory;
  subCategory?: string; // Sub-kategori e.g. "Access Point", "Switch POE Managed", "NVR", dll.
  floorNumber: number;
  floorId: string;
  locationDetail: string; // e.g. "Plafon depan Kamar 204", "Rack MDF Lt 1"
  ipAddress?: string; // Optional: e.g. "192.168.1.12"
  macAddress?: string; // e.g. "D8:0D:17:2A:3B:4C"
  serialNumber: string; // e.g. "SN: RJ-RAP-0214"
  adminUser: string; // e.g. "admin"
  adminPassword: string; // e.g. "Rukita@Wifi26"
  portUplink?: string; // e.g. "Port 4 PoE Switch IDF-1"
  configStatus: 'CONFIGURED' | 'NEEDS_CONFIG' | 'OFFLINE';
  condition?: AssetCondition; // Kondisi fisik aset (OK / Need improve / Rusak) — diisi saat Pre-Opening
  ssidStatus?: 'SSID_CHANGED' | 'SSID_DEFAULT'; // Go Live Preparation: apakah SSID bawaan sudah diganti ke standar gedung
  ssidName?: string; // Nama broadcast SSID yang sudah diterapkan
  netflixSupport?: NetflixSupportStatus; // Dukungan pemutaran aplikasi Netflix (Widevine L1 certified)
  ttlockSupport?: TtlockSupportStatus; // Dukungan platform smartlock TTLock
  ttlockTakeoverStatus?: TakeoverStatus; // Status takeover akun master TTLock dari Owner lama
  ttlockAccountEmail?: string; // Email akun admin TTLock terikat (misal: it.smartlock@rukita.co)
  notes?: string;
  // Takeover Master Akses & Cloud Unbinding
  takeoverStatus?: TakeoverStatus; // SUDAH_TAKEOVER | BELUM_TAKEOVER | PROSES_TAKEOVER
  cloudUnbindStatus?: 'UNBOUND' | 'STILL_BOUND' | 'NOT_APPLICABLE'; // Unbind dari akun lama & bind ke akun master IT
  takeoverDate?: string;
  takeoverNotes?: string;
  photoUrl?: string; // URL / Base64 foto fisik perangkat atau label SN
}

export interface FloorConfig {
  id: string;
  floorNumber: number;
  name: string; // e.g. "Lantai 1", "Lantai 2"
  rooms: RoomColiving[];
  facilities: FloorFacility[];
  floorPlanSketch?: string; // Data URL PNG dari touch & draw canvas
  floorPlanUpdatedAt?: string; // Waktu update denah (e.g. "19 Okt 2026 14:30")
  floorPlanNotes?: string; // Catatan teknis denah lantai
  floorPlanElements?: string; // JSON serialized FloorPlanElement[] for full re-editability
}

export type CCTVOperationalStatus = 
  | 'ONLINE' 
  | 'OFFLINE' 
  | 'BELUM_DIKETAHUI' 
  | 'PERLU_REPOSISI' 
  | 'PERLU_INSTALASI';

export type CCTVConnectivityType = 
  | 'COAXIAL_DVR'          // 1. Coaxial to DVR
  | 'LAN_POE_NVR'          // 2. LAN POE to NVR
  | 'LAN_NON_POE_NVR'      // 3. LAN Non POE to NVR
  | 'WIFI_CAM_STANDALONE'  // 4. Wifi Camera Standalone
  | 'WIFI_CAM_NVR';        // 5. Wifi Camera to NVR

export const CCTV_CONNECTIVITY_CONFIG: Record<CCTVConnectivityType, {
  label: string;
  shortLabel: string;
  description: string;
  isStandalone: boolean;
  colorClass: string;
  badgeClass: string;
}> = {
  COAXIAL_DVR: {
    label: 'Coaxial to DVR',
    shortLabel: 'Coaxial DVR',
    description: 'Kabel Coaxial RG59/RG6 + Power DC terhubung ke DVR Analog',
    isStandalone: false,
    colorClass: 'text-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  LAN_POE_NVR: {
    label: 'LAN POE to NVR',
    shortLabel: 'LAN POE',
    description: 'Kabel UTP RJ45 dengan Power over Ethernet langsung ke Switch PoE / NVR',
    isStandalone: false,
    colorClass: 'text-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  LAN_NON_POE_NVR: {
    label: 'LAN Non POE to NVR',
    shortLabel: 'LAN Non-POE',
    description: 'Kabel UTP data LAN + Adaptor Listrik DC terpisah terhubung ke NVR',
    isStandalone: false,
    colorClass: 'text-cyan-500',
    badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  },
  WIFI_CAM_STANDALONE: {
    label: 'Wifi Camera Standalone',
    shortLabel: 'Wi-Fi Standalone',
    description: 'Kamera wireless independen (MicroSD/Cloud App, perlu takeover master akses)',
    isStandalone: true,
    colorClass: 'text-purple-500',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  },
  WIFI_CAM_NVR: {
    label: 'Wifi Camera to NVR',
    shortLabel: 'Wi-Fi to NVR',
    description: 'Kamera wireless terhubung via Wi-Fi Access Point dan direkam ke NVR',
    isStandalone: false,
    colorClass: 'text-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
};

export interface CCTVPoint {
  id: string;
  channel?: number; // Opsional port channel NVR jika sudah terhubung
  pointNumber?: number; // Nomor urut titik CCTV (1, 2, 3...)
  locationName: string; // e.g. "Titik 1", "Titik 2"
  objectCoverage?: string; // Target objek coverage (diisi manual)
  floorNumber?: number; // Opsional lantai kamera (1, 2, 3...)
  cctvStatus?: CCTVOperationalStatus; // ONLINE | OFFLINE | BELUM_DIKETAHUI | PERLU_REPOSISI | PERLU_INSTALASI
  connectivityType?: CCTVConnectivityType; // Tipe konektivitas kamera ke perekam / cloud
  status: CheckStatus; // PASS (Online & Rekam), FAIL (Offline / Perlu Reposisi), PENDING (Belum Diketahui / Perlu Instalasi)
  isRecording: boolean;
  notes?: string;
  installationStatus?: 'TERPASANG' | 'BELUM_TERPASANG' | 'PERLU_RELOKASI';
  linkedIssueId?: string; // ID tiket issue jika tercatat sebagai kendala
  // CCTV IP Cam Standalone & Takeover Master Akses
  isStandalone?: boolean; // true jika IP Cam Standalone (non-NVR / independent Wi-Fi cam seperti Tapo/Ezviz/Bardi)
  takeoverStatus?: TakeoverStatus; // SUDAH_TAKEOVER | BELUM_TAKEOVER | PROSES_TAKEOVER
  masterAccount?: string; // Akun/Email master pengelola (e.g. "siaga.it@rukita.co")
  takeoverDate?: string;
}

export interface ColivingIssue {
  id: string;
  buildingId: string;
  category: 'INTERNET' | 'CCTV' | 'TV' | 'SMARTLOCK';
  location: string;
  issue: string;
  vendorNote: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  photoUrl?: string; // Foto bukti kendala saat dilaporkan
  photoTimestamp?: string; // Tanggal / waktu foto bukti
  resolutionNote?: string; // Alasan / tindakan perbaikan saat di-solve
  resolutionPhotoUrl?: string; // Foto bukti perbaikan setelah di-solve
  resolutionTimestamp?: string; // Tanggal / waktu foto penyelesaian
  resolvedAt?: string; // Waktu status diubah ke SOLVED
  resolvedBy?: string; // Nama teknisi yang menyelesaikan
  recheckSpeedMbps?: number; // Hasil re-QC speedtest (Mbps) jika kategori INTERNET
  recheckSignalDbm?: number; // Hasil re-QC sinyal (dBm) jika kategori INTERNET
  recheckNotes?: string; // Catatan verifikasi re-QC teknisi
}

export type InternetRole = 'PRIMARY' | 'BACKUP' | 'DEDICATED_CCTV' | 'OPERASIONAL';
export type InternetStatus = 'AKTIF' | 'PENDING_INSTALL' | 'TESTING' | 'GANGGUAN';
export type BillingTakeoverStatus = 'SUDAH_TAKEOVER' | 'BELUM_TAKEOVER' | 'PROSES_TAKEOVER';

export interface InternetConnection {
  id: string;
  ispName: string; // e.g. "Biznet", "IndiHome Fiber", "MyRepublic"
  packageName?: string; // Paket Internet (e.g. "Metronet Dedicated 2B", "Bisnis Pro 100M")
  role: InternetRole; // Primary, Backup, Dedicated CCTV, etc.
  speedMbps: number; // Bandwidth dalam Mbps (e.g. 150, 200, 300)
  customerNumber: string; // ID Pelanggan / Circuit ID / No. Internet (e.g. "CID-8829103")
  accountHolder?: string; // Atas Nama Tagihan (e.g. "PT Rukita Bhineka Nusantara" / "Nama Owner")
  isBillingTakeover?: boolean; // true jika sudah di-take over ke it.billing@rukita.co
  billingTakeoverStatus?: BillingTakeoverStatus; // 'SUDAH_TAKEOVER' | 'BELUM_TAKEOVER' | 'PROSES_TAKEOVER'
  billingEmail?: string; // Email terdaftar di ISP (default "it.billing@rukita.co")
  registeredPhone?: string; // Nomor telepon terdaftar di ISP (e.g. "0811-9823-123")
  billingTakeoverDate?: string; // e.g. "15 Okt 2026"
  ipPublic?: string; // IP Publik Static / Dynamic (e.g. "103.28.12.45")
  modemWanPort?: string; // e.g. "MikroTik ether1-WAN1"
  nocContact?: string; // e.g. "1500988 / support@biznetnetworks.com"
  monthlyCost?: string; // e.g. "Rp 1.500.000 / bln"
  status: InternetStatus; // 'AKTIF' | 'PENDING_INSTALL' | 'TESTING' | 'GANGGUAN'
  notes?: string;
}

export type WifiStandardizationStatus = 'STANDAR_TERAPKAN' | 'BELUM_DISERAGAMKAN' | 'SEDANG_PROSES';

/** Model konfigurasi SSID: satu SSID untuk semua, banyak SSID di satu AP, atau SSID terpisah per fungsi. */
export type WifiConfigModel = 'SINGLE' | 'MULTI' | 'PISAH';

/**
 * Catatan konfigurasi Wi-Fi (informasi/dokumentasi).
 * Tidak dipakai menghitung Opening Score — skor Opening hanya dari perangkat, akun, billing.
 */
export interface WifiStandardProfile {
  guestSsid: string;          // e.g. "@Rukita Tawakal Community"
  guestPassword: string;      // e.g. "RukitaLive2026!"
  configModel?: WifiConfigModel; // Single SSID / Multi SSID / Pisah SSID
  isCaptivePortal: boolean;   // true if uses captive portal instead of WPA password
  opsSsid?: string;           // Internal Ops / Staff, e.g. "Rukita-Ops-Secure"
  opsPassword?: string;       // e.g. "Ops#Tomang2026"
  iotSsid?: string;           // Dedicated 2.4 GHz for Smartlock Gateway & TV, e.g. "Rukita-IoT-Devices"
  iotPassword?: string;       // e.g. "Iot#LockTv2026"
  status: WifiStandardizationStatus;
  appliedDate?: string;
  verifiedBy?: string;
  notes?: string;
}

export type VisitType = 'SURVEY_AWAL' | 'INSTALASI_CONFIG' | 'QC_PROGRESS' | 'FINAL_AUDIT_SIGN_OFF' | 'RE_INSPECT';

export interface InspectionVisit {
  id: string;
  buildingId: string;
  visitNumber: number; // e.g. 1, 2, 3
  visitDate: string; // e.g. "19 Okt 2026"
  visitTime?: string; // e.g. "14:30 WIB"
  inspectorName: string; // e.g. "Budi Pratama (IT Lead)"
  inspectorRole?: string; // e.g. "IT Lead" | "Field Tech"
  visitType: VisitType;
  readinessScoreSnapshot: number; // e.g. 94 (%)
  summaryNote: string;
  blockersFound?: number;
  statusRecommendation: 'GO_LIVE' | 'RE_INSPECT' | 'BLOCKER';
  createdAt: string;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  openingDate: string; // Target Live Date (misal: "01 Nov 2026")
  presaleDate?: string; // Tanggal Pre-Sale Opsional (misal: "27 Okt 2026"). Jika terisi, Due Date IT adalah H-3 Pre-sale; jika tidak ada, H-3 Live Date.
  ispProvider: string;
  phase?: BuildingPhase; // Fase onboarding: SETUP -> PRE_OPENING -> OPENING -> LIVE
  /**
   * Revisi sinkron dari server (`serve.py`): naik satu setiap kali gedung ini
   * disimpan. Dipakai sebagai `baseRev` saat kirim supaya server bisa menolak
   * simpanan yang mendasari data basi (409) — hanya gedung ini yang ditulis,
   * gedung properti lain tidak pernah ikut tertimpa.
   */
  rev?: number;
  /** Waktu ISO saat server terakhir menerima perubahan gedung ini. */
  updatedAt?: string;
  internetConnections?: InternetConnection[];
  wifiStandardProfile?: WifiStandardProfile;
  handover?: HandoverSignOff;
  cctvRetentionDays?: number; // Standar Rukita: >= 30 hari retensi NVR
  inspectionVisits?: InspectionVisit[];
  floors: FloorConfig[];
  cctvPoints: CCTVPoint[];
  devices: ITDevice[];
}

export type UserRole = 'ADMIN' | 'BACKOFFICE' | 'TEKNISI';

export type AppModuleId = 
  | 'dashboard'
  | 'calendar'
  | 'property'
  | 'evaluation'
  | 'cctv'
  | 'devices'
  | 'issues'
  | 'readiness'
  | 'evidence'
  | 'user_management';

export interface AppModuleDefinition {
  id: AppModuleId;
  label: string;
  category: 'PORTFOLIO' | 'PROPERTY_QC' | 'ADMIN';
  description: string;
  defaultRoles: UserRole[];
}

export interface SimpleUser {
  id: string;
  username: string; // Identifier login yang disetting oleh Backoffice (e.g. "budi.admin", "rian.teknisi")
  name: string;
  role: UserRole;
  roleTitle?: string;
  email?: string;
  phone?: string;
  pin: string;
  permissions: AppModuleId[];
  isActive: boolean;
  avatarColor?: string;
  createdAt?: string;
  // Keamanan Login & Pembatasan Percobaan PIN
  failedAttempts: number; // Jumlah percobaan PIN yang gagal
  lockedUntil?: string | null; // Waktu ISO penangguhan sementara (5 menit) jika salah 3x
  isBlocked?: boolean; // Diblokir total jika salah berulang kali, memerlukan izin Admin Backoffice
}

export type EvidenceCategory = 
  | 'WIFI_SPEEDTEST'
  | 'TV_CHECK'
  | 'SMARTLOCK_CHECK'
  | 'FACILITY_CHECK'
  | 'CCTV_CHECK'
  | 'DEVICE_ASSET'
  | 'GENERAL_EVIDENCE';

export interface EvidenceMedia {
  id: string;
  buildingId: string;
  buildingSlug: string;
  entityId: string; // roomId, deviceId, facilityId, cctvId
  entityName: string; // "Kamar 101", "Ruijie AP Koridor Lt 1", etc.
  category: EvidenceCategory;
  mediaType: 'image' | 'video';
  fileUrl: string; // base64 data URL for persistent offline viewing
  fileName: string; // auto-renamed standard filename, e.g. TMG_WIFI_RM101_SPEEDTEST_20261025_143522.jpg
  folderPath: string; // e.g. "evidence/rukita-tawakal-tomang/kamar-101/"
  originalName: string;
  sizeBytes: number;
  capturedAt: string; // ISO date string
  notes?: string;
}
