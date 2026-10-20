import React, { useState } from 'react';
import { 
  CCTVPoint, 
  CheckStatus, 
  Building, 
  ColivingIssue, 
  CCTVOperationalStatus, 
  TakeoverStatus,
  CCTVConnectivityType,
  CCTV_CONNECTIVITY_CONFIG
} from '../../types/hotel';
import { 
  Video, 
  Check, 
  X, 
  Plus, 
  Camera, 
  Trash2, 
  Edit3, 
  Target, 
  Layers,
  Clock,
  ExternalLink,
  AlertTriangle,
  PlusCircle,
  HelpCircle,
  RotateCw,
  Wrench,
  Sliders,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Lock,
  Network,
  Radio,
  Wifi
} from 'lucide-react';
import { EvidenceCaptureModal } from '../common/EvidenceCaptureModal';
import { CCTVPointModal } from './CCTVPointModal';

interface CCTVChecklistProps {
  building?: Building;
  cctvPoints: CCTVPoint[];
  issues?: ColivingIssue[];
  onUpdatePoint: (updatedPoint: CCTVPoint) => void;
  onAddPoint: (newPoint: CCTVPoint) => void;
  onDeletePoint?: (pointId: string) => void;
  onReportIssue: (location: string, category: 'CCTV', issueText: string, photoUrl?: string, vendorNote?: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const CCTV_STATUS_LABELS: Record<CCTVOperationalStatus, {
  label: string;
  shortLabel: string;
  badgeClass: string;
  borderClass: string;
  bgCardClass: string;
}> = {
  ONLINE: {
    label: 'Online',
    shortLabel: 'Online',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    borderClass: 'border-border',
    bgCardClass: '',
  },
  OFFLINE: {
    label: 'Offline',
    shortLabel: 'Offline',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    borderClass: 'border-rose-500/40',
    bgCardClass: 'bg-rose-500/[0.03]',
  },
  BELUM_DIKETAHUI: {
    label: 'Belum Diketahui',
    shortLabel: 'Belum Diketahui',
    badgeClass: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
    borderClass: 'border-zinc-500/30',
    bgCardClass: 'bg-zinc-500/[0.02]',
  },
  PERLU_REPOSISI: {
    label: 'Perlu Reposisi',
    shortLabel: 'Reposisi',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    borderClass: 'border-blue-500/40',
    bgCardClass: 'bg-blue-500/[0.03]',
  },
  PERLU_INSTALASI: {
    label: 'Perlu Penambahan Instalasi',
    shortLabel: 'Perlu Pasang',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    borderClass: 'border-amber-500/40',
    bgCardClass: 'bg-amber-500/[0.03]',
  },
};

export const CCTVChecklist: React.FC<CCTVChecklistProps> = ({
  building,
  cctvPoints,
  issues = [],
  onUpdatePoint,
  onAddPoint,
  onDeletePoint,
  onReportIssue,
  onNavigateTab,
}) => {
  // CCTV Point Modal State (Pop-out Add/Edit)
  const [pointModalState, setPointModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'EDIT';
    point: CCTVPoint | null;
  }>({
    isOpen: false,
    mode: 'ADD',
    point: null,
  });

  // Evidence Capture Modal State
  const [captureModal, setCaptureModal] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
  }>({
    isOpen: false,
    entityId: '',
    entityName: '',
  });

  // Filter tab: 'ALL' | CCTVOperationalStatus | 'ISSUES' | 'STANDALONE'
  const [activeFilter, setActiveFilter] = useState<'ALL' | CCTVOperationalStatus | 'ISSUES' | 'STANDALONE'>('ALL');

  // Extract clean number from CCTV point
  const getPointNumber = (point: CCTVPoint, index: number): number => {
    if (typeof point.pointNumber === 'number' && point.pointNumber > 0) {
      return point.pointNumber;
    }
    const match = point.locationName.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    if (typeof point.channel === 'number' && point.channel > 0) {
      return point.channel;
    }
    return index + 1;
  };

  // Resolve CCTV operational status
  const resolveCctvStatus = (point: CCTVPoint): CCTVOperationalStatus => {
    if (point.cctvStatus) return point.cctvStatus;
    if (point.status === 'PASS') return 'ONLINE';
    if (point.status === 'FAIL') {
      if (point.notes?.toLowerCase().includes('reposisi') || point.installationStatus === 'PERLU_RELOKASI') {
        return 'PERLU_REPOSISI';
      }
      return 'OFFLINE';
    }
    if (point.installationStatus === 'BELUM_TERPASANG') return 'PERLU_INSTALASI';
    return 'BELUM_DIKETAHUI';
  };

  // Find linked open issue for this CCTV point
  const findLinkedIssue = (point: CCTVPoint, pointNum: number) => {
    return issues.find(i => 
      i.category === 'CCTV' && 
      i.status === 'OPEN' && 
      (
        i.location.toLowerCase().includes(`titik ${pointNum}`) ||
        i.location.toLowerCase().includes(`#${pointNum}`) ||
        (point.objectCoverage && i.location.toLowerCase().includes(point.objectCoverage.toLowerCase())) ||
        (point.objectCoverage && i.issue.toLowerCase().includes(point.objectCoverage.toLowerCase())) ||
        (point.locationName && i.location.toLowerCase().includes(point.locationName.toLowerCase()))
      )
    );
  };

  // Create issue for a point based on its status
  const handleCreateIssueForPoint = (point: CCTVPoint, pointNum: number, currentStatus: CCTVOperationalStatus) => {
    const locName = `Titik #${pointNum}${point.objectCoverage ? ` (${point.objectCoverage})` : ''}`;
    
    if (currentStatus === 'PERLU_INSTALASI') {
      const issueDesc = `Titik #${pointNum}${point.objectCoverage ? ` (${point.objectCoverage})` : ''} perlu penambahan instalasi titik baru (penarikan kabel UTP & unit kamera baru).`;
      onReportIssue(locName, 'CCTV', issueDesc, undefined, 'Vendor CCTV (Hikvision)');
    } else if (currentStatus === 'PERLU_REPOSISI') {
      const issueDesc = `Kamera Titik #${pointNum}${point.objectCoverage ? ` (${point.objectCoverage})` : ''} perlu reposisi arah sorotan untuk menghilangkan blindspot.`;
      onReportIssue(locName, 'CCTV', issueDesc, undefined, 'Teknisi CCTV Lokal');
    } else if (currentStatus === 'OFFLINE') {
      const issueDesc = `Kamera Titik #${pointNum}${point.objectCoverage ? ` (${point.objectCoverage})` : ''} offline / mati di NVR. Perlu pengecekan kabel power DC & port switch PoE.`;
      onReportIssue(locName, 'CCTV', issueDesc, undefined, 'Teknisi CCTV Lokal');
    } else {
      const issueDesc = `Titik #${pointNum}${point.objectCoverage ? ` (${point.objectCoverage})` : ''} status belum diketahui. Perlu verifikasi fisik di lokasi dan setting di NVR.`;
      onReportIssue(locName, 'CCTV', issueDesc, undefined, 'Teknisi Siaga IT');
    }
  };

  // Change point status from dropdown
  const handleChangeStatusDropdown = (point: CCTVPoint, newStatus: CCTVOperationalStatus, pointNum: number) => {
    let checkStatus: CheckStatus = 'PASS';
    let installStatus: 'TERPASANG' | 'BELUM_TERPASANG' | 'PERLU_RELOKASI' = 'TERPASANG';

    if (newStatus === 'ONLINE') {
      checkStatus = 'PASS';
      installStatus = 'TERPASANG';
    } else if (newStatus === 'OFFLINE') {
      checkStatus = 'FAIL';
      installStatus = 'TERPASANG';
    } else if (newStatus === 'PERLU_REPOSISI') {
      checkStatus = 'FAIL';
      installStatus = 'PERLU_RELOKASI';
    } else if (newStatus === 'PERLU_INSTALASI') {
      checkStatus = 'PENDING';
      installStatus = 'BELUM_TERPASANG';
    } else if (newStatus === 'BELUM_DIKETAHUI') {
      checkStatus = 'PENDING';
      installStatus = 'TERPASANG';
    }

    onUpdatePoint({
      ...point,
      pointNumber: pointNum,
      locationName: `Titik ${pointNum}`,
      cctvStatus: newStatus,
      status: checkStatus,
      isRecording: newStatus === 'ONLINE',
      installationStatus: installStatus,
    });

    // If changing to non-online and no issue exists, offer quick issue creation
    if (newStatus !== 'ONLINE') {
      const existingIssue = findLinkedIssue(point, pointNum);
      if (!existingIssue) {
        const statusText = CCTV_STATUS_LABELS[newStatus].label;
        const confirmMsg = `Titik #${pointNum} diset ke "${statusText}". Buat catatan issue / tiket kendala sekarang?`;
        
        if (window.confirm(confirmMsg)) {
          handleCreateIssueForPoint(point, pointNum, newStatus);
        }
      }
    }
  };

  // Open Pop-out Modal for Adding New Point
  const handleOpenAdd = () => {
    setPointModalState({
      isOpen: true,
      mode: 'ADD',
      point: null,
    });
  };

  // Open Pop-out Modal for Editing Point
  const handleOpenEdit = (point: CCTVPoint) => {
    setPointModalState({
      isOpen: true,
      mode: 'EDIT',
      point,
    });
  };

  // Save from Pop-out Modal (Add or Edit)
  const handleSaveModal = (data: {
    pointNumber: number;
    locationName: string;
    objectCoverage: string;
    floorNumber?: number;
    cctvStatus: CCTVOperationalStatus;
    connectivityType: CCTVConnectivityType;
    status: CheckStatus;
    installationStatus?: 'TERPASANG' | 'BELUM_TERPASANG' | 'PERLU_RELOKASI';
    notes?: string;
    createIssueNow?: boolean;
    isStandalone?: boolean;
    takeoverStatus?: TakeoverStatus;
    masterAccount?: string;
  }) => {
    if (pointModalState.mode === 'ADD') {
      const newPt: CCTVPoint = {
        id: `cctv-${Date.now()}`,
        pointNumber: data.pointNumber,
        locationName: data.locationName,
        objectCoverage: data.objectCoverage,
        floorNumber: data.floorNumber,
        cctvStatus: data.cctvStatus,
        connectivityType: data.connectivityType,
        status: data.status,
        isRecording: data.cctvStatus === 'ONLINE',
        installationStatus: data.installationStatus || 'TERPASANG',
        notes: data.notes,
        isStandalone: data.isStandalone,
        takeoverStatus: data.takeoverStatus,
        masterAccount: data.masterAccount,
        takeoverDate: data.takeoverStatus === 'SUDAH_TAKEOVER' ? new Date().toISOString().split('T')[0] : undefined,
      };
      onAddPoint(newPt);

      // Create issue if requested
      if (data.createIssueNow && data.cctvStatus !== 'ONLINE') {
        handleCreateIssueForPoint(newPt, data.pointNumber, data.cctvStatus);
      }
    } else if (pointModalState.mode === 'EDIT' && pointModalState.point) {
      const updatedPt: CCTVPoint = {
        ...pointModalState.point,
        pointNumber: data.pointNumber,
        locationName: data.locationName,
        objectCoverage: data.objectCoverage,
        floorNumber: data.floorNumber,
        cctvStatus: data.cctvStatus,
        connectivityType: data.connectivityType,
        status: data.status,
        isRecording: data.cctvStatus === 'ONLINE',
        installationStatus: data.installationStatus || 'TERPASANG',
        notes: data.notes,
        isStandalone: data.isStandalone,
        takeoverStatus: data.takeoverStatus,
        masterAccount: data.masterAccount,
        takeoverDate: data.takeoverStatus === 'SUDAH_TAKEOVER' ? (pointModalState.point.takeoverDate || new Date().toISOString().split('T')[0]) : undefined,
      };
      onUpdatePoint(updatedPt);

      // Create issue if requested and not already existing
      if (data.createIssueNow && data.cctvStatus !== 'ONLINE') {
        const existingIssue = findLinkedIssue(updatedPt, data.pointNumber);
        if (!existingIssue) {
          handleCreateIssueForPoint(updatedPt, data.pointNumber, data.cctvStatus);
        }
      }
    }

    setPointModalState({ isOpen: false, mode: 'ADD', point: null });
  };

  // Toggle Standalone IP Cam takeover status
  const handleToggleStandaloneTakeover = (point: CCTVPoint) => {
    const nextStatus: TakeoverStatus = point.takeoverStatus === 'SUDAH_TAKEOVER' ? 'BELUM_TAKEOVER' : 'SUDAH_TAKEOVER';
    onUpdatePoint({
      ...point,
      takeoverStatus: nextStatus,
      takeoverDate: nextStatus === 'SUDAH_TAKEOVER' ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  // Delete camera point
  const handleDelete = (point: CCTVPoint, pointNum: number) => {
    if (window.confirm(`Hapus Titik #${pointNum} (${point.objectCoverage || 'CCTV'}) dari checklist?`)) {
      if (onDeletePoint) {
        onDeletePoint(point.id);
      }
    }
  };

  // Counts by status
  const onlineCount = cctvPoints.filter(p => resolveCctvStatus(p) === 'ONLINE').length;
  const offlineCount = cctvPoints.filter(p => resolveCctvStatus(p) === 'OFFLINE').length;
  const unknownCount = cctvPoints.filter(p => resolveCctvStatus(p) === 'BELUM_DIKETAHUI').length;
  const reposisiCount = cctvPoints.filter(p => resolveCctvStatus(p) === 'PERLU_REPOSISI').length;
  const instalasiCount = cctvPoints.filter(p => resolveCctvStatus(p) === 'PERLU_INSTALASI').length;
  const standalonePoints = cctvPoints.filter(p => p.isStandalone);
  const standaloneCount = standalonePoints.length;
  const standaloneTakenCount = standalonePoints.filter(p => p.takeoverStatus === 'SUDAH_TAKEOVER').length;

  const nvrDevice = building?.devices?.find(d => d.category === 'CCTV_NVR');

  const availableFloors = building?.floors.map(f => f.floorNumber) || [1, 2, 3];
  
  // Calculate next number
  const existingNumbers = cctvPoints.map((p, idx) => getPointNumber(p, idx));
  const nextPointNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  // Filtered points
  const filteredPoints = cctvPoints.filter((point, idx) => {
    const pointNum = getPointNumber(point, idx);
    const hasIssue = Boolean(findLinkedIssue(point, pointNum));
    const st = resolveCctvStatus(point);

    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'STANDALONE') return Boolean(point.isStandalone);
    if (activeFilter === 'ISSUES') return hasIssue;
    return st === activeFilter;
  });

  return (
    <div className="space-y-4">
      
      {/* Top Header Card */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                3. Titik CCTV & Keamanan — {building?.name || 'Gedung'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pemetaan titik kamera pengawasan, topologi konektivitas (PoE/Coaxial/Wi-Fi), dan verifikasi rekaman NVR
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-sm transition-colors cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Titik CCTV</span>
        </button>
      </div>

      {/* Info Card: Status Takeover Master Akses NVR & Standalone IP Cam */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              Status Takeover Master Akses CCTV & Perekam
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            SOP Go-Live IT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {/* NVR Master Access Card */}
          <div className="p-2.5 rounded-lg border border-border/80 bg-background/60 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-foreground truncate">
                  {nvrDevice ? nvrDevice.name : 'DVR / NVR Master Perekam'}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {nvrDevice ? nvrDevice.brandModel : 'Hikvision/Dahua'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ganti password admin lokal & unbind cloud owner lama (Hik-Connect / DMSS)
              </p>
            </div>

            {nvrDevice ? (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                nvrDevice.takeoverStatus === 'SUDAH_TAKEOVER'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}>
                {nvrDevice.takeoverStatus === 'SUDAH_TAKEOVER' ? '✓ TAKEOVER SELESAI' : '⚠️ BELUM TAKEOVER'}
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted text-muted-foreground shrink-0">
                Unit NVR Terdaftar
              </span>
            )}
          </div>

          {/* Standalone IP Cam Takeover Card */}
          <div className="p-2.5 rounded-lg border border-border/80 bg-background/60 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-foreground truncate">
                  IP Cam Standalone
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({standaloneCount} Titik)
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Takeover master akses akun aplikasi cloud (Ezviz / Tapo / Bardi / Tuya)
              </p>
            </div>

            {standaloneCount === 0 ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted text-muted-foreground shrink-0">
                Semua via NVR
              </span>
            ) : (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                standaloneTakenCount === standaloneCount
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}>
                {standaloneTakenCount}/{standaloneCount} Selesai
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Counter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border shrink-0 ${
            activeFilter === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          Semua Titik ({cctvPoints.length})
        </button>

        <button
          onClick={() => setActiveFilter('ONLINE')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'ONLINE'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Online ({onlineCount})</span>
        </button>

        <button
          onClick={() => setActiveFilter('OFFLINE')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'OFFLINE'
              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Offline ({offlineCount})</span>
        </button>

        <button
          onClick={() => setActiveFilter('BELUM_DIKETAHUI')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'BELUM_DIKETAHUI'
              ? 'bg-zinc-700 text-white border-zinc-700 shadow-2xs'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          <HelpCircle className="w-3 h-3 text-zinc-400" />
          <span>Belum Diketahui ({unknownCount})</span>
        </button>

        <button
          onClick={() => setActiveFilter('PERLU_REPOSISI')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'PERLU_REPOSISI'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          <RotateCw className="w-3 h-3 text-blue-500" />
          <span>Perlu Reposisi ({reposisiCount})</span>
        </button>

        <button
          onClick={() => setActiveFilter('PERLU_INSTALASI')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'PERLU_INSTALASI'
              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          <Wrench className="w-3 h-3 text-amber-500" />
          <span>Perlu Penambahan Instalasi ({instalasiCount})</span>
        </button>

        {standaloneCount > 0 && (
          <button
            onClick={() => setActiveFilter('STANDALONE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'STANDALONE'
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-card text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10'
            }`}
          >
            <KeyRound className="w-3 h-3 text-purple-500" />
            <span>IP Cam Standalone ({standaloneCount})</span>
          </button>
        )}

        {issues.filter(i => i.category === 'CCTV' && i.status === 'OPEN').length > 0 && (
          <button
            onClick={() => setActiveFilter('ISSUES')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'ISSUES'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-card text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Ada Catatan Issue ({issues.filter(i => i.category === 'CCTV' && i.status === 'OPEN').length})</span>
          </button>
        )}
      </div>

      {/* CCTV Points List */}
      <div className="space-y-3">
        {filteredPoints.map((point, index) => {
          const pointNum = getPointNumber(point, index);
          const currentStatus = resolveCctvStatus(point);
          const cfg = CCTV_STATUS_LABELS[currentStatus];
          const isOk = currentStatus === 'ONLINE';
          const linkedIssue = findLinkedIssue(point, pointNum);

          return (
            <div
              key={point.id}
              className={`p-3.5 sm:p-4 rounded-xl border bg-card flex flex-col justify-between gap-3 transition-colors ${cfg.borderClass} ${cfg.bgCardClass}`}
            >
              {/* Main Info Row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                
                {/* Left Side: Number Badge & Details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  
                  {/* Clean Prominent Number Badge */}
                  <div className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center shrink-0 ${
                    currentStatus === 'ONLINE' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : currentStatus === 'OFFLINE'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                      : currentStatus === 'PERLU_REPOSISI'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                      : currentStatus === 'PERLU_INSTALASI'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                      : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-600 dark:text-zinc-400'
                  }`}>
                    <span className="text-[10px] font-mono leading-none opacity-70">TITIK</span>
                    <span className="text-base font-extrabold font-mono leading-tight">
                      #{pointNum}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    
                    {/* Status Badges & Floor */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground tracking-tight">
                        Titik #{pointNum}
                      </span>

                      {point.floorNumber && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                          {point.floorNumber === 99 ? 'Outdoor / Luar' : `Lantai ${point.floorNumber}`}
                        </span>
                      )}

                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${cfg.badgeClass}`}>
                        {currentStatus === 'ONLINE' && <Check className="w-3 h-3" />}
                        {currentStatus === 'OFFLINE' && <X className="w-3 h-3" />}
                        {currentStatus === 'BELUM_DIKETAHUI' && <HelpCircle className="w-3 h-3" />}
                        {currentStatus === 'PERLU_REPOSISI' && <RotateCw className="w-3 h-3" />}
                        {currentStatus === 'PERLU_INSTALASI' && <Wrench className="w-3 h-3" />}
                        <span>{cfg.label}</span>
                      </span>

                      {/* Tipe Konektivitas Badge (Coaxial / LAN POE / LAN Non POE / Wifi Standalone / Wifi to NVR) */}
                      {(() => {
                        const connType: CCTVConnectivityType = point.connectivityType || (point.isStandalone ? 'WIFI_CAM_STANDALONE' : 'LAN_POE_NVR');
                        const connCfg = CCTV_CONNECTIVITY_CONFIG[connType];
                        return (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold ${connCfg?.badgeClass || 'bg-muted text-muted-foreground border-border'}`}>
                            {connType === 'COAXIAL_DVR' && <Video className="w-3 h-3 text-amber-500" />}
                            {connType === 'LAN_POE_NVR' && <Network className="w-3 h-3 text-blue-500" />}
                            {connType === 'LAN_NON_POE_NVR' && <Radio className="w-3 h-3 text-cyan-500" />}
                            {connType === 'WIFI_CAM_STANDALONE' && <Wifi className="w-3 h-3 text-purple-500" />}
                            {connType === 'WIFI_CAM_NVR' && <Radio className="w-3 h-3 text-emerald-500" />}
                            <span>{connCfg?.label || connType}</span>
                          </span>
                        );
                      })()}
                    </div>

                    {/* Target Object Coverage */}
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
                      <Target className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="text-muted-foreground font-normal">Objek Sorotan:</span>
                      {point.objectCoverage ? (
                        <span className="font-bold text-foreground">
                          {point.objectCoverage}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(point)}
                          className="text-muted-foreground hover:text-blue-500 italic text-[11px] underline cursor-pointer"
                        >
                          Belum ditentukan (Klik untuk isi target objek)
                        </button>
                      )}
                    </div>

                    {/* Standalone Takeover Master Access Pill (Matching screenshot design) */}
                    {point.isStandalone && (
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStandaloneTakeover(point)}
                          title="Klik untuk cepat toggle status takeover master akses kamera standalone"
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-all flex items-center gap-1 shadow-2xs cursor-pointer ${
                            point.takeoverStatus === 'SUDAH_TAKEOVER'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>
                            {point.takeoverStatus === 'SUDAH_TAKEOVER'
                              ? `✓ TAKEOVER: ${point.masterAccount || 'AKUN MASTER CORPORATE'}`
                              : '⚠️ BELUM TAKEOVER (AKUN LAMA)'}
                          </span>
                        </button>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                          {point.takeoverStatus === 'SUDAH_TAKEOVER' 
                            ? 'Master akses cloud tersimpan di IT Rukita' 
                            : 'Perlu reset/unbind dari akun pemilik lama'}
                        </span>
                      </div>
                    )}

                    {/* Specific Field Notes (if any) */}
                    {point.notes && (
                      <p className={`text-[11px] font-medium ${
                        currentStatus === 'OFFLINE'
                          ? 'text-rose-600 dark:text-rose-400'
                          : currentStatus === 'PERLU_INSTALASI'
                          ? 'text-amber-700 dark:text-amber-300'
                          : currentStatus === 'PERLU_REPOSISI'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-muted-foreground'
                      }`}>
                        💬 {point.notes}
                      </p>
                    )}

                  </div>
                </div>

                {/* Right Side: Status Dropdown & Action Buttons */}
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  
                  {/* Status Dropdown Selector */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                      Status:
                    </label>
                    <select
                      value={currentStatus}
                      onChange={(e) => handleChangeStatusDropdown(point, e.target.value as CCTVOperationalStatus, pointNum)}
                      className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                    >
                      <option value="ONLINE">🟢 Online</option>
                      <option value="OFFLINE">🔴 Offline</option>
                      <option value="BELUM_DIKETAHUI">⚪ Belum Diketahui</option>
                      <option value="PERLU_REPOSISI">🔵 Perlu Reposisi</option>
                      <option value="PERLU_INSTALASI">🟡 Perlu Penambahan Instalasi</option>
                    </select>
                  </div>

                  {/* Secondary Actions: Snapshot, Edit, Delete */}
                  <div className="flex items-center gap-1.5 self-end">
                    {/* Snapshot Button */}
                    <button
                      type="button"
                      onClick={() => setCaptureModal({
                        isOpen: true,
                        entityId: point.id,
                        entityName: `Titik #${pointNum}${point.objectCoverage ? ` (${point.objectCoverage})` : ''}`,
                      })}
                      className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-blue-500 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Ambil foto bukti snapshot atau kondisi titik CCTV"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-500" />
                      <span>Foto</span>
                    </button>

                    {/* Edit Pop-out */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(point)}
                      className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit nomor titik, lantai, target coverage, atau status"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Edit</span>
                    </button>

                    {/* Delete */}
                    {onDeletePoint && (
                      <button
                        type="button"
                        onClick={() => handleDelete(point, pointNum)}
                        className="p-1.5 rounded-lg border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                        title={`Hapus Titik #${pointNum}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>

              </div>

              {/* Bottom Issue Integration Bar */}
              {linkedIssue ? (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-400 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="font-mono font-bold text-[11px] shrink-0">
                      [{linkedIssue.id}]
                    </span>
                    <span className="truncate font-medium">
                      {linkedIssue.issue}
                    </span>
                    <span className="text-[10px] text-muted-foreground hidden md:inline">
                      • Vendor: {linkedIssue.vendorNote}
                    </span>
                  </div>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('issues')}
                      className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span>Lihat di Tiket Isu</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                (!isOk) && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span className="text-[11px]">
                        {currentStatus === 'PERLU_INSTALASI' && 'Titik ini perlu penambahan instalasi baru. Belum dicatat sebagai tiket issue.'}
                        {currentStatus === 'PERLU_REPOSISI' && 'Sudut kamera perlu reposisi. Belum dicatat sebagai tiket issue.'}
                        {currentStatus === 'OFFLINE' && 'Kamera offline di NVR. Belum dicatat sebagai tiket issue.'}
                        {currentStatus === 'BELUM_DIKETAHUI' && 'Status titik kamera belum diverifikasi. Belum ada catatan issue.'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCreateIssueForPoint(point, pointNum, currentStatus)}
                      className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0 active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Jadikan Catatan Issue</span>
                    </button>
                  </div>
                )
              )}

            </div>
          );
        })}

        {filteredPoints.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-xs space-y-2">
            <Video className="w-8 h-8 text-blue-500 mx-auto" />
            <p className="font-semibold text-foreground">
              {cctvPoints.length === 0 
                ? 'Belum ada titik kamera CCTV.' 
                : 'Tidak ada titik CCTV pada filter ini.'}
            </p>
            <p className="text-[11px]">
              {cctvPoints.length === 0 
                ? 'Klik tombol "+ Tambah Titik CCTV" di atas untuk menambahkan titik baru.' 
                : 'Pilih filter "Semua Titik" untuk melihat seluruh titik pengawasan.'}
            </p>
          </div>
        )}
      </div>

      {/* POP-OUT MODAL: TAMBAH / EDIT TITIK CCTV */}
      {pointModalState.isOpen && (
        <CCTVPointModal
          isOpen={pointModalState.isOpen}
          onClose={() => setPointModalState(prev => ({ ...prev, isOpen: false }))}
          mode={pointModalState.mode}
          point={pointModalState.point}
          nextNumber={nextPointNumber}
          availableFloors={availableFloors}
          onSave={handleSaveModal}
        />
      )}

      {/* Evidence Capture Modal */}
      {building && (
        <EvidenceCaptureModal
          isOpen={captureModal.isOpen}
          onClose={() => setCaptureModal(prev => ({ ...prev, isOpen: false }))}
          building={building}
          entityId={captureModal.entityId}
          entityName={captureModal.entityName}
          defaultCategory="CCTV_CHECK"
          availableCategories={[
            { label: 'Sudut CCTV / Snapshot', value: 'CCTV_CHECK' },
            { label: 'Fisik Kamera CCTV', value: 'DEVICE_ASSET' },
            { label: 'Bukti Umum', value: 'GENERAL_EVIDENCE' },
          ]}
        />
      )}

    </div>
  );
};
