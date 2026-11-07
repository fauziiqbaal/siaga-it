import type { Building, BuildingPhase, ColivingIssue } from '../types/hotel';

/**
 * Dua lembar penilaian Rukita Property QC:
 *
 * 1. PRE-OPENING SCORE — kualitas & kelengkapan data saat survey/QC:
 *    coverage pengujian, temuan (pass/fail), kelengkapan aset & billing.
 * 2. OPENING SCORE — kesiapan serah terima: konfigurasi perangkat, takeover akun,
 *    takeover billing ISP, dan rekaman CCTV. Catatan SSID dan Berita Acara Serah Terima bersifat informasi dan TIDAK dinilai dalam skor.
 *
 * Keduanya berbobot 100 dan hanya memakai data yang benar-benar diisi teknisi
 * di lapangan (tidak ada angka simulasi).
 */

export type PhaseKey = 'PRE_OPENING' | 'OPENING';
export type ScoreGrade = 'A' | 'B' | 'C' | 'D';

export interface ScorePillarResult {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..weight
  note: string;
}

export interface CategorizedBlockerGroup {
  category: string;
  items: string[];
}

export interface PhaseScoreResult {
  phase: PhaseKey;
  total: number;
  grade: ScoreGrade;
  verdict: string;
  pillars: ScorePillarResult[];
  coverage: {
    testedWifi: number;
    totalWifi: number;
    wifiPercent: number;
    openIssues: number;
    resolvedIssues: number;
  };
  blockers: string[];
  categorizedBlockers: CategorizedBlockerGroup[];
}

export function groupBlockersByCategory(blockers: string[]): CategorizedBlockerGroup[] {
  const groups: Record<string, string[]> = {
    'Jaringan & Wi-Fi': [],
    'Keamanan & CCTV': [],
    'Smartlock & Fasilitas Kamar': [],
    'Aset & Perangkat IT': [],
    'Billing & Legalitas ISP': [],
    'Kendala Lapangan': [],
  };

  blockers.forEach((blocker) => {
    const lower = blocker.toLowerCase();
    if (lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('ssid')) {
      groups['Jaringan & Wi-Fi'].push(blocker);
    } else if (lower.includes('cctv') || lower.includes('nvr') || lower.includes('kamera')) {
      groups['Keamanan & CCTV'].push(blocker);
    } else if (
      lower.includes('smartlock') ||
      lower.includes('ttlock') ||
      lower.includes('kunci') ||
      lower.includes('akses') ||
      lower.includes('tv')
    ) {
      groups['Smartlock & Fasilitas Kamar'].push(blocker);
    } else if (lower.includes('perangkat') || lower.includes('inventaris')) {
      groups['Aset & Perangkat IT'].push(blocker);
    } else if (lower.includes('billing') || lower.includes('tagihan') || lower.includes('isp')) {
      groups['Billing & Legalitas ISP'].push(blocker);
    } else if (lower.includes('kendala') || lower.includes('tracker')) {
      groups['Kendala Lapangan'].push(blocker);
    } else {
      if (!groups['Lainnya']) groups['Lainnya'] = [];
      groups['Lainnya'].push(blocker);
    }
  });

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([category, items]) => ({ category, items }));
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const part = (weight: number, ratio: number) => Math.round(weight * clamp01(ratio) * 10) / 10;
const pct = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);
const ratioOrFull = (done: number, total: number) => (total > 0 ? done / total : 1);

function gradeOf(total: number): { grade: ScoreGrade; verdict: string } {
  if (total >= 90) return { grade: 'A', verdict: 'Layak — standar IT terpenuhi' };
  if (total >= 75) return { grade: 'B', verdict: 'Layak dengan catatan perbaikan' };
  if (total >= 60) return { grade: 'C', verdict: 'Perlu perbaikan sebelum opening' };
  return { grade: 'D', verdict: 'Blocker — belum layak di-opening' };
}

export const GRADE_STYLE: Record<ScoreGrade, { text: string; bg: string; border: string }> = {
  A: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  B: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  C: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  D: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
};

