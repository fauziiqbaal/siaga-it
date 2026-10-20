import { Building } from '../types/hotel';

export interface PillarScore {
  total: number;
  pass: number;
  score: number; // 0 - 100
}

export interface BuildingReadinessResult {
  overallScore: number;
  wifi: PillarScore & { avgSpeedMbps: number; isSsidStandard: boolean };
  cctv: PillarScore & { recordingCount: number };
  smartlock: PillarScore;
  tv: PillarScore;
  devices: PillarScore;
  isAllBillingTakeover: boolean;
  takeoverRatio: { done: number; total: number };
}

export function calculateBuildingReadiness(building: Building): BuildingReadinessResult {
  const allRooms = building.floors.flatMap(f => f.rooms);
  const allFacilities = building.floors.flatMap(f => f.facilities);

  // 1. Wi-Fi
  const wifiFacilities = allFacilities.filter(f => f.hasWifi);
  const totalWifiEndpoints = allRooms.length + wifiFacilities.length;
  const wifiPassRooms = allRooms.filter(r => r.wifiStatus === 'PASS').length;
  const wifiPassFac = wifiFacilities.filter(f => f.wifiStatus === 'PASS').length;
  const wifiPassTotal = wifiPassRooms + wifiPassFac;
  const wifiScore = totalWifiEndpoints > 0 ? Math.round((wifiPassTotal / totalWifiEndpoints) * 100) : 100;
  
  const avgSpeed = allRooms.length > 0 
    ? Math.round(allRooms.reduce((acc, r) => acc + (r.wifiSpeedMbps || 0), 0) / allRooms.length)
    : 0;

  const isSsidStandard = building.wifiStandardProfile?.status === 'STANDAR_TERAPKAN';

  // 2. Smartlock
  const smartlockRooms = allRooms.filter(r => r.hasSmartlock);
  const smartlockFacilities = allFacilities.filter(f => f.hasLock);
  const totalLocks = smartlockRooms.length + smartlockFacilities.length;
  const lockPassRooms = smartlockRooms.filter(r => r.lockStatus === 'PASS').length;
  const lockPassFac = smartlockFacilities.filter(f => f.lockStatus === 'PASS').length;
  const lockPassTotal = lockPassRooms + lockPassFac;
  const lockScore = totalLocks > 0 ? Math.round((lockPassTotal / totalLocks) * 100) : 100;

  // 3. TV
  const tvRooms = allRooms.filter(r => r.hasTv);
  const tvFacilities = allFacilities.filter(f => f.hasTv);
  const totalTvs = tvRooms.length + tvFacilities.length;
  const tvPassRooms = tvRooms.filter(r => r.tvStatus === 'PASS').length;
  const tvPassFac = tvFacilities.filter(f => f.tvStatus === 'PASS').length;
  const tvPassTotal = tvPassRooms + tvPassFac;
  const tvScore = totalTvs > 0 ? Math.round((tvPassTotal / totalTvs) * 100) : 100;

  // 4. CCTV
  const totalCctv = building.cctvPoints.length;
  const cctvPass = building.cctvPoints.filter(p => p.status === 'PASS').length;
  const recordingCount = building.cctvPoints.filter(p => p.isRecording).length;
  const cctvScore = totalCctv > 0 ? Math.round((cctvPass / totalCctv) * 100) : 100;

  // 5. IT Hardware Devices
  const devices = building.devices || [];
  const totalDevices = devices.length;
  const devicesConfigured = devices.filter(d => d.configStatus === 'CONFIGURED').length;
  const deviceScore = totalDevices > 0 ? Math.round((devicesConfigured / totalDevices) * 100) : 100;

  // Overall Weighted Score (35% WiFi, 25% CCTV, 20% Lock, 10% TV, 10% Hardware)
  const overallScore = Math.round(
    (wifiScore * 0.35) +
    (cctvScore * 0.25) +
    (lockScore * 0.20) +
    (tvScore * 0.10) +
    (deviceScore * 0.10)
  );

  // Billing takeover ratio
  const connections = building.internetConnections || [];
  const takeoverDone = connections.filter(c => c.isBillingTakeover || c.billingTakeoverStatus === 'SUDAH_TAKEOVER').length;
  const isAllBillingTakeover = connections.length > 0 && takeoverDone === connections.length;

  return {
    overallScore,
    wifi: {
      total: totalWifiEndpoints,
      pass: wifiPassTotal,
      score: wifiScore,
      avgSpeedMbps: avgSpeed,
      isSsidStandard,
    },
    cctv: {
      total: totalCctv,
      pass: cctvPass,
      score: cctvScore,
      recordingCount,
    },
    smartlock: {
      total: totalLocks,
      pass: lockPassTotal,
      score: lockScore,
    },
    tv: {
      total: totalTvs,
      pass: tvPassTotal,
      score: tvScore,
    },
    devices: {
      total: totalDevices,
      pass: devicesConfigured,
      score: deviceScore,
    },
    isAllBillingTakeover,
    takeoverRatio: {
      done: takeoverDone,
      total: connections.length,
    },
  };
}
