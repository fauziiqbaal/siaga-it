import React, { useState, useEffect } from 'react';
import { Building, ColivingIssue, SimpleUser, InspectionVisit, VisitType, EvidenceMedia, CCTV_CONNECTIVITY_CONFIG, CCTVConnectivityType } from '../../types/hotel';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wifi, 
  Video, 
  KeyRound, 
  Tv, 
  Server, 
  Globe, 
  Layers, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  HardDrive, 
  Camera, 
  ExternalLink,
  Award,
  Radio,
  Clock,
  History,
  UserCheck,
  Plus,
  Edit3,
  Info,
  Lock,
  Zap,
  ChevronDown,
  ChevronUp,
  Shield
} from 'lucide-react';
import { getEvidenceByBuilding } from '../../utils/evidenceStorage';

interface LiveReadinessReportProps {
  building: Building;
  issues: ColivingIssue[];
  currentUser: SimpleUser;
  onNavigateTab: (tab: string) => void;
  onOpenEvidenceExplorer?: () => void;
  onUpdateBuilding?: (updatedBuilding: Building) => void;
}

export const LiveReadinessReport: React.FC<LiveReadinessReportProps> = ({
  building,
  issues,
  currentUser,
  onNavigateTab,
  onOpenEvidenceExplorer,
  onUpdateBuilding,
}) => {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [inspectorName, setInspectorName] = useState(currentUser.name || 'Tim Siaga IT');
  const [isSignedOff, setIsSignedOff] = useState(false);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceMedia[]>([]);
  const [evidenceCount, setEvidenceCount] = useState<number>(0);

  // Expanded Floor Matrix state (default all expanded for full overview & print)
  const [expandedFloorIds, setExpandedFloorIds] = useState<Record<string, boolean>>(() => {
    return (building.floors || []).reduce((acc, f) => ({ ...acc, [f.id]: true }), {});
  });

  const toggleFloorExpand = (floorId: string) => {
    setExpandedFloorIds(prev => ({ ...prev, [floorId]: !prev[floorId] }));
  };

  useEffect(() => {
    getEvidenceByBuilding(building.id).then(items => {
      setEvidenceItems(items);
      setEvidenceCount(items.length);
    }).catch(() => {});
  }, [building.id]);

  const visits: InspectionVisit[] = building.inspectionVisits || [];
  const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null;

  // Helper to get current Date & Time
  const getCurrentDateTime = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
    return { dateStr, timeStr };
  };

  // Active visit session info
  const [activeVisitDate, setActiveVisitDate] = useState<string>(
    latestVisit ? latestVisit.visitDate : getCurrentDateTime().dateStr
  );
  const [activeVisitTime, setActiveVisitTime] = useState<string>(
    latestVisit?.visitTime || getCurrentDateTime().timeStr
  );
  const [activeInspector, setActiveInspector] = useState<string>(
    latestVisit ? latestVisit.inspectorName : currentUser.name || 'Budi Pratama (IT Lead)'
  );

  // Modal to Record / Log a New Visit
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState(getCurrentDateTime().dateStr);
  const [newVisitTime, setNewVisitTime] = useState(getCurrentDateTime().timeStr);
  const [newVisitType, setNewVisitType] = useState<VisitType>('QC_PROGRESS');
  const [newVisitNote, setNewVisitNote] = useState('');

  const handleOpenAddVisitModal = () => {
    const { dateStr, timeStr } = getCurrentDateTime();
    setNewVisitDate(dateStr);
    setNewVisitTime(timeStr);
    setNewVisitNote('');
    setNewVisitType('QC_PROGRESS');
    setIsAddVisitModalOpen(true);
  };

  // 1. Calculate Wi-Fi Readiness
  const allRooms = building.floors.flatMap(f => f.rooms);
  const allFacilities = building.floors.flatMap(f => f.facilities);

  const wifiFacilities = allFacilities.filter(f => f.hasWifi);
  const totalWifiEndpoints = allRooms.length + wifiFacilities.length;
  const wifiPassRooms = allRooms.filter(r => r.wifiStatus === 'PASS').length;
  const wifiPassFac = wifiFacilities.filter(f => f.wifiStatus === 'PASS').length;
  const wifiPassTotal = wifiPassRooms + wifiPassFac;
  const wifiReadiness = totalWifiEndpoints > 0 ? Math.round((wifiPassTotal / totalWifiEndpoints) * 100) : 100;
  
  const avgSpeed = allRooms.length > 0 
    ? Math.round(allRooms.reduce((acc, r) => acc + (r.wifiSpeedMbps || 0), 0) / allRooms.length)
    : 0;

  // 2. Calculate Smartlock & Door Access Readiness
  const smartlockRooms = allRooms.filter(r => r.hasSmartlock);
  const smartlockFacilities = allFacilities.filter(f => f.hasLock);
  const totalLocks = smartlockRooms.length + smartlockFacilities.length;
  const lockPassRooms = smartlockRooms.filter(r => r.lockStatus === 'PASS').length;
  const lockPassFac = smartlockFacilities.filter(f => f.lockStatus === 'PASS').length;
  const lockPassTotal = lockPassRooms + lockPassFac;
  const lockReadiness = totalLocks > 0 ? Math.round((lockPassTotal / totalLocks) * 100) : 100;

  // 3. Calculate TV Readiness
  const tvRooms = allRooms.filter(r => r.hasTv);
  const tvFacilities = allFacilities.filter(f => f.hasTv);
  const totalTvs = tvRooms.length + tvFacilities.length;
  const tvPassRooms = tvRooms.filter(r => r.tvStatus === 'PASS').length;
  const tvPassFac = tvFacilities.filter(f => f.tvStatus === 'PASS').length;
  const tvPassTotal = tvPassRooms + tvPassFac;
  const tvReadiness = totalTvs > 0 ? Math.round((tvPassTotal / totalTvs) * 100) : 100;

  // 4. Calculate CCTV Readiness
  const totalCctv = building.cctvPoints.length;
  const cctvPass = building.cctvPoints.filter(p => p.status === 'PASS').length;
  const cctvReadiness = totalCctv > 0 ? Math.round((cctvPass / totalCctv) * 100) : 100;

  // 5. Calculate IT Devices / Asset Readiness
  const devices = building.devices || [];
  const totalDevices = devices.length;
  const devicesConfigured = devices.filter(d => d.configStatus === 'CONFIGURED').length;
  const deviceReadiness = totalDevices > 0 ? Math.round((devicesConfigured / totalDevices) * 100) : 100;

  // 5b. Calculate Hardware & Infrastructure Takeover Statuses (AP, NVR, Standalone IP Cam, ISP, Smartlock)
  const apDevices = devices.filter(d => 
    d.category === 'ACCESS_POINT' || 
    d.category === 'WIRELESS_DEVICE' || 
    d.subCategory === 'Access Point'
  );
  const totalAps = apDevices.length;
  const apTakeoverDone = apDevices.filter(d => d.takeoverStatus === 'SUDAH_TAKEOVER' || d.ssidStatus === 'SSID_CHANGED').length;
  const isAllApTakeover = totalAps > 0 && apTakeoverDone === totalAps;

  const nvrDevice = devices.find(d => 
    d.category === 'CCTV_NVR' || 
    (d.category === 'SURVEILLANCE' && (d.subCategory === 'NVR' || d.subCategory === 'DVR'))
  );
  const isNvrTakeover = nvrDevice ? (nvrDevice.takeoverStatus === 'SUDAH_TAKEOVER' || nvrDevice.cloudUnbindStatus === 'UNBOUND') : true;

  const standaloneCctvs = building.cctvPoints.filter(p => p.isStandalone);
  const standaloneTakeoverDone = standaloneCctvs.filter(p => p.takeoverStatus === 'SUDAH_TAKEOVER').length;
  const isAllStandaloneTakeover = standaloneCctvs.length === 0 || standaloneTakeoverDone === standaloneCctvs.length;

  const ispConnections = building.internetConnections && building.internetConnections.length > 0
    ? building.internetConnections
    : [{ id: 'isp-auto', ispName: building.ispProvider, packageName: 'Corporate Dedicated', role: 'PRIMARY' as const, speedMbps: 150, customerNumber: 'CID-AUTO', accountHolder: 'PT Rukita Bhineka Nusantara', isBillingTakeover: true, status: 'AKTIF' as const }];
  const isAllIspTakeover = ispConnections.every(c => c.isBillingTakeover || c.billingTakeoverStatus === 'SUDAH_TAKEOVER');

  const smartlockDevice = devices.find(d => 
    d.category === 'SMARTLOCK_GATEWAY' || 
    d.category === 'SMART_LOCK' || 
    d.subCategory === 'Access Door' || 
    d.subCategory === 'Smartlock Handle'
  );
  const isSmartlockTakeover = totalLocks === 0 || (smartlockDevice 
    ? (smartlockDevice.ttlockSupport === 'SUPPORT_TTLOCK'
        ? (smartlockDevice.ttlockTakeoverStatus === 'SUDAH_TAKEOVER' || smartlockDevice.takeoverStatus === 'SUDAH_TAKEOVER')
        : (smartlockDevice.takeoverStatus === 'SUDAH_TAKEOVER' || lockPassTotal === totalLocks))
    : lockPassTotal === totalLocks);

  const takeoverTasksList = [
    { name: 'Billing ISP', isDone: isAllIspTakeover },
    { name: 'AP Wi-Fi & SSID', isDone: isAllApTakeover },
    { name: 'DVR / NVR', isDone: isNvrTakeover },
    { name: 'IP Cam Standalone', isDone: isAllStandaloneTakeover },
    { name: 'Smartlock TTLock & Gate', isDone: isSmartlockTakeover },
  ];
  const takeoverCompletedCount = takeoverTasksList.filter(t => t.isDone).length;
  const takeoverPercentage = Math.round((takeoverCompletedCount / takeoverTasksList.length) * 100);

  // 6. Overall Weighted Live Readiness Index (35% WiFi, 25% CCTV, 20% Lock, 10% TV, 10% Hardware)
  const overallScore = Math.round(
    (wifiReadiness * 0.35) +
    (cctvReadiness * 0.25) +
    (lockReadiness * 0.20) +
    (tvReadiness * 0.10) +
    (deviceReadiness * 0.10)
  );

  // Wi-Fi Standardization check
  const isSsidStandardized = building.wifiStandardProfile?.status === 'STANDAR_TERAPKAN';
  const wifiProfile = building.wifiStandardProfile || {
    guestSsid: `@Rukita ${building.name.replace(/Rukita\s*/i, '').replace(/\(.*\)/, '').trim()} Community`,
    guestPassword: 'RukitaLive2026!',
    isCaptivePortal: false,
    opsSsid: `Rukita-Ops-${building.name.split(' ')[1] || 'Secure'}`,
    opsPassword: 'Ops#Secure2026',
    iotSsid: 'Rukita-IoT-Devices',
    iotPassword: 'Iot#LockTv2026',
    status: 'BELUM_DISERAGAMKAN' as const,
  };

  // Status Decision (Standardized SSID is a required gate check for Go-Live!)
  const openIssues = issues.filter(i => i.buildingId === building.id && i.status === 'OPEN');
  const isReadyForLive = overallScore >= 85 && openIssues.length === 0 && isSsidStandardized;
  const isConditional = (overallScore >= 70 || (!isSsidStandardized && overallScore >= 85)) && !isReadyForLive;

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();

    // Rekomendasi hasil visit di-state otomatis di akhir pengisian evaluasi QC gedung
    const calculatedRecommendation: 'GO_LIVE' | 'RE_INSPECT' | 'BLOCKER' = 
      isReadyForLive ? 'GO_LIVE' : isConditional ? 'RE_INSPECT' : 'BLOCKER';

    const newVisitObj: InspectionVisit = {
      id: `vis-${Date.now()}`,
      buildingId: building.id,
      visitNumber: visits.length + 1,
      visitDate: newVisitDate.trim() || getCurrentDateTime().dateStr,
      visitTime: newVisitTime.trim() || getCurrentDateTime().timeStr,
      inspectorName: currentUser.name,
      inspectorRole: currentUser.roleTitle || (currentUser.role === 'ADMIN' ? 'Super Administrator' : currentUser.role === 'BACKOFFICE' ? 'IT Lead / Backoffice' : 'Field Engineer'),
      visitType: newVisitType,
      readinessScoreSnapshot: overallScore,
      summaryNote: newVisitNote.trim() || `Pengecekan kunjungan ke-${visits.length + 1} dengan skor ${overallScore}%`,
      blockersFound: openIssues.length,
      statusRecommendation: calculatedRecommendation,
      createdAt: new Date().toISOString(),
    };

    const updatedVisits = [...visits, newVisitObj];

    if (onUpdateBuilding) {
      onUpdateBuilding({
        ...building,
        inspectionVisits: updatedVisits,
      });
    }

    setActiveVisitDate(newVisitObj.visitDate);
    setActiveVisitTime(newVisitObj.visitTime || getCurrentDateTime().timeStr);
    setActiveInspector(newVisitObj.inspectorName);
    setIsAddVisitModalOpen(false);
    setNewVisitNote('');
  };

  // Copy Executive Summary for WhatsApp / Slack
  const handleCopySummary = () => {
    const summaryText = `*LAPORAN KESIAPAN LIVE IT (SIAGA IT)*
🏢 *Properti:* ${building.name}
📍 *Alamat:* ${building.address}
🎯 *Target Buka:* ${building.openingDate}
📅 *Tanggal Cek Visit Terakhir:* ${activeVisitDate} (${activeVisitTime || 'WIB'}) • Kunjungan Ke-${visits.length > 0 ? visits.length : 1}
👷 *Teknisi / Inspektor Bertugas:* ${activeInspector}
📊 *SKOR KESIAPAN LIVE:* ${overallScore}% (${isReadyForLive ? 'SIAP GO-LIVE' : isConditional ? 'SIAP BERSYARAT' : 'BELUM SIAP'})

*Rincian 4 Pilar IT:*
- 📶 Wi-Fi & Internet: ${wifiReadiness}% (${wifiPassTotal}/${totalWifiEndpoints} titik OK, Rata-rata ${avgSpeed} Mbps)
  • ISP & Paket: ${(building.internetConnections || []).map(n => `${n.ispName} ${n.packageName ? `(${n.packageName})` : ''} ${n.speedMbps} Mbps [${n.isBillingTakeover ? '✓ it.billing@rukita.co' : `⚠️ Belum Takeover / ${n.accountHolder || 'Owner'}`}]`).join(' • ') || building.ispProvider}
  • SSID Tamu: ${wifiProfile.guestSsid || '-'} (${isSsidStandardized ? 'STANDAR LIVE OK' : 'BELUM DISERAGAMKAN / BLOCKER'})
  • Password: ${wifiProfile.isCaptivePortal ? 'Captive Portal (Tanpa Password)' : (wifiProfile.guestPassword || '-')}
  • SSID IoT (Smartlock/TV): ${wifiProfile.iotSsid || '-'}
- 📹 CCTV & Security: ${cctvReadiness}% (${cctvPass}/${totalCctv} titik online NVR)
- 🔐 Smartlock & Akses: ${lockReadiness}% (${lockPassTotal}/${totalLocks} pintu normal)
- 📺 TV & IPTV: ${tvReadiness}% (${tvPassTotal}/${totalTvs} unit streaming OK)
- 🖧 Perangkat Asset: ${deviceReadiness}% (${devicesConfigured}/${totalDevices} configured)
- 🔄 Status 5 Task Takeover: ${takeoverCompletedCount}/5 Selesai (${takeoverPercentage}%)
  • Billing ISP: ${isAllIspTakeover ? '✓ it.billing@rukita.co' : '⚠️ Belum Takeover'}
  • AP Wi-Fi & SSID: ${isAllApTakeover ? '✓ SSID Terstandarisasi' : '⚠️ Belum Takeover'}
  • DVR / NVR CCTV: ${isNvrTakeover ? '✓ Master IT & Unbound' : '⚠️ Belum Takeover'}
  • CCTV IP Cam Standalone: ${standaloneCctvs.length === 0 ? '✓ N/A (Terpusat NVR)' : isAllStandaloneTakeover ? '✓ Akun Master Siaga IT' : '⚠️ Belum Takeover'}
  • Smartlock & Gateway: ${isSmartlockTakeover ? '✓ Master App & Kartu RFID' : '⚠️ Belum Takeover'}

*Kendala Terbuka:* ${openIssues.length > 0 ? `${openIssues.length} isu belum selesai` : 'Nihil / Bersih'}
*Status SOP SSID:* ${isSsidStandardized ? '✓ Sudah Diseragamkan' : '⚠️ Belum Diseragamkan (Wajib Diatur Sebelum Live)'}
*Riwayat Kunjungan:* ${visits.length}x visit (${visits.map(v => `${v.visitDate}: ${v.readinessScoreSnapshot}%`).join(' ➔ ') || `${overallScore}%`})
*Bukti Foto Terlampir:* ${evidenceCount} berkas tersimpan
*Inspektor Terdaftar:* ${activeInspector} (${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })})
Generated via Siaga IT Operations`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 print:space-y-3.5 print:text-slate-900">

      {/* Official Document Print Header (Only visible on paper / PDF print) */}
      <div className="hidden print:flex items-center justify-between pb-3 mb-2 border-b-2 border-slate-900 text-slate-900 print:break-inside-avoid">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono">
            IT
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight uppercase leading-tight">
              SIAGA IT — LAPORAN KESIAPAN LIVE & AUDIT QC
            </h2>
            <p className="text-[10px] text-slate-600 font-mono">
              Rukita Engineering & IT Operations • Standar Kesiapan Pembukaan Properti
            </p>
          </div>
        </div>
        <div className="text-right text-[10px] font-mono text-slate-600">
          <span className="block font-bold text-slate-900">DOKUMEN RESMI SERAH TERIMA IT</span>
          <span>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Top Unified Header & Quick Actions Bar (Hidden in Print) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Laporan Kesiapan Live IT
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">
                Visit #{visits.length > 0 ? visits.length : 1} {latestVisit?.visitType ? `• ${latestVisit.visitType.replace(/_/g, ' ')}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground mt-0.5 flex-wrap text-[11px]">
              <span className="flex items-center gap-1 font-mono text-foreground font-medium">
                <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                {activeVisitDate} ({activeVisitTime})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-foreground font-medium">
                <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">Inspektor:</span> {activeInspector}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
          <button
            onClick={handleOpenAddVisitModal}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
            title="Catat kunjungan baru oleh akun Anda"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat Visit</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
            title="Salin rekap ringkasan teks untuk grup WhatsApp / Slack"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-blue-500" />}
            <span>{copiedSummary ? 'Tersalin' : 'Bagikan WA'}</span>
          </button>

          {currentUser.role === 'ADMIN' || currentUser.role === 'BACKOFFICE' ? (
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-foreground hover:bg-foreground/90 text-background text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
              title="Cetak Berita Acara & Dokumen PDF Resmi (Role Admin / Backoffice)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate & Cetak PDF</span>
            </button>
          ) : (
            <button
              onClick={() => alert('Pemberitahuan: Penerbitan dan pencetakan Berita Acara Resmi Serah Terima diterbitkan oleh Tim Backoffice / Admin setelah seluruh checklist teknisi tuntas.')}
              className="px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-help"
              title="Penerbitan dokumen resmi dilakukan oleh Backoffice / Admin"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Cetak Berita Acara (Backoffice)</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Authority Banner (Admin / Backoffice vs Teknisi) */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden shadow-xs ${
        currentUser.role === 'ADMIN'
          ? 'bg-indigo-500/[0.04] border-indigo-500/30'
          : currentUser.role === 'BACKOFFICE' 
          ? 'bg-blue-500/[0.04] border-blue-500/30' 
          : 'bg-amber-500/[0.05] border-amber-500/30'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            currentUser.role === 'ADMIN'
              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
              : currentUser.role === 'BACKOFFICE' 
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' 
              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
          }`}>
            {currentUser.role === 'ADMIN' || currentUser.role === 'BACKOFFICE' ? <ShieldCheck className="w-4 h-4" /> : <Award className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground">
                {currentUser.role === 'ADMIN'
                  ? 'Otoritas Super Administrator'
                  : currentUser.role === 'BACKOFFICE'
                  ? 'Otoritas Tim Backoffice & IT Operations Lead'
                  : 'Mode Pratinjau Kesiapan (POV Teknisi Lapangan)'}
              </span>
              <span className={`text-[10px] px-2 py-0.2 rounded font-mono font-bold uppercase ${
                currentUser.role === 'ADMIN'
                  ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                  : currentUser.role === 'BACKOFFICE'
                  ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                  : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
              }`}>
                Role: {currentUser.role}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {currentUser.role === 'ADMIN' || currentUser.role === 'BACKOFFICE'
                ? 'Anda berwenang mengaudit seluruh temuan teknisi lapangan, memverifikasi kelaikan Go-Live, melakukan sign-off berita acara, dan mengunduh/mencetak dokumen resmi.'
                : 'Pemeriksaan teknis lapangan Anda telah tersimpan. Penerbitan Laporan Berita Acara Resmi, Cetak PDF Final, dan Sign-Off Serah Terima akan digenerate oleh Tim Backoffice / Admin.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right font-mono text-[11px]">
          <span className="text-muted-foreground">User: </span>
          <strong className="text-foreground">{currentUser.name}</strong>
        </div>
      </div>

      {/* Main Executive Summary Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all print:p-2.5 print:rounded-lg print:break-inside-avoid print:bg-white print:border-slate-400 print:shadow-none ${
        isReadyForLive
          ? 'bg-emerald-500/[0.04] border-emerald-500/30'
          : isConditional
          ? 'bg-amber-500/[0.04] border-amber-500/30'
          : 'bg-rose-500/[0.04] border-rose-500/30'
      }`}>
        <div className="flex flex-col lg:flex-row print:flex-row lg:items-center print:items-center justify-between gap-4 print:gap-3">
          
          {/* Left: Building Metadata */}
          <div className="space-y-2 print:space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] print:text-[9px] px-3 print:px-2 py-1 print:py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isReadyForLive
                  ? 'bg-emerald-600 text-white'
                  : isConditional
                  ? 'bg-amber-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {isReadyForLive ? '● SIAP GO-LIVE' : isConditional ? '● SIAP BERSYARAT' : '● BELUM SIAP (BLOCKER)'}
              </span>
              {!isSsidStandardized && (
                <span className="text-[10px] print:text-[8px] px-2.5 print:px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 print:bg-amber-100 print:text-amber-950 print:border-amber-600">
                  ⚠️ Blocker: SSID Belum Diseragamkan
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl print:text-lg font-black text-foreground print:text-slate-900 leading-tight">
              {building.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 print:gap-x-2.5 gap-y-1.5 print:gap-y-0.5 text-xs print:text-[10px] text-muted-foreground font-medium print:text-slate-700">
              <span className="flex items-center gap-1.5 print:gap-1">
                <MapPin className="w-3.5 h-3.5 print:w-3 print:h-3 text-rose-500 shrink-0" />
                <span className="print:text-slate-900">{building.address}</span>
              </span>
              <span className="flex items-center gap-1.5 print:gap-1">
                <Calendar className="w-3.5 h-3.5 print:w-3 print:h-3 text-amber-500 shrink-0" />
                Target Buka: <span className="font-bold text-foreground print:text-slate-900">{building.openingDate}</span>
              </span>
              <span className="flex items-center gap-1.5 print:gap-1 text-cyan-600 dark:text-cyan-400 font-mono print:text-slate-900">
                <Globe className="w-3.5 h-3.5 print:w-3 print:h-3 shrink-0" />
                {building.ispProvider}
              </span>
              <span className={`flex items-center gap-1.5 print:gap-1 font-mono font-bold ${
                takeoverPercentage === 100 
                  ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-800' 
                  : 'text-amber-600 dark:text-amber-400 print:text-amber-800'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 print:w-3 print:h-3 shrink-0" />
                Takeover: {takeoverCompletedCount}/5 Selesai ({takeoverPercentage}%)
              </span>
            </div>
          </div>

          {/* Right: Big Score Circular Metric (With proper viewBox & safety margin so it NEVER clips) */}
          <div className="flex items-center gap-3.5 print:gap-2.5 bg-card/90 dark:bg-card/60 p-3.5 sm:p-4 print:p-2 rounded-2xl print:rounded-lg border border-border/80 shrink-0 shadow-xs print:bg-slate-50 print:border-slate-300">
            <div className="relative w-20 h-20 print:w-16 print:h-16 flex items-center justify-center shrink-0">
              <svg 
                viewBox="0 0 96 96" 
                className="w-20 h-20 print:w-16 print:h-16 -rotate-90 shrink-0"
              >
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-muted/20 print:text-slate-200"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - overallScore / 100)}
                  strokeLinecap="round"
                  className={isReadyForLive ? 'text-emerald-500' : isConditional ? 'text-amber-500' : 'text-rose-500'}
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="font-mono font-black text-xl print:text-base text-foreground print:text-slate-900 leading-none">
                  {overallScore}%
                </span>
                <span className="text-[8px] print:text-[7px] uppercase font-bold tracking-wider text-muted-foreground print:text-slate-600 mt-0.5">
                  Kesiapan
                </span>
              </div>
            </div>

            <div className="space-y-0.5 text-xs print:text-[10px]">
              <div className="flex items-center gap-1">
                <span className="font-bold text-foreground print:text-slate-900">
                  Indeks Kesiapan IT
                </span>
                <span 
                  title={isReadyForLive ? 'Seluruh pilar IT memenuhi ambang batas operasional tamu' : isConditional ? 'Sebagian besar normal, terdapat catatan minor yang perlu diperhatikan' : 'Terdapat kendala kritis yang harus diselesaikan sebelum opening'} 
                  className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
                >
                  <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                </span>
              </div>
              <span className={`text-[11px] print:text-[9px] font-semibold block ${isReadyForLive ? 'text-emerald-600 dark:text-emerald-400' : isConditional ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isReadyForLive ? 'Memenuhi Standar' : isConditional ? 'Catatan Minor' : 'Perlu Perbaikan'}
              </span>
              <span className="text-[10px] print:text-[8px] text-muted-foreground font-mono block">
                Target Ambang Batas: ≥ 85%
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 4 Core Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2 print:break-inside-avoid">
        
        {/* 1. Wi-Fi & Internet */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between gap-2.5 print:break-inside-avoid print:bg-white print:border-slate-300 print:p-2 print:gap-1.5">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 print:bg-blue-50 print:text-blue-800">
                <Wifi className="w-4 h-4 print:w-3.5 print:h-3.5" />
              </div>
              <span className="font-mono font-bold text-base print:text-xs text-foreground print:text-slate-900">{wifiReadiness}%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 print:mt-1">
              <h3 className="font-bold text-xs sm:text-sm print:text-xs text-foreground print:text-slate-900">Internet & Wi-Fi</h3>
              <span 
                title="Standar Throughput ≥ 15 Mbps di seluruh kamar & fasilitas" 
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 print:pt-1 border-t border-border/60 print:border-slate-200 text-xs font-mono">
            <div className="w-full bg-muted rounded-full h-1.5 print:h-1 overflow-hidden print:bg-slate-200">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${wifiReadiness}%` }} />
            </div>
            <div className="text-[11px] print:text-[8.5px] text-muted-foreground print:text-slate-700">
              <span>{wifiPassTotal} / {totalWifiEndpoints} Titik OK</span>
            </div>
          </div>
        </div>

        {/* 2. CCTV & Security */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between gap-2.5 print:break-inside-avoid print:bg-white print:border-slate-300 print:p-2 print:gap-1.5">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 print:bg-indigo-50 print:text-indigo-800">
                <Video className="w-4 h-4 print:w-3.5 print:h-3.5" />
              </div>
              <span className="font-mono font-bold text-base print:text-xs text-foreground print:text-slate-900">{cctvReadiness}%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 print:mt-1">
              <h3 className="font-bold text-xs sm:text-sm print:text-xs text-foreground print:text-slate-900">CCTV & Keamanan</h3>
              <span 
                title="Live stream stabil & retensi NVR minimal 30 hari aktif" 
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 print:pt-1 border-t border-border/60 print:border-slate-200 text-xs font-mono">
            <div className="w-full bg-muted rounded-full h-1.5 print:h-1 overflow-hidden print:bg-slate-200">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${cctvReadiness}%` }} />
            </div>
            <div className="text-[11px] print:text-[8.5px] text-muted-foreground print:text-slate-700">
              <span>{cctvPass} / {totalCctv} Kamera OK</span>
            </div>
          </div>
        </div>

        {/* 3. Smartlock & Access Gate */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between gap-2.5 print:break-inside-avoid print:bg-white print:border-slate-300 print:p-2 print:gap-1.5">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 print:bg-amber-50 print:text-amber-800">
                <KeyRound className="w-4 h-4 print:w-3.5 print:h-3.5" />
              </div>
              <span className="font-mono font-bold text-base print:text-xs text-foreground print:text-slate-900">{lockReadiness}%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 print:mt-1">
              <h3 className="font-bold text-xs sm:text-sm print:text-xs text-foreground print:text-slate-900">Smartlock & Akses</h3>
              <span 
                title="Respons kartu RFID & PIN < 1 detik, alignment deadbolt presisi" 
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 print:pt-1 border-t border-border/60 print:border-slate-200 text-xs font-mono">
            <div className="w-full bg-muted rounded-full h-1.5 print:h-1 overflow-hidden print:bg-slate-200">
              <div className="bg-amber-600 h-full rounded-full" style={{ width: `${lockReadiness}%` }} />
            </div>
            <div className="text-[11px] print:text-[8.5px] text-muted-foreground print:text-slate-700">
              <span>{lockPassTotal} / {totalLocks} Pintu OK</span>
            </div>
          </div>
        </div>

        {/* 4. Cable / Android TV */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between gap-2.5 print:break-inside-avoid print:bg-white print:border-slate-300 print:p-2 print:gap-1.5">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 print:bg-purple-50 print:text-purple-800">
                <Tv className="w-4 h-4 print:w-3.5 print:h-3.5" />
              </div>
              <span className="font-mono font-bold text-base print:text-xs text-foreground print:text-slate-900">{tvReadiness}%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 print:mt-1">
              <h3 className="font-bold text-xs sm:text-sm print:text-xs text-foreground print:text-slate-900">TV & Android TV</h3>
              <span 
                title="Streaming OTT lancar, audio sinkron tanpa drop" 
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 print:pt-1 border-t border-border/60 print:border-slate-200 text-xs font-mono">
            <div className="w-full bg-muted rounded-full h-1.5 print:h-1 overflow-hidden print:bg-slate-200">
              <div className="bg-purple-600 h-full rounded-full" style={{ width: `${tvReadiness}%` }} />
            </div>
            <div className="text-[11px] print:text-[8.5px] text-muted-foreground print:text-slate-700">
              <span>{tvPassTotal} / {totalTvs} Unit OK</span>
            </div>
          </div>
        </div>

      </div>

      {/* Floor-by-Floor Detailed Readiness Breakdown */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3 print:p-2.5 print:space-y-1.5 print:rounded-lg print:break-inside-auto print:bg-white print:border-slate-400">
        <div className="flex items-center justify-between pb-1.5 border-b border-border print:border-slate-300">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500 print:w-3.5 print:h-3.5" />
            <h3 className="text-sm print:text-xs font-bold text-foreground print:text-slate-900">
              Matriks Kesiapan Per Lantai & Area Bersama ({building.floors.length} Lantai)
            </h3>
          </div>
          <span className="text-xs print:text-[9.5px] text-muted-foreground font-mono print:text-slate-600">
            Total {allRooms.length} Kamar • {allFacilities.length} Fasilitas
          </span>
        </div>

        <div className="space-y-2.5 print:space-y-1.5">
          {building.floors.map((floor) => {
            const fRooms = floor.rooms;
            const fFac = floor.facilities;
            
            // Wi-Fi endpoints
            const fWifiOk = fRooms.filter(r => r.wifiStatus === 'PASS').length + fFac.filter(f => f.hasWifi && f.wifiStatus === 'PASS').length;
            const fWifiTotal = fRooms.length + fFac.filter(f => f.hasWifi).length;

            // Smartlock endpoints
            const fLockRooms = fRooms.filter(r => r.hasSmartlock);
            const fLockFac = fFac.filter(f => f.hasLock);
            const fLockOk = fLockRooms.filter(r => r.lockStatus === 'PASS').length + fLockFac.filter(f => f.lockStatus === 'PASS').length;
            const fLockTotal = fLockRooms.length + fLockFac.length;

            // TV endpoints
            const fTvRooms = fRooms.filter(r => r.hasTv);
            const fTvFac = fFac.filter(f => f.hasTv);
            const fTvOk = fTvRooms.filter(r => r.tvStatus === 'PASS').length + fTvFac.filter(f => f.tvStatus === 'PASS').length;
            const fTvTotal = fTvRooms.length + fTvFac.length;

            // Combined total floor availability
            const floorPassed = fWifiOk + fLockOk + fTvOk;
            const floorEndpoints = fWifiTotal + fLockTotal + fTvTotal;
            const fPct = floorEndpoints > 0 ? Math.round((floorPassed / floorEndpoints) * 100) : 100;
            const isFloorExpanded = !!expandedFloorIds[floor.id];

            return (
              <div
                key={floor.id}
                className="p-3.5 rounded-xl border border-border bg-muted/15 space-y-2.5 text-xs print:text-[9.5px] print:p-2 print:rounded-lg print:break-inside-avoid print:bg-slate-50 print:border-slate-300 print:text-slate-900 shadow-2xs"
              >
                {/* Floor Header Summary Row */}
                <div className="flex flex-col lg:flex-row print:flex-row lg:items-center print:items-center justify-between gap-3 print:gap-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFloorExpand(floor.id)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground print:hidden transition-colors"
                      title={isFloorExpanded ? 'Sembunyikan rincian kamar & fasilitas' : 'Tampilkan rincian kamar & fasilitas'}
                    >
                      {isFloorExpanded ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm print:text-xs print:text-slate-900">{floor.name}</span>
                        <span className={`px-2 py-0.5 print:px-1.5 print:py-0 rounded-md font-mono font-bold text-[10px] print:text-[8.5px] ${
                          fPct >= 90 
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500' 
                            : fPct >= 70 
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 print:bg-rose-50 print:text-rose-800 print:border-rose-500'
                        }`}>
                          {fPct}% Kesiapan
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] print:text-[8.5px] text-muted-foreground mt-0.5 print:text-slate-600 flex-wrap">
                        <span>{fRooms.length} Kamar</span>
                        <span>•</span>
                        <span 
                          title={fFac.length > 0 ? fFac.map(f => f.name).join(', ') : 'Tanpa fasilitas bersama'}
                          className="cursor-help hover:text-foreground inline-flex items-center gap-1"
                        >
                          <span>{fFac.length} Fasilitas</span>
                          {fFac.length > 0 && <Info className="w-3 h-3 opacity-60 print:hidden" />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges for 3 In-Room Pillars */}
                  <div className="flex items-center gap-2 print:gap-1.5 flex-wrap shrink-0">
                    <span className={`px-2 py-1 print:px-1.5 print:py-0.5 rounded border text-[11px] print:text-[8.5px] font-mono flex items-center gap-1 ${
                      fWifiOk === fWifiTotal && fWifiTotal > 0
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300 print:bg-blue-50 print:border-blue-400 print:text-blue-900'
                        : 'bg-background border-border text-muted-foreground print:bg-white print:border-slate-300 print:text-slate-700'
                    }`}>
                      <Wifi className="w-3 h-3 print:w-2.5 print:h-2.5 text-blue-500" />
                      <span>Wi-Fi: {fWifiOk}/{fWifiTotal}</span>
                    </span>

                    {fLockTotal > 0 && (
                      <span className={`px-2 py-1 print:px-1.5 print:py-0.5 rounded border text-[11px] print:text-[8.5px] font-mono flex items-center gap-1 ${
                        fLockOk === fLockTotal
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300 print:bg-amber-50 print:border-amber-400 print:text-amber-900'
                          : 'bg-background border-border text-muted-foreground print:bg-white print:border-slate-300 print:text-slate-700'
                      }`}>
                        <KeyRound className="w-3 h-3 print:w-2.5 print:h-2.5 text-amber-500" />
                        <span>Kunci: {fLockOk}/{fLockTotal}</span>
                      </span>
                    )}

                    {fTvTotal > 0 && (
                      <span className={`px-2 py-1 print:px-1.5 print:py-0.5 rounded border text-[11px] print:text-[8.5px] font-mono flex items-center gap-1 ${
                        fTvOk === fTvTotal
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300 print:bg-purple-50 print:border-purple-400 print:text-purple-900'
                          : 'bg-background border-border text-muted-foreground print:bg-white print:border-slate-300 print:text-slate-700'
                      }`}>
                        <Tv className="w-3 h-3 print:w-2.5 print:h-2.5 text-purple-500" />
                        <span>TV: {fTvOk}/{fTvTotal}</span>
                      </span>
                    )}

                    <button
                      onClick={() => onNavigateTab('evaluation')}
                      className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center gap-1 transition-colors print:hidden shadow-xs ml-1"
                    >
                      <span>Periksa</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Mini Cards Container: Kamar & Fasilitas Bersama (Printed Included!) */}
                <div className={`mt-2 print:mt-1 pt-2 print:pt-1 border-t border-border/60 print:border-slate-300 ${isFloorExpanded ? 'block' : 'hidden'} print:!block`}>
                  <div className="text-[10.5px] print:text-[8px] font-bold text-muted-foreground print:text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Titik Kamar & Fasilitas ({fRooms.length} Kamar, {fFac.length} Fasilitas):</span>
                    <span className="text-[9.5px] print:text-[7.5px] font-mono print:text-slate-600">
                      ⚡ Speedtest (Mbps) • 📶 Coverage (dBm) • 🚪 Door • 📺 TV
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 print:grid-cols-4 gap-2 print:gap-1.5">
                    {/* 1. Fasilitas Bersama Mini Cards */}
                    {fFac.map(fac => {
                      const isOk = fac.wifiStatus === 'PASS' && (!fac.hasTv || fac.tvStatus === 'PASS') && (!fac.hasLock || fac.lockStatus === 'PASS');
                      const hasIssue = fac.wifiStatus === 'FAIL' || (fac.hasTv && fac.tvStatus === 'FAIL') || (fac.hasLock && fac.lockStatus === 'FAIL');

                      return (
                        <div
                          key={fac.id}
                          className={`p-2 print:p-1.5 rounded-lg border flex flex-col justify-between gap-1 text-[11px] print:text-[8px] font-mono print:break-inside-avoid shadow-2xs transition-all ${
                            hasIssue
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200 print:bg-rose-50 print:border-rose-400 print:text-slate-900'
                              : isOk
                              ? 'bg-card border-border/80 text-foreground print:bg-white print:border-slate-300 print:text-slate-900'
                              : 'bg-muted/30 border-border text-muted-foreground print:bg-slate-50 print:border-slate-300 print:text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-foreground print:text-slate-900 truncate text-[11px] print:text-[8.5px]" title={fac.name}>
                                {fac.name}
                              </span>
                              <span className={`px-1 py-0.2 rounded text-[9px] print:text-[7px] font-bold uppercase shrink-0 ${
                                hasIssue
                                  ? 'bg-rose-500 text-white print:bg-rose-100 print:text-rose-800'
                                  : isOk
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 print:bg-emerald-100 print:text-emerald-800'
                                  : 'bg-muted text-muted-foreground print:bg-slate-200 print:text-slate-800'
                              }`}>
                                {hasIssue ? 'FAIL' : isOk ? 'OK' : 'PENDING'}
                              </span>
                            </div>
                            <span className="text-[9.5px] print:text-[7.5px] text-muted-foreground print:text-slate-600 block truncate">
                              Fasilitas • {fac.type.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Metrics: Speedtest & Signal dBm */}
                          <div className="pt-1 border-t border-border/40 print:border-slate-200 space-y-0.5 text-[10px] print:text-[7.5px]">
                            {fac.hasWifi ? (
                              <div className="flex items-center justify-between">
                                <span className={`font-bold flex items-center gap-0.5 ${
                                  (fac.wifiSpeedMbps || 0) >= 15 ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-800' : 'text-rose-600 dark:text-rose-400 print:text-rose-800'
                                }`}>
                                  ⚡ {fac.wifiSpeedMbps ? `${fac.wifiSpeedMbps}M` : '0M'}
                                </span>
                                <span className={`font-semibold flex items-center gap-0.5 ${
                                  fac.wifiSignalDbm && fac.wifiSignalDbm >= -65 ? 'text-blue-600 dark:text-blue-400 print:text-blue-800' : 'text-amber-600 dark:text-amber-400 print:text-amber-800'
                                }`}>
                                  📶 {fac.wifiSignalDbm ? `${fac.wifiSignalDbm}dB` : '-'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground print:text-slate-400 italic">Tanpa Wi-Fi</span>
                            )}

                            {/* In-Room Pillars (TV & Lock status) */}
                            {(fac.hasLock || fac.hasTv) && (
                              <div className="flex items-center justify-between text-[9px] print:text-[7px] text-muted-foreground print:text-slate-600 pt-0.5">
                                {fac.hasLock && (
                                  <span className={fac.lockStatus === 'PASS' ? 'text-emerald-600 print:text-emerald-800 font-bold' : 'text-rose-600 font-bold'}>
                                    🚪 {fac.lockStatus === 'PASS' ? 'Lock OK' : 'Lock Fail'}
                                  </span>
                                )}
                                {fac.hasTv && (
                                  <span className={fac.tvStatus === 'PASS' ? 'text-purple-600 print:text-purple-800 font-bold' : 'text-rose-600 font-bold'}>
                                    📺 {fac.tvStatus === 'PASS' ? 'TV OK' : 'TV Fail'}
                                  </span>
                                )}
                              </div>
                            )}

                            {fac.notes && (
                              <p className="text-[9px] print:text-[7px] text-amber-700 dark:text-amber-400 print:text-slate-800 italic truncate" title={fac.notes}>
                                ⚠️ {fac.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* 2. Kamar Mini Cards */}
                    {fRooms.map(rm => {
                      const isOk = rm.wifiStatus === 'PASS' && (!rm.hasTv || rm.tvStatus === 'PASS') && (!rm.hasSmartlock || rm.lockStatus === 'PASS');
                      const hasIssue = rm.wifiStatus === 'FAIL' || (rm.hasTv && rm.tvStatus === 'FAIL') || (rm.hasSmartlock && rm.lockStatus === 'FAIL');

                      return (
                        <div
                          key={rm.id}
                          className={`p-2 print:p-1.5 rounded-lg border flex flex-col justify-between gap-1 text-[11px] print:text-[8px] font-mono print:break-inside-avoid shadow-2xs transition-all ${
                            hasIssue
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200 print:bg-rose-50 print:border-rose-400 print:text-slate-900'
                              : isOk
                              ? 'bg-card border-border/80 text-foreground print:bg-white print:border-slate-300 print:text-slate-900'
                              : 'bg-muted/30 border-border text-muted-foreground print:bg-slate-50 print:border-slate-300 print:text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-foreground print:text-slate-900 text-[11px] print:text-[8.5px]">
                                Kamar {rm.number}
                              </span>
                              <span className={`px-1 py-0.2 rounded text-[9px] print:text-[7px] font-bold uppercase shrink-0 ${
                                hasIssue
                                  ? 'bg-rose-500 text-white print:bg-rose-100 print:text-rose-800'
                                  : isOk
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 print:bg-emerald-100 print:text-emerald-800'
                                  : 'bg-muted text-muted-foreground print:bg-slate-200 print:text-slate-800'
                              }`}>
                                {hasIssue ? 'FAIL' : isOk ? 'OK' : 'PENDING'}
                              </span>
                            </div>
                            <span className="text-[9.5px] print:text-[7.5px] text-muted-foreground print:text-slate-600 block truncate">
                              {rm.hasSmartlock ? 'Smartlock' : 'Kunci Fisik'} {rm.hasTv ? '• TV' : ''}
                            </span>
                          </div>

                          {/* Metrics: Speedtest & Signal dBm */}
                          <div className="pt-1 border-t border-border/40 print:border-slate-200 space-y-0.5 text-[10px] print:text-[7.5px]">
                            <div className="flex items-center justify-between">
                              <span className={`font-bold flex items-center gap-0.5 ${
                                (rm.wifiSpeedMbps || 0) >= 15 ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-800' : 'text-rose-600 dark:text-rose-400 print:text-rose-800'
                              }`}>
                                ⚡ {rm.wifiSpeedMbps ? `${rm.wifiSpeedMbps}M` : '0M'}
                              </span>
                              <span className={`font-semibold flex items-center gap-0.5 ${
                                rm.wifiSignalDbm && rm.wifiSignalDbm >= -65 ? 'text-blue-600 dark:text-blue-400 print:text-blue-800' : 'text-amber-600 dark:text-amber-400 print:text-amber-800'
                              }`}>
                                📶 {rm.wifiSignalDbm ? `${rm.wifiSignalDbm}dB` : '-'}
                              </span>
                            </div>

                            {/* In-Room Pillars (TV & Lock status) */}
                            <div className="flex items-center justify-between text-[9px] print:text-[7px] text-muted-foreground print:text-slate-600 pt-0.5">
                              <span>
                                {rm.hasSmartlock ? (
                                  <span className={rm.lockStatus === 'PASS' ? 'text-emerald-600 print:text-emerald-800 font-bold' : 'text-rose-600 font-bold'}>
                                    🚪 {rm.lockStatus === 'PASS' ? 'Lock OK' : 'Lock Fail'}
                                  </span>
                                ) : (
                                  <span>🚪 Kunci Biasa</span>
                                )}
                              </span>
                              {rm.hasTv && (
                                <span className={rm.tvStatus === 'PASS' ? 'text-purple-600 print:text-purple-800 font-bold' : 'text-rose-600 font-bold'}>
                                  📺 {rm.tvStatus === 'PASS' ? 'TV OK' : 'TV Fail'}
                                </span>
                              )}
                            </div>

                            {rm.notes && (
                              <p className="text-[9px] print:text-[7px] text-rose-600 dark:text-rose-400 print:text-rose-800 truncate" title={rm.notes}>
                                ⚠️ {rm.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* STATUS TITIK CCTV LAPANGAN (CARD KECIL PER TITIK)       */}
      {/* ======================================================== */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3 print:p-2.5 print:space-y-1.5 print:rounded-lg print:break-inside-avoid print:bg-white print:border-slate-400">
        <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 pb-1.5 border-b border-border print:border-slate-300">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Video className="w-4 h-4 print:w-3.5 print:h-3.5 text-amber-500" />
              <h4 className="text-xs print:text-[10px] font-bold text-foreground print:text-slate-900">
                Status Titik CCTV Lapangan ({building.cctvPoints.length} Titik)
              </h4>
              <span 
                title="Status operasional online, perekaman NVR 30 hari, dan sudut sorot seluruh kamera properti"
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
            <span className="text-[10px] print:text-[8px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold">
              {building.cctvPoints.filter(p => p.cctvStatus === 'ONLINE').length}/{building.cctvPoints.length} Online
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('cctv')}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 print:hidden self-start sm:self-auto"
          >
            <span>Buka Modul CCTV</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Grid Card Kecil Titik CCTV */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 print:grid-cols-4 gap-2.5 print:gap-1.5">
          {building.cctvPoints.map((point, idx) => {
            const isOnline = point.cctvStatus === 'ONLINE';
            const isOffline = point.cctvStatus === 'OFFLINE';
            const isReposisi = point.cctvStatus === 'PERLU_REPOSISI';
            const isInstalasi = point.cctvStatus === 'PERLU_INSTALASI';

            return (
              <div
                key={point.id}
                className={`p-2.5 print:p-2 rounded-lg border flex flex-col justify-between gap-1.5 text-xs print:text-[8.5px] print:break-inside-avoid shadow-2xs transition-all ${
                  isOnline
                    ? 'bg-background border-border/80 text-foreground print:bg-white print:border-slate-300 print:text-slate-900'
                    : isReposisi
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200 print:bg-amber-50 print:border-amber-400 print:text-slate-900'
                    : isInstalasi
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-900 dark:text-orange-200 print:bg-orange-50 print:border-orange-400 print:text-slate-900'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200 print:bg-rose-50 print:border-rose-400 print:text-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground text-xs print:text-[9px] print:text-slate-900">
                      📹 Titik {point.pointNumber || idx + 1}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] print:text-[7.5px] font-bold font-mono uppercase shrink-0 ${
                      isOnline
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 print:bg-emerald-100 print:text-emerald-800'
                        : isReposisi
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 print:bg-amber-100 print:text-amber-800'
                        : isInstalasi
                        ? 'bg-orange-500/20 text-orange-800 dark:text-orange-300 print:bg-orange-100 print:text-orange-800'
                        : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 print:bg-rose-100 print:text-rose-800'
                    }`}>
                      {point.cctvStatus === 'PERLU_REPOSISI' 
                        ? 'REPOSISI' 
                        : point.cctvStatus === 'PERLU_INSTALASI' 
                        ? 'PERLU PASANG' 
                        : point.cctvStatus === 'ONLINE' 
                        ? 'ONLINE' 
                        : point.cctvStatus === 'OFFLINE' 
                        ? 'OFFLINE' 
                        : 'PENDING'}
                    </span>
                  </div>

                  <p className="font-bold text-foreground text-[11px] print:text-[8px] print:text-slate-900 mt-1 line-clamp-1" title={point.locationName}>
                    {point.locationName}
                  </p>
                  {point.objectCoverage && (
                    <p className="text-[10px] print:text-[7.5px] text-muted-foreground print:text-slate-600 line-clamp-1 mt-0.5" title={point.objectCoverage}>
                      🎯 {point.objectCoverage}
                    </p>
                  )}
                </div>

                <div className="pt-1.5 border-t border-border/40 print:border-slate-200 space-y-1 text-[10px] print:text-[7.5px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1 font-bold ${point.isRecording ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-800' : 'text-rose-600 dark:text-rose-400 print:text-rose-800'}`}>
                      {point.isRecording ? '⏺️ Rekam' : '⚠️ No Rekam'}
                    </span>
                    <span className="text-[9px] print:text-[7px] text-muted-foreground print:text-slate-600 font-semibold truncate max-w-[110px]" title={point.connectivityType ? CCTV_CONNECTIVITY_CONFIG[point.connectivityType]?.label : ''}>
                      {point.connectivityType ? CCTV_CONNECTIVITY_CONFIG[point.connectivityType]?.shortLabel : (point.isStandalone ? 'Standalone' : 'LAN POE')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] print:text-[7px]">
                    <span className="text-muted-foreground print:text-slate-600">
                      {point.floorNumber ? `Lt ${point.floorNumber}` : 'Luar'}
                    </span>
                    {point.isStandalone ? (
                      <span className={`font-bold ${point.takeoverStatus === 'SUDAH_TAKEOVER' ? 'text-emerald-600 print:text-emerald-800' : 'text-rose-600 print:text-rose-800'}`}>
                        {point.takeoverStatus === 'SUDAH_TAKEOVER' ? '✓ Master IT' : '⚠️ Owner'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground print:text-slate-500">
                        NVR/DVR Stream
                      </span>
                    )}
                  </div>

                  {point.notes && (
                    <p className="text-[9.5px] print:text-[7px] text-amber-700 dark:text-amber-400 print:text-slate-800 italic line-clamp-1" title={point.notes}>
                      ⚠️ {point.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SOP Penyeragaman SSID & Kredensial Live Card */}
      <div className={`p-4 rounded-xl border transition-all space-y-3 print:p-2.5 print:space-y-1.5 print:rounded-lg print:break-inside-avoid print:bg-white print:border-slate-400 ${
        isSsidStandardized
          ? 'bg-card border-border shadow-xs'
          : 'bg-amber-500/[0.04] border-amber-500/30 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 pb-1.5 border-b border-border print:border-slate-300">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 print:w-3.5 print:h-3.5 text-blue-500" />
              <h4 className="text-xs print:text-[10px] font-bold text-foreground print:text-slate-900">
                Penyeragaman SSID (SOP Live)
              </h4>
              <span 
                title="Standardisasi SSID & Password baru seluruh gedung sebelum serah terima opening"
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
            <span className={`text-[10px] print:text-[8.5px] px-2 py-0.5 print:px-1.5 print:py-0 rounded font-bold uppercase ${
              isSsidStandardized
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
            }`}>
              {isSsidStandardized ? '✓ SOP Terpenuhi' : '⚠️ Belum Diseragamkan (Blocker)'}
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('property')}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 print:hidden self-start sm:self-auto"
          >
            <span>Kelola di Menu Properti</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-3 print:gap-2 text-xs print:text-[9.5px] print:break-inside-avoid">
          
          <div className="p-2.5 print:p-2 rounded-lg bg-muted/20 border border-border space-y-1 print:space-y-0.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900 print:break-inside-avoid">
            <div className="flex items-center justify-between">
              <span className="text-[10px] print:text-[8.5px] text-muted-foreground block font-medium print:text-slate-600">SSID Tamu / Resident:</span>
              <span className="text-[9px] print:text-[8px] px-1 rounded bg-blue-500/10 text-blue-600 font-mono font-bold print:bg-blue-100 print:text-blue-900">VLAN Tamu</span>
            </div>
            <span className="font-mono font-bold text-foreground text-xs print:text-[9.5px] block truncate print:text-slate-900">
              {wifiProfile.guestSsid || '-'}
            </span>
            <span className="text-[11px] print:text-[8.5px] text-muted-foreground block font-mono truncate print:text-slate-700">
              Pass: {wifiProfile.isCaptivePortal ? 'Captive Portal / Landing Page' : (wifiProfile.guestPassword || '-')}
            </span>
          </div>

          <div className="p-2.5 print:p-2 rounded-lg bg-muted/20 border border-border space-y-1 print:space-y-0.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900 print:break-inside-avoid">
            <div className="flex items-center justify-between">
              <span className="text-[10px] print:text-[8.5px] text-muted-foreground block font-medium print:text-slate-600">SSID Operasional / Staff:</span>
              <span className="text-[9px] print:text-[8px] px-1 rounded bg-indigo-500/10 text-indigo-600 font-mono font-bold print:bg-indigo-100 print:text-indigo-900">VLAN Ops</span>
            </div>
            <span className="font-mono font-bold text-foreground text-xs print:text-[9.5px] block truncate print:text-slate-900">
              {wifiProfile.opsSsid || '-'}
            </span>
            <span className="text-[11px] print:text-[8.5px] text-muted-foreground block font-mono truncate print:text-slate-700">
              Pass: {wifiProfile.opsPassword || '-'}
            </span>
          </div>

          <div className="p-2.5 print:p-2 rounded-lg bg-muted/20 border border-border space-y-1 print:space-y-0.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900 print:break-inside-avoid">
            <div className="flex items-center justify-between">
              <span className="text-[10px] print:text-[8.5px] text-muted-foreground block font-medium print:text-slate-600">SSID IoT 2.4 GHz (Smartlock/TV):</span>
              <span className="text-[9px] print:text-[8px] px-1 rounded bg-amber-500/10 text-amber-600 font-mono font-bold print:bg-amber-100 print:text-amber-900">IoT Link</span>
            </div>
            <span className="font-mono font-bold text-foreground text-xs print:text-[9.5px] block truncate print:text-slate-900">
              {wifiProfile.iotSsid || '-'}
            </span>
            <span className="text-[11px] print:text-[8.5px] text-muted-foreground block font-mono truncate print:text-slate-700">
              Pass: {wifiProfile.iotPassword || '-'}
            </span>
          </div>

        </div>

        {wifiProfile.notes && (
          <p className="text-[11px] print:text-[8.5px] text-muted-foreground italic pt-1 border-t border-border/50 print:text-slate-600 print:border-slate-300">
            Catatan Penyeragaman: {wifiProfile.notes} {wifiProfile.appliedDate ? `(Diterapkan ${wifiProfile.appliedDate})` : ''}
          </p>
        )}
      </div>

      {/* Network Multi-WAN & Infrastructure Asset Summary (Clean Page 2 Break in Print) */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3.5 print:gap-2.5 print:break-before-page print:break-inside-avoid">
        
        {/* Multi-WAN ISP Connection */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-2.5 print:p-2.5 print:space-y-1.5 print:rounded-lg print:break-inside-avoid print:bg-white print:border-slate-400">
          <div className="flex items-center justify-between pb-1.5 border-b border-border print:border-slate-300">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 print:w-3.5 print:h-3.5 text-blue-500" />
              <h4 className="text-xs print:text-[10px] font-bold text-foreground print:text-slate-900">
                Koneksi Internet & Multi-WAN
              </h4>
              <span 
                title="Koneksi internet utama & backup serta status takeover billing ke it.billing@rukita.co"
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('property')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 print:hidden"
            >
              <span>Kelola</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 print:space-y-1 text-xs print:text-[9.5px]">
            {(building.internetConnections && building.internetConnections.length > 0 ? building.internetConnections : [
              { id: '1', ispName: building.ispProvider, packageName: 'Corporate Dedicated', role: 'PRIMARY' as const, speedMbps: 150, customerNumber: 'CID-AUTO', accountHolder: 'PT Rukita Bhineka Nusantara', isBillingTakeover: true, status: 'AKTIF' as const }
            ]).map(net => (
              <div key={net.id} className="p-2.5 print:p-2 rounded-lg bg-muted/20 border border-border flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 print:gap-1.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900 print:break-inside-avoid">
                <div className="space-y-1 print:space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">{net.ispName}</span>
                    {net.packageName && (
                      <span className="text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-medium bg-background border border-border text-foreground print:bg-white print:border-slate-400 print:text-slate-900">
                        {net.packageName}
                      </span>
                    )}
                    <span className="text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 print:bg-blue-100 print:text-blue-900">
                      {net.role}
                    </span>
                    <span className={`text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${
                      net.isBillingTakeover
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                    }`}>
                      {net.isBillingTakeover ? '✓ Takeover: it.billing@rukita.co' : '⚠️ Belum Takeover'}
                    </span>
                  </div>
                  <div className="text-[10px] print:text-[8.5px] text-muted-foreground flex items-center gap-2 flex-wrap font-mono print:text-slate-700">
                    <span>ID: <strong className="text-foreground print:text-slate-900">{net.customerNumber || '-'}</strong></span>
                    <span>•</span>
                    <span>Atas Nama: <strong className="text-foreground print:text-slate-900">{net.accountHolder || 'PT Rukita Bhineka Nusantara'}</strong></span>
                  </div>
                </div>
                <div className="shrink-0 text-right sm:text-right print:text-right flex items-center sm:flex-col print:flex-col justify-between sm:justify-center print:justify-center">
                  <span className="font-mono font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">
                    {net.speedMbps} Mbps
                  </span>
                  <span className="text-[10px] print:text-[7.5px] text-muted-foreground font-mono print:text-slate-600">Bandwidth</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Takeover Master Akses Perangkat & Infrastruktur IT */}
        {/* Takeover Master Akses Perangkat & Infrastruktur IT */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-2.5 print:p-2.5 print:space-y-1.5 print:rounded-lg print:break-inside-avoid print:bg-white print:border-slate-400">
          <div className="flex items-center justify-between pb-1.5 border-b border-border print:border-slate-300">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Server className="w-4 h-4 print:w-3.5 print:h-3.5 text-blue-500" />
              <h4 className="text-xs print:text-[10px] font-bold text-foreground print:text-slate-900">
                Takeover Master Akses & Infrastruktur IT
              </h4>
              <span className={`text-[10px] print:text-[8px] px-2 py-0.5 rounded font-mono font-bold ${
                takeoverPercentage === 100
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-100 print:text-emerald-800'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 print:bg-amber-100 print:text-amber-800'
              }`}>
                {takeoverCompletedCount}/5 Task Selesai ({takeoverPercentage}%)
              </span>
              <span 
                title="Status serah terima master akses AP Wi-Fi, DVR/NVR, CCTV standalone, Smartlock, dan ISP ke akun korporat Siaga IT"
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('devices')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 print:hidden"
            >
              <span>Inventaris</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 print:space-y-1 text-xs print:text-[9.5px]">
            {/* 1. Access Point (AP) Takeover: SSID & Password Standarisasi */}
            <div className="p-2.5 print:p-2 rounded-lg bg-muted/20 border border-border flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 print:gap-1.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900 print:break-inside-avoid">
              <div className="space-y-1 print:space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">Access Point (AP)</span>
                  <span className="text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 print:bg-cyan-100 print:text-cyan-900">
                    WI-FI AP
                  </span>
                  <span className={`text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${
                    isAllApTakeover
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                  }`}>
                    {isAllApTakeover ? '✓ TAKEOVER: SSID & PASSWORD STANDAR' : `⚠️ ${totalAps - apTakeoverDone} AP BELUM TAKEOVER (SSID BAWAAN)`}
                  </span>
                </div>
                <div className="text-[10px] print:text-[8.5px] text-muted-foreground flex items-center gap-2 flex-wrap font-mono print:text-slate-700">
                  <span>SSID Baku: <strong className="text-foreground print:text-slate-900">{wifiProfile.guestSsid || '-'}</strong></span>
                  <span>•</span>
                  <span>Controller: <strong className="text-foreground print:text-slate-900">Ruijie Cloud / Reyee (Master IT)</strong></span>
                </div>
              </div>
              <div className="shrink-0 text-right sm:text-right print:text-right flex items-center sm:flex-col print:flex-col justify-between sm:justify-center print:justify-center">
                <span className="font-mono font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">
                  {apTakeoverDone}/{totalAps} Unit
                </span>
                <span className="text-[10px] print:text-[7.5px] text-muted-foreground font-mono print:text-slate-600">Takeover AP</span>
              </div>
            </div>

            {/* 2. DVR / NVR Takeover: Master Akses & Cloud Unbinding */}
            <div className="p-2.5 print:p-2 rounded-lg bg-muted/20 border border-border flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 print:gap-1.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900 print:break-inside-avoid">
              <div className="space-y-1 print:space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">{nvrDevice ? nvrDevice.name : 'DVR / NVR CCTV'}</span>
                  <span className="text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 print:bg-indigo-100 print:text-indigo-900">
                    DVR/NVR
                  </span>
                  <span className={`text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${
                    isNvrTakeover
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                  }`}>
                    {isNvrTakeover ? '✓ TAKEOVER: MASTER AKSES & CLOUD UNBOUND' : '⚠️ BELUM TAKEOVER (AKUN OWNER LAMA)'}
                  </span>
                </div>
                <div className="text-[10px] print:text-[8.5px] text-muted-foreground flex items-center gap-2 flex-wrap font-mono print:text-slate-700">
                  <span>Model: <strong className="text-foreground print:text-slate-900">{nvrDevice?.brandModel || 'Hikvision 8CH'}</strong></span>
                  <span>•</span>
                  <span>Admin: <strong className="text-foreground print:text-slate-900">{nvrDevice?.adminUser || 'admin'} (Password Diubah ke Master IT)</strong></span>
                </div>
              </div>
              <div className="shrink-0 text-right sm:text-right print:text-right flex items-center sm:flex-col print:flex-col justify-between sm:justify-center print:justify-center">
                <span className="font-mono font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">
                  {nvrDevice?.locationDetail || 'MDF Lt 1'}
                </span>
                <span className="text-[10px] print:text-[7.5px] text-muted-foreground font-mono print:text-slate-600">NVR Terpusat</span>
              </div>
            </div>

            {/* 3. CCTV IP Cam Standalone Takeover: Master Akses */}
            <div className="p-2.5 print:p-2 rounded-lg bg-muted/20 border border-border flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 print:gap-1.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900 print:break-inside-avoid">
              <div className="space-y-1 print:space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">CCTV IP Cam Standalone</span>
                  <span className="text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 print:bg-amber-100 print:text-amber-900">
                    NON-NVR
                  </span>
                  <span className={`text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${
                    standaloneCctvs.length === 0
                      ? 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30 print:bg-slate-100 print:text-slate-800'
                      : isAllStandaloneTakeover
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                  }`}>
                    {standaloneCctvs.length === 0 
                      ? '✓ N/A (SEMUA KAMERA TERPUSAT DI NVR)' 
                      : isAllStandaloneTakeover 
                      ? `✓ TAKEOVER: ${standaloneTakeoverDone}/${standaloneCctvs.length} IP CAM MASTER AKSES` 
                      : `⚠️ ${standaloneCctvs.length - standaloneTakeoverDone} IP CAM BELUM TAKEOVER`}
                  </span>
                </div>
                <div className="text-[10px] print:text-[8.5px] text-muted-foreground flex items-center gap-2 flex-wrap font-mono print:text-slate-700">
                  {standaloneCctvs.length > 0 ? (
                    <span>Akun Master: <strong className="text-foreground print:text-slate-900">{standaloneCctvs.map(p => `${p.locationName} (${p.takeoverStatus === 'SUDAH_TAKEOVER' ? '✓ siaga.it@rukita.co' : '⚠️ Akun Owner'})`).join(' • ')}</strong></span>
                  ) : (
                    <span>Seluruh titik kamera terhubung kabel PoE langsung ke NVR, tanpa kamera standalone.</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right sm:text-right print:text-right flex items-center sm:flex-col print:flex-col justify-between sm:justify-center print:justify-center">
                <span className="font-mono font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">
                  {standaloneCctvs.length} Unit
                </span>
                <span className="text-[10px] print:text-[7.5px] text-muted-foreground font-mono print:text-slate-600">IP Cam App</span>
              </div>
            </div>

            {/* 4. Smartlock & Gateway Akses Takeover: Master Portal, Kartu RFID & Master Key */}
            <div className="p-2.5 print:p-2 rounded-lg bg-muted/20 border border-border flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 print:gap-1.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900 print:break-inside-avoid">
              <div className="space-y-1 print:space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">Smartlock & Gateway Akses</span>
                  <span className="text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 print:bg-amber-100 print:text-amber-900">
                    DOOR LOCK
                  </span>
                  <span className={`text-[10px] print:text-[8px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${
                    isSmartlockTakeover
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                  }`}>
                    {isSmartlockTakeover ? '✓ TAKEOVER: MASTER APP & GATEWAY AKTIF' : '⚠️ BELUM TAKEOVER (AKUN OWNER / KUNCI MANUAL)'}
                  </span>
                </div>
                <div className="text-[10px] print:text-[8.5px] text-muted-foreground flex items-center gap-2 flex-wrap font-mono print:text-slate-700">
                  <span>Sistem: <strong className="text-foreground print:text-slate-900">{smartlockDevice?.brandModel || 'TTLock / Tuya Gateway BLE'}</strong></span>
                  <span>•</span>
                  <span>Master Key: <strong className="text-foreground print:text-slate-900">Kartu Master RFID ({totalLocks} Pintu) & Kunci Fisik Emergency</strong></span>
                </div>
              </div>
              <div className="shrink-0 text-right sm:text-right print:text-right flex items-center sm:flex-col print:flex-col justify-between sm:justify-center print:justify-center">
                <span className="font-mono font-bold text-foreground text-xs print:text-[9.5px] print:text-slate-900">
                  {lockPassTotal}/{totalLocks} Pintu
                </span>
                <span className="text-[10px] print:text-[7.5px] text-muted-foreground font-mono print:text-slate-600">Smartlock</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Outstanding Snags / Blockers & Evidence Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3.5 print:gap-2.5 print:break-inside-avoid">
        
        {/* Open Issues Card */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-2.5 print:p-2.5 print:space-y-1.5 print:rounded-lg print:break-inside-avoid print:bg-white print:border-slate-400">
          <div className="flex items-center justify-between pb-1.5 border-b border-border print:border-slate-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 print:w-3.5 print:h-3.5 text-rose-500" />
              <h4 className="text-xs print:text-[10px] font-bold text-foreground print:text-slate-900">
                Catatan Kendala & Snags Lapangan ({openIssues.length})
              </h4>
            </div>
            <button
              onClick={() => onNavigateTab('issues')}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 print:hidden"
            >
              <span>Buka Isu</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {openIssues.length === 0 ? (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs print:text-[9.5px] flex items-center gap-2 print:bg-emerald-50 print:border-emerald-500 print:text-emerald-900">
              <CheckCircle2 className="w-4 h-4 print:w-3.5 print:h-3.5 shrink-0" />
              <span>Nihil. Tidak ada kendala aktif yang menghambat pembukaan gedung.</span>
            </div>
          ) : (
            <div className="space-y-1.5 text-xs print:text-[9.5px] max-h-40 overflow-y-auto print:max-h-none print:overflow-visible">
              {openIssues.map(issue => (
                <div key={issue.id} className="p-2 print:p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 print:bg-rose-50 print:border-rose-400 print:text-slate-900 print:break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <span className="font-bold print:text-rose-900 text-xs print:text-[9px]">[{issue.category}] {issue.location}</span>
                    <span className="text-[10px] print:text-[8px] font-mono print:text-rose-700 font-bold">{issue.id}</span>
                  </div>
                  <p className="text-[11px] print:text-[8.5px] mt-0.5 print:text-slate-900 font-medium">{issue.issue}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidence Verification Summary */}
        <div className="p-4 sm:p-4.5 rounded-xl bg-card border border-border shadow-xs space-y-3 print:p-2.5 print:space-y-1.5 print:rounded-lg print:break-inside-avoid print:bg-white print:border-slate-400">
          <div className="flex items-center justify-between pb-1.5 border-b border-border print:border-slate-300">
            <div className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 print:w-3.5 print:h-3.5 text-blue-500" />
              <h4 className="text-xs print:text-[10px] font-bold text-foreground print:text-slate-900">
                Dokumentasi & Bukti Lapangan ({evidenceCount} File)
              </h4>
              <span 
                title="Seluruh berkas foto speedtest, TV, smartlock, dan stiker SN ter-organisir dengan auto-naming Siaga IT"
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
              >
                <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </span>
            </div>
            {onOpenEvidenceExplorer && (
              <button
                onClick={onOpenEvidenceExplorer}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 print:hidden font-medium"
              >
                <span>Buka Explorer Bukti</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Evidence Thumbnails (compact in print so they fit cleanly) */}
          {evidenceItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2.5 print:gap-1.5 pt-1">
              {evidenceItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={onOpenEvidenceExplorer}
                  className="rounded-lg border border-border bg-muted/20 p-2 print:p-1 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors group shadow-2xs print:border-slate-300 print:bg-slate-50"
                  title={`${item.fileName} — Klik untuk membuka di Explorer`}
                >
                  <div className="w-full h-16 print:h-12 rounded bg-background/90 dark:bg-card flex items-center justify-center overflow-hidden mb-1 border border-border/40 print:border-slate-200">
                    <img
                      src={item.fileUrl}
                      alt={item.fileName}
                      className="max-h-full max-w-full object-contain p-0.5 group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="text-[10px] print:text-[8px] font-mono text-muted-foreground print:text-slate-700 truncate w-full text-center">
                    {item.entityName || item.category.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs print:text-[9px] font-mono pt-0.5">
              <span className="px-2.5 py-1.5 print:px-2 print:py-1 rounded-lg bg-muted border border-border text-foreground font-semibold print:bg-slate-50 print:border-slate-300 print:text-slate-900 truncate">
                📁 evidence/{building.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 print:text-emerald-800">
                ✓ Folder Siap
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Riwayat Kunjungan Lapangan & Log Audit Teknisi (Multi-Visit Audit Trail) */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3 print:p-2.5 print:space-y-1.5 print:rounded-lg print:break-inside-auto print:bg-white print:border-slate-400">
        <div className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-2 pb-1.5 border-b border-border print:border-slate-300">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 print:w-3.5 print:h-3.5 text-blue-500" />
            <h3 className="text-xs sm:text-sm print:text-xs font-bold text-foreground print:text-slate-900">
              Riwayat Kunjungan Lapangan ({visits.length} Visit)
            </h3>
            <span 
              title="Audit trail riwayat kunjungan inspeksi berkala oleh teknisi Siaga IT & vendor"
              className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
            >
              <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
            </span>
          </div>
        </div>

        {visits.length === 0 ? (
          <div className="p-3 rounded-lg bg-muted/20 border border-border text-center text-xs print:text-[9.5px] text-muted-foreground print:bg-slate-50 print:border-slate-300 print:text-slate-600">
            Belum ada catatan kunjungan tercatat. Klik tombol <strong>"+ Catat Visit"</strong> untuk menyimpan hasil audit kunjungan ini.
          </div>
        ) : (
          <div className="space-y-2.5 print:space-y-1.5 print:break-inside-auto">
            {[...visits].reverse().map((vis) => {
              const isGoLive = vis.statusRecommendation === 'GO_LIVE';
              const isBlocker = vis.statusRecommendation === 'BLOCKER';

              return (
                <div
                  key={vis.id}
                  className="p-3.5 rounded-xl border border-border bg-muted/15 flex flex-col md:flex-row print:flex-row md:items-start print:items-start justify-between gap-3 print:gap-2 text-xs print:text-[9.5px] print:p-2 print:rounded-lg print:break-inside-avoid print:bg-slate-50 print:border-slate-300 print:text-slate-900"
                >
                  <div className="space-y-1.5 print:space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold px-2 py-0.5 print:px-1.5 print:py-0 rounded bg-background border border-border text-foreground text-xs print:text-[9px] print:bg-white print:border-slate-400 print:text-slate-900">
                        Visit #{vis.visitNumber}
                      </span>
                      <span className="font-semibold text-foreground text-xs print:text-[9.5px] print:text-slate-900">
                        {vis.visitDate} {vis.visitTime ? `• ${vis.visitTime}` : ''}
                      </span>
                      <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] print:text-[8px] bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase print:bg-blue-100 print:text-blue-900">
                        {vis.visitType.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 print:px-1.5 print:py-0 rounded-full font-bold text-[10px] print:text-[8px] uppercase font-mono ${
                        isGoLive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-500'
                          : isBlocker
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 print:bg-rose-50 print:text-rose-800 print:border-rose-500'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-500'
                      }`}>
                        {vis.statusRecommendation.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] print:text-[9px] text-foreground font-medium mt-1 print:mt-0.5 print:text-slate-900">
                      {vis.summaryNote}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] print:text-[8.5px] text-muted-foreground pt-1 print:pt-0 flex-wrap print:text-slate-600">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 print:w-3 print:h-3 text-blue-500" />
                        Teknisi: <strong className="text-foreground print:text-slate-900">{vis.inspectorName}</strong>
                      </span>
                      {vis.blockersFound !== undefined && (
                        <span>
                          • Kendala: <strong className={vis.blockersFound > 0 ? 'text-rose-500 print:text-rose-800' : 'text-emerald-500 print:text-emerald-800'}>{vis.blockersFound} Isu</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score Snapshot Badge */}
                  <div className="flex md:flex-col print:flex-col items-center md:items-end print:items-end justify-between print:justify-center gap-1 shrink-0 pt-2 md:pt-0 print:pt-0 border-t md:border-t-0 print:border-t-0 border-border/60 print:border-slate-300">
                    <span className="text-[10px] print:text-[8px] text-muted-foreground uppercase font-bold print:text-slate-600">Skor Saat Visit:</span>
                    <span className={`font-mono font-black text-base print:text-xs px-2.5 py-1 print:px-2 print:py-0.5 rounded-lg ${
                      vis.readinessScoreSnapshot >= 85
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 print:bg-emerald-50 print:text-emerald-800 print:border print:border-emerald-500'
                        : vis.readinessScoreSnapshot >= 70
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 print:bg-amber-50 print:text-amber-800 print:border print:border-amber-500'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 print:bg-rose-50 print:text-rose-800 print:border print:border-rose-500'
                    }`}>
                      {vis.readinessScoreSnapshot}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Engineering Sign-off & Handover Certificate Box */}
      <div className="p-5 rounded-xl bg-card border border-border shadow-xs space-y-3 print:p-2.5 print:space-y-2 print:rounded-lg print:break-inside-avoid print:bg-white print:border-slate-400">
        <div className="flex items-center gap-2 pb-1.5 border-b border-border print:border-slate-300">
          <ShieldCheck className="w-4 h-4 print:w-3.5 print:h-3.5 text-emerald-500" />
          <h3 className="text-sm print:text-xs font-bold text-foreground print:text-slate-900">
            Lembar Verifikasi Kesiapan Live & Berita Acara Serah Terima IT
          </h3>
          <span 
            title={`Pernyataan kelaikan teknis operasional internet, CCTV, Smartlock, dan IPTV properti ${building.name} sesuai standar Siaga IT Rukita`}
            className="cursor-help text-muted-foreground hover:text-foreground inline-flex print:hidden"
          >
            <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3 print:gap-2 text-xs print:text-[9.5px]">
          <div>
            <label className="text-muted-foreground block mb-1 print:mb-0.5 print:text-slate-600 font-semibold text-[10px]">Nama Field Engineer PIC:</label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full px-2.5 py-1.5 print:py-1 rounded-lg border border-border bg-background text-xs print:text-[9.5px] font-bold text-foreground outline-none print:bg-slate-50 print:border-slate-400 print:text-slate-900"
            />
          </div>

          <div>
            <label className="text-muted-foreground block mb-1 print:mb-0.5 print:text-slate-600 font-semibold text-[10px]">Tanggal & Waktu Verifikasi:</label>
            <div className="px-2.5 py-1.5 print:py-1 rounded-lg border border-border bg-muted/30 text-xs print:text-[9.5px] font-mono text-foreground font-medium print:bg-slate-50 print:border-slate-400 print:text-slate-900">
              {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </div>
          </div>

          <div>
            <label className="text-muted-foreground block mb-1 print:mb-0.5 print:text-slate-600 font-semibold text-[10px]">Keputusan Akhir:</label>
            <div className={`px-2.5 py-1.5 print:py-1 rounded-lg border font-bold text-center text-xs print:text-[9.5px] ${
              isReadyForLive
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isConditional
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-rose-600 text-white border-rose-600'
            }`}>
              {isReadyForLive ? 'DISETUJUI UNTUK GO-LIVE' : isConditional ? 'DISETUJUI DENGAN CATATAN' : 'DITUNDA (PERLU PERBAIKAN)'}
            </div>
          </div>
        </div>

        {/* 3 Formal Signature Boxes for Official Print Handover */}
        <div className="hidden print:grid grid-cols-3 gap-3 pt-2 border-t border-slate-300 text-center font-mono text-[9px] print:break-inside-avoid">
          <div className="border border-slate-300 rounded p-1.5 flex flex-col justify-between h-20">
            <span className="text-slate-600 font-bold">1. FIELD IT ENGINEER</span>
            <div className="border-b border-dashed border-slate-400 mx-4"></div>
            <span className="font-bold text-slate-900">({inspectorName || 'Rudi Pratama'})</span>
          </div>
          <div className="border border-slate-300 rounded p-1.5 flex flex-col justify-between h-20">
            <span className="text-slate-600 font-bold">2. IT OPS LEAD / VENDOR</span>
            <div className="border-b border-dashed border-slate-400 mx-4"></div>
            <span className="font-bold text-slate-900">(Head of Infrastructure)</span>
          </div>
          <div className="border border-slate-300 rounded p-1.5 flex flex-col justify-between h-20">
            <span className="text-slate-600 font-bold">3. PROPERTY GM / OPS HEAD</span>
            <div className="border-b border-dashed border-slate-400 mx-4"></div>
            <span className="font-bold text-slate-900">(Community Manager)</span>
          </div>
        </div>

        <div className="pt-1.5 flex items-center justify-between border-t border-border/80 text-[10px] print:text-[8px] text-muted-foreground print:text-slate-600 print:border-slate-300">
          <span>Siaga IT Engineering Management System • Rukita Coliving Standards</span>
          <span className="font-mono">ID Audit: AUD-{building.id.toUpperCase()}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}</span>
        </div>
      </div>

      {/* Modal Catat Kunjungan Lapangan Baru (New Inspection Visit) */}
      {isAddVisitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Catat Kunjungan Pemeriksaan Baru (Visit #{visits.length + 1})
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Dokumentasikan tanggal kunjungan dan nama teknisi/pemeriksa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVisitModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="space-y-3.5 text-xs">
              
              {/* Tanggal & Waktu Visit (Prefilled waktu sekarang) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Tanggal Kunjungan / Visit Date</label>
                  <input
                    type="text"
                    value={newVisitDate}
                    onChange={(e) => setNewVisitDate(e.target.value)}
                    placeholder="Contoh: 19 Okt 2026"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Waktu Visit</label>
                  <input
                    type="text"
                    value={newVisitTime}
                    onChange={(e) => setNewVisitTime(e.target.value)}
                    placeholder="Contoh: 14:30 WIB"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Nama Teknisi / Pemeriksa (Fix sesuai akun yang sedang login) */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Nama Teknisi / Inspektor Lapangan</label>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 text-xs">
                  <div className={`w-7 h-7 rounded-md ${currentUser.avatarColor || (currentUser.role === 'ADMIN' ? 'bg-indigo-600' : currentUser.role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600')} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground truncate">{currentUser.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20 shrink-0">
                        Akun Aktif
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {currentUser.roleTitle || currentUser.role} • Siaga IT
                    </span>
                  </div>
                  <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              </div>

              {/* Jenis Kunjungan (Visit Type) */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Jenis Kunjungan (Tahapan)</label>
                <select
                  value={newVisitType}
                  onChange={(e) => setNewVisitType(e.target.value as VisitType)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                >
                  <option value="QC_PROGRESS">QC Progress (Pengecekan Berkala)</option>
                  <option value="INSTALASI_CONFIG">Instalasi & Konfigurasi Perangkat</option>
                  <option value="RE_INSPECT">Re-Inspect (Tindak Lanjut Kendala Snag)</option>
                  <option value="SURVEY_AWAL">Survey Awal Onboarding</option>
                  <option value="FINAL_AUDIT_SIGN_OFF">Final Audit & Kesiapan Live Sign-Off</option>
                </select>
              </div>

              {/* Catatan Hasil Visit */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Catatan Temuan / Perkembangan Hasil Visit</label>
                <textarea
                  value={newVisitNote}
                  onChange={(e) => setNewVisitNote(e.target.value)}
                  placeholder="Contoh: AP Lt 2 telah diganti dan speedtest stabil di 75 Mbps. Pengecekan smartlock semua kamar normal."
                  rows={3}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Rekomendasi Terkalkulasi (di-state di akhir pengisian QC) */}
              <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-foreground block">Status Evaluasi QC Gedung:</span>
                  <span className="text-[10px] text-muted-foreground">
                    Rekomendasi dihitung otomatis di akhir checklist ({overallScore}%)
                  </span>
                </div>
                <div className="shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                    isReadyForLive
                      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                      : isConditional
                      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                  }`}>
                    {isReadyForLive ? '✓ Siap Live' : isConditional ? '⚠️ Re-Inspect' : '⛔ Blocker'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border mt-3">
                <button
                  type="button"
                  onClick={() => setIsAddVisitModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Catatan Visit</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