function buildingIssueStats(building: Building, issues: ColivingIssue[]) {
  const mine = issues.filter((issue) => issue.buildingId === building.id);
  return {
    open: mine.filter((issue) => issue.status === 'OPEN').length,
    resolved: mine.filter((issue) => issue.status === 'RESOLVED').length,
  };
}

export function calculatePreOpeningScore(
  building: Building,
  issues: ColivingIssue[] = [],
): PhaseScoreResult {
  const rooms = building.floors.flatMap((floor) => floor.rooms);
  const facilities = building.floors.flatMap((floor) => floor.facilities);
  const wifiFacilities = facilities.filter((facility) => facility.hasWifi);

  const wifiEndpoints = [
    ...rooms.map((room) => ({ label: `Kamar ${room.number}`, status: room.wifiStatus })),
    ...wifiFacilities.map((facility) => ({ label: facility.name, status: facility.wifiStatus })),
  ];
  const totalWifi = wifiEndpoints.length;
  const hasRoomData = rooms.length + facilities.length > 0;
  const isProblem = (status?: string) => status === 'NEED_IMPROVE' || status === 'RUSAK';
  const testedWifi = wifiEndpoints.filter((item) => item.status === 'OK' || isProblem(item.status)).length;
  const passWifi = wifiEndpoints.filter((item) => item.status === 'OK').length;
  const failWifi = wifiEndpoints.filter((item) => isProblem(item.status));

  const cctvPoints = building.cctvPoints || [];
  const cctvOk = cctvPoints.filter((point) => point.status === 'OK' && point.isRecording).length;
  const cctvNotOk = cctvPoints.filter((point) => point.status !== 'OK' || !point.isRecording);
  const retentionDays = building.cctvRetentionDays ?? 0;

  const tvEndpoints = [
    ...rooms.filter((room) => room.hasTv).map((room) => ({ label: `Kamar ${room.number}`, status: room.tvStatus })),
    ...facilities.filter((facility) => facility.hasTv).map((facility) => ({ label: facility.name, status: facility.tvStatus })),
  ];
  const tvPass = tvEndpoints.filter((item) => item.status === 'OK').length;
  const tvFail = tvEndpoints.filter((item) => isProblem(item.status));

  const lockEndpoints = [
    ...rooms.filter((room) => room.hasSmartlock).map((room) => ({ label: `Kamar ${room.number}`, status: room.lockStatus })),
    ...facilities.filter((facility) => facility.hasLock).map((facility) => ({ label: facility.name, status: facility.lockStatus })),
  ];
  const lockPass = lockEndpoints.filter((item) => item.status === 'OK').length;
  const lockFail = lockEndpoints.filter((item) => isProblem(item.status));

  const devices = building.devices || [];
  const configuredDevices = devices.filter((device) => device.configStatus === 'CONFIGURED').length;
  const categories = new Set(devices.map((device) => device.category));
  const requiredCategories = ['ROUTER_GATEWAY', 'SWITCH', 'WIRELESS_DEVICE', 'SURVEILLANCE'];
  const categoriesPresent = requiredCategories.filter((category) => {
    if (categories.has(category as never)) return true;
    if (category === 'SWITCH') return categories.has('SWITCH_POE');
    if (category === 'WIRELESS_DEVICE') return categories.has('ACCESS_POINT');
    if (category === 'SURVEILLANCE') return categories.has('CCTV_NVR');
    return false;
  }).length;

  const connections = building.internetConnections || [];
  const billingCompleteness = connections.length
    ? connections.reduce((sum, connection) => {
        const filled = [
          Boolean(connection.customerNumber),
          Boolean(connection.packageName),
          (connection.speedMbps || 0) > 0,
          Boolean(connection.billingEmail || connection.accountHolder),
        ].filter(Boolean).length;
        return sum + filled / 4;
      }, 0) / connections.length
    : 0;

  const pillars: ScorePillarResult[] = [
    {
      key: 'wifi',
      label: 'Internet & Wi-Fi',
      weight: 30,
      score: part(10, totalWifi ? testedWifi / totalWifi : 0) + part(20, totalWifi ? passWifi / totalWifi : 0),
      note: totalWifi
        ? `${passWifi}/${totalWifi} titik OK · coverage uji ${pct(testedWifi, totalWifi)}%`
        : 'Belum ada kamar / area dengan titik Wi-Fi',
    },
    {
      key: 'cctv',
      label: 'CCTV & Security',
      weight: 20,
      score: part(15, cctvPoints.length ? cctvOk / cctvPoints.length : 0) + part(5, retentionDays >= 30 ? 1 : 0),
      note: cctvPoints.length
        ? `${cctvOk}/${cctvPoints.length} kamera online & merekam · retensi ${retentionDays || 0} hari`
        : 'Belum ada titik CCTV terdata',
    },
    {
      key: 'smartlock',
      label: 'Smartlock & Access',
      weight: 15,
      score: part(15, hasRoomData ? ratioOrFull(lockPass, lockEndpoints.length) : 0),
      note: !hasRoomData
        ? 'Belum ada data kamar / area'
        : lockEndpoints.length
          ? `${lockPass}/${lockEndpoints.length} kunci OK`
          : 'Tidak ada smartlock terpasang (kunci biasa)',
    },
    {
      key: 'tv',
      label: 'TV & IPTV',
      weight: 10,
      score: part(10, hasRoomData ? ratioOrFull(tvPass, tvEndpoints.length) : 0),
      note: !hasRoomData
        ? 'Belum ada data kamar / area'
        : tvEndpoints.length
          ? `${tvPass}/${tvEndpoints.length} TV OK`
          : 'Tidak ada TV terpasang',
    },
    {
      key: 'assets',
      label: 'Inventaris Aset IT',
      weight: 15,
      score: part(10, devices.length ? configuredDevices / devices.length : 0) + part(5, categoriesPresent / 4),
      note: devices.length
        ? `${configuredDevices}/${devices.length} perangkat terkonfigurasi · ${categoriesPresent}/4 kategori wajib`
        : 'Belum ada inventaris perangkat',
    },
    {
      key: 'billing',
      label: 'Data Internet & Billing',
      weight: 10,
      score: part(10, billingCompleteness),
      note: connections.length
        ? `${connections.length} koneksi ISP · kelengkapan data ${Math.round(billingCompleteness * 100)}%`
        : 'Belum ada data koneksi ISP / CID',
    },
  ];

  const total = Math.round(pillars.reduce((sum, pillar) => sum + pillar.score, 0));
  const { grade, verdict } = gradeOf(total);
  const issueStats = buildingIssueStats(building, issues);

  const blockers: string[] = [];
  if (totalWifi === 0) blockers.push('Data kamar / area bersama belum diisi pada fase setup.');
  if (failWifi.length > 0) {
    const names = failWifi.slice(0, 3).map((item) => item.label).join(', ');
    blockers.push(`${failWifi.length} titik Wi-Fi bermasalah / belum OK (${names}${failWifi.length > 3 ? ', …' : ''}).`);
  }
  if (totalWifi > 0 && testedWifi < totalWifi) {
    blockers.push(`${totalWifi - testedWifi} titik Wi-Fi belum diuji (coverage ${pct(testedWifi, totalWifi)}%).`);
  }
  if (cctvPoints.length === 0) blockers.push('Belum ada titik CCTV terdata.');
  if (cctvNotOk.length > 0) blockers.push(`${cctvNotOk.length} titik CCTV offline / belum merekam.`);
  if (retentionDays < 30) blockers.push('Retensi rekaman NVR belum memenuhi standar 30 hari.');
  if (devices.length === 0) blockers.push('Inventaris perangkat IT belum diisi.');
  else if (configuredDevices < devices.length) blockers.push(`${devices.length - configuredDevices} perangkat belum terkonfigurasi.`);
  if (connections.length === 0) blockers.push('Data billing internet (ISP, CID, paket) belum diisi.');
  if (lockFail.length > 0) blockers.push(`${lockFail.length} smartlock/akses belum OK (Need Improvement / Rusak).`);
  if (tvFail.length > 0) blockers.push(`${tvFail.length} TV belum OK (Need Improvement / Rusak).`);
  if (issueStats.open > 0) blockers.push(`${issueStats.open} kendala masih OPEN di tracker.`);

  return {
    phase: 'PRE_OPENING',
    total,
    grade,
    verdict,
    pillars,
    coverage: {
      testedWifi,
      totalWifi,
      wifiPercent: pct(testedWifi, totalWifi),
      openIssues: issueStats.open,
      resolvedIssues: issueStats.resolved,
    },
    blockers,
    categorizedBlockers: groupBlockersByCategory(blockers),
  };
}

export function calculateOpeningScore(
  building: Building,
  issues: ColivingIssue[] = [],
): PhaseScoreResult {
  const rooms = building.floors.flatMap((floor) => floor.rooms);
  const facilities = building.floors.flatMap((floor) => floor.facilities);
  const devices = building.devices || [];
  const connections = building.internetConnections || [];
  const cctvPoints = building.cctvPoints || [];

  const configuredDevices = devices.filter((device) => device.configStatus === 'CONFIGURED').length;
  const wirelessDevices = devices.filter(
    (device) => device.category === 'WIRELESS_DEVICE' || device.category === 'ACCESS_POINT',
  );
  const ssidApplied = wirelessDevices.filter((device) => device.ssidStatus === 'SSID_CHANGED').length;
  const deviceConfigScore =
    part(18, devices.length ? configuredDevices / devices.length : 0) +
    part(12, wirelessDevices.length ? ssidApplied / wirelessDevices.length : 0);

  const standaloneCctv = cctvPoints.filter((point) => point.isStandalone);
  const standaloneTakenOver = standaloneCctv.filter((point) => point.takeoverStatus === 'SUDAH_TAKEOVER').length;
  const lockEndpoints = [
    ...rooms.filter((room) => room.hasSmartlock),
    ...facilities.filter((facility) => facility.hasLock),
  ];
  const locksTakenOver = lockEndpoints.filter((item) => item.ttlockTakeoverStatus === 'SUDAH_TAKEOVER').length;
  // Takeover hanya untuk akun CCTV standalone & smartlock TTLock.
  // Akun perangkat jaringan cukup dicatat lewat status cloud (unbind), tidak dinilai.
  const hasTakeoverData = devices.length > 0 || standaloneCctv.length > 0 || lockEndpoints.length > 0;
  const takeoverScore = hasTakeoverData
    ? part(14, ratioOrFull(standaloneTakenOver, standaloneCctv.length)) +
      part(11, ratioOrFull(locksTakenOver, lockEndpoints.length))
    : 0;

  const billingTakenOver = connections.filter(
    (connection) => connection.billingTakeoverStatus === 'SUDAH_TAKEOVER' || connection.isBillingTakeover,
  ).length;
  const billingScore = part(30, connections.length ? billingTakenOver / connections.length : 0);

  const cctvOnline = cctvPoints.filter((point) => point.status === 'OK' && point.isRecording).length;
  const retentionDays = building.cctvRetentionDays ?? 0;
  const recordingScore =
    part(10, cctvPoints.length ? cctvOnline / cctvPoints.length : 0) + part(5, retentionDays >= 30 ? 1 : 0);

  const pillars: ScorePillarResult[] = [
    {
      key: 'device_config',
      label: 'Konfigurasi Perangkat',
      weight: 30,
      score: deviceConfigScore,
      note: devices.length
        ? `${configuredDevices}/${devices.length} terkonfigurasi · ${ssidApplied}/${wirelessDevices.length} SSID diganti`
        : 'Belum ada perangkat',
    },
    {
      key: 'takeover',
      label: 'Takeover Akun CCTV & Smartlock',
      weight: 25,
      score: takeoverScore,
      note: `CCTV standalone ${standaloneTakenOver}/${standaloneCctv.length} · Smartlock ${locksTakenOver}/${lockEndpoints.length}`,
    },
    {
      key: 'billing_takeover',
      label: 'Takeover Billing ISP',
      weight: 30,
      score: billingScore,
      note: connections.length
        ? `${billingTakenOver}/${connections.length} koneksi sudah dialihkan`
        : 'Belum ada koneksi ISP terdata',
    },
    {
      key: 'recording',
      label: 'Standar Rekaman CCTV',
      weight: 15,
      score: recordingScore,
      note: `${cctvOnline}/${cctvPoints.length} kamera online & merekam · retensi ${retentionDays || 0} hari`,
    },
  ];

  const total = Math.round(pillars.reduce((sum, pillar) => sum + pillar.score, 0));
  const { grade, verdict } = gradeOf(total);
  const issueStats = buildingIssueStats(building, issues);

  const blockers: string[] = [];
  if (devices.length === 0) blockers.push('Belum ada perangkat untuk dikonfigurasi / di-takeover.');
  else if (configuredDevices < devices.length) blockers.push(`${devices.length - configuredDevices} perangkat belum CONFIGURED.`);
  if (wirelessDevices.length > 0 && ssidApplied < wirelessDevices.length) {
    blockers.push(`${wirelessDevices.length - ssidApplied} perangkat wireless masih memakai SSID default.`);
  }
  if (standaloneCctv.length > 0 && standaloneTakenOver < standaloneCctv.length) {
    blockers.push(`${standaloneCctv.length - standaloneTakenOver} akun CCTV standalone masih milik pihak lama.`);
  }
  if (lockEndpoints.length > 0 && locksTakenOver < lockEndpoints.length) {
    blockers.push(`${lockEndpoints.length - locksTakenOver} akun smartlock/TTLock belum di-takeover.`);
  }
  if (connections.length === 0) blockers.push('Belum ada data billing ISP untuk dialihkan.');
  else if (billingTakenOver < connections.length) blockers.push(`${connections.length - billingTakenOver} tagihan ISP belum dialihkan ke billing IT.`);
  if (cctvPoints.length === 0) blockers.push('Belum ada titik CCTV terdata.');
  else if (cctvOnline < cctvPoints.length) blockers.push(`${cctvPoints.length - cctvOnline} kamera CCTV belum online & merekam.`);
  if (retentionDays < 30) blockers.push('Retensi NVR belum 30 hari.');
  if (issueStats.open > 0) blockers.push(`${issueStats.open} kendala masih OPEN — selesaikan sebelum opening.`);

  return {
    phase: 'OPENING',
    total,
    grade,
    verdict,
    pillars,
    coverage: {
      testedWifi: 0,
      totalWifi: 0,
      wifiPercent: 0,
      openIssues: issueStats.open,
      resolvedIssues: issueStats.resolved,
    },
    blockers,
    categorizedBlockers: groupBlockersByCategory(blockers),
  };
}

export const PHASE_LABEL: Record<BuildingPhase, string> = {
  SETUP: '1. Setup Gedung',
  PRE_OPENING: '2. Pre-Opening QC',
  OPENING: '3. Opening & Takeover',
  LIVE: 'Live',
};

/** Rekomendasi fase berdasarkan kelengkapan data (tidak menimpa pilihan manual). */
export function suggestPhase(building: Building, issues: ColivingIssue[] = []): BuildingPhase {
  const hasRooms = building.floors.some((floor) => floor.rooms.length > 0);
  if (!hasRooms) return 'SETUP';

  const preOpening = calculatePreOpeningScore(building, issues);
  const opening = calculateOpeningScore(building, issues);

  if (opening.total >= 90 && building.handover?.signedBy) return 'LIVE';
  if (preOpening.total >= 85) return 'OPENING';
  return 'PRE_OPENING';
}
