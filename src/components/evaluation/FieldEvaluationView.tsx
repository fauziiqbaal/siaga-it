import React, { useState } from 'react';
import { Building, CheckStatus, FloorConfig, FloorFacility, ITDevice, RoomColiving, EvidenceCategory, InspectionVisit, VisitType, ColivingIssue, SimpleUser } from '../../types/hotel';
import { 
  Wifi, 
  Tv, 
  KeyRound, 
  Check, 
  X, 
  Search, 
  AlertCircle, 
  Plus, 
  Sparkles, 
  Building2, 
  Utensils, 
  Shield, 
  MapPin, 
  Server, 
  Cpu, 
  Network, 
  Video, 
  Copy, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Car, 
  Sun,
  Camera,
  Calendar,
  Clock,
  UserCheck,
  History,
  PenTool,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Radio,
  FileCheck
} from 'lucide-react';
import { EvidenceCaptureModal } from '../common/EvidenceCaptureModal';
import { FloorPlanDrawingModal } from '../property/FloorPlanDrawingModal';
import { IssueActionModal, IssueModalTarget } from './IssueActionModal';
import { WifiSpeedtestModal, WifiSpeedtestResult } from '../common/WifiSpeedtestModal';
import { ItemInspectModal, InspectTarget } from './ItemInspectModal';
import { EvidenceHistoryModal, EvidencePhotoItem } from './EvidenceHistoryModal';

interface FieldEvaluationViewProps {
  building: Building;
  issues?: ColivingIssue[];
  currentUser?: SimpleUser;
  onUpdateRoom: (floorId: string, updatedRoom: RoomColiving) => void;
  onUpdateFacility: (floorId: string, updatedFacility: FloorFacility) => void;
  onReportIssue: (location: string, category: 'INTERNET' | 'TV' | 'SMARTLOCK', issueText: string, photoUrl?: string, vendorNote?: string) => void;
  onResolveIssue?: (location: string, category: 'INTERNET' | 'TV' | 'SMARTLOCK', resolutionNote: string, resolutionPhotoUrl?: string) => void;
  onOpenDevicesTab?: () => void;
  onUpdateDevice?: (device: ITDevice) => void;
  onOpenPropertyTab?: () => void;
  onOpenLiveTab?: () => void;
  onUpdateBuilding?: (building: Building) => void;
}

export const FieldEvaluationView: React.FC<FieldEvaluationViewProps> = ({
  building,
  issues = [],
  currentUser,
  onUpdateRoom,
  onUpdateFacility,
  onReportIssue,
  onResolveIssue,
  onOpenDevicesTab,
  onUpdateDevice,
  onOpenPropertyTab,
  onOpenLiveTab,
  onUpdateBuilding,
}) => {
  const [selectedFloorId, setSelectedFloorId] = useState<string | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ISSUES'>('ALL');
  
  // Floor devices expand/collapse & copy/reveal states
  const [expandedDevicesFloors, setExpandedDevicesFloors] = useState<Record<string, boolean>>({
    'fl-1': true,
    'fl-2': true,
    'fl-3': true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  
  // Floor Plan Drawing State in Evaluation
  const [viewingFloor, setViewingFloor] = useState<FloorConfig | null>(null);

  const handleSaveFloorPlanInEval = (floorId: string, sketchDataUrl: string, notes?: string, elementsJson?: string) => {
    if (!onUpdateBuilding) return;
    const updatedFloors = building.floors.map(f => {
      if (f.id === floorId) {
        return {
          ...f,
          floorPlanSketch: sketchDataUrl,
          floorPlanUpdatedAt: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          floorPlanNotes: notes,
          floorPlanElements: elementsJson,
        };
      }
      return f;
    });

    onUpdateBuilding({
      ...building,
      floors: updatedFloors,
    });
  };
  
  // Evidence Capture Modal State
  const [evidenceModal, setEvidenceModal] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
    defaultCategory: EvidenceCategory;
  }>({
    isOpen: false,
    entityId: '',
    entityName: '',
    defaultCategory: 'WIFI_SPEEDTEST',
  });

  // Issue Action Pop-Out Modal State (Report Kendala vs Solve Kendala)
  const [issueModalState, setIssueModalState] = useState<{
    isOpen: boolean;
    mode: 'REPORT_ISSUE' | 'SOLVE_ISSUE';
    target: IssueModalTarget | null;
  }>({
    isOpen: false,
    mode: 'REPORT_ISSUE',
    target: null,
  });

  // Card photo zoom lightbox state
  const [cardZoomPhoto, setCardZoomPhoto] = useState<string | null>(null);

  // Speedtest & Coverage Modal Target State
  const [speedtestTarget, setSpeedtestTarget] = useState<{
    isOpen: boolean;
    floorId: string;
    entityId: string;
    entityTitle: string;
    entityType: 'ROOM' | 'FACILITY';
    currentSpeedMbps?: number;
    currentSignalDbm?: number;
  } | null>(null);

  // Item Inspect Modal State (for TV & Smartlock)
  const [inspectModalTarget, setInspectModalTarget] = useState<InspectTarget | null>(null);

  // Evidence History Modal State (View-only recorded photos history)
  const [historyModalState, setHistoryModalState] = useState<{
    isOpen: boolean;
    entityTitle: string;
    photos: EvidencePhotoItem[];
  }>({
    isOpen: false,
    entityTitle: '',
    photos: [],
  });

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const togglePasswordReveal = (deviceId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [deviceId]: !prev[deviceId]
    }));
  };

  const toggleFloorDevices = (floorId: string) => {
    setExpandedDevicesFloors(prev => ({
      ...prev,
      [floorId]: prev[floorId] === undefined ? false : !prev[floorId]
    }));
  };

  // Compute all rooms and facilities count
  const allRooms = building.floors.flatMap(f => f.rooms);
  const allFacilities = building.floors.flatMap(f => f.facilities);

  const wifiPass = allRooms.filter(r => r.wifiStatus === 'PASS').length;
  const lockPass = allRooms.filter(r => r.hasSmartlock && r.lockStatus === 'PASS').length;
  const issuesRooms = allRooms.filter(r => r.wifiStatus === 'FAIL' || (r.hasTv && r.tvStatus === 'FAIL') || (r.hasSmartlock && r.lockStatus === 'FAIL'));
  const issuesFacilities = allFacilities.filter(f => (f.hasWifi && f.wifiStatus === 'FAIL') || (f.hasTv && f.tvStatus === 'FAIL') || (f.hasLock && f.lockStatus === 'FAIL'));

  const totalPoints = allRooms.length + allFacilities.length;
  const totalPassed = (allRooms.length - issuesRooms.length) + (allFacilities.length - issuesFacilities.length);
  const readinessPercent = Math.round((totalPassed / (totalPoints || 1)) * 100);

  // Visit inspection session state
  const visits = building.inspectionVisits || [];
  const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null;

  const getCurrentDateTime = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
    return { dateStr, timeStr };
  };

  const activeUser: SimpleUser = currentUser || {
    id: 'u-admin',
    username: 'admin',
    name: 'Administrator IT',
    role: 'ADMIN',
    roleTitle: 'Super Administrator',
    pin: '4569',
    isActive: true,
    permissions: [],
    avatarColor: 'bg-indigo-600',
    failedAttempts: 0,
  };

  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState(getCurrentDateTime().dateStr);
  const [newVisitTime, setNewVisitTime] = useState(getCurrentDateTime().timeStr);
  const [newVisitType, setNewVisitType] = useState<VisitType>('QC_PROGRESS');
  const [newVisitNote, setNewVisitNote] = useState('');

  const handleOpenVisitModal = () => {
    const { dateStr, timeStr } = getCurrentDateTime();
    setNewVisitDate(dateStr);
    setNewVisitTime(timeStr);
    setNewVisitNote('');
    setNewVisitType('QC_PROGRESS');
    setIsVisitModalOpen(true);
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();

    // Rekomendasi dihitung otomatis di akhir QC:
    const calculatedRecommendation: 'GO_LIVE' | 'RE_INSPECT' | 'BLOCKER' = 
      readinessPercent >= 85 ? 'GO_LIVE' : readinessPercent >= 70 ? 'RE_INSPECT' : 'BLOCKER';

    const newVisitObj: InspectionVisit = {
      id: `vis-${Date.now()}`,
      buildingId: building.id,
      visitNumber: visits.length + 1,
      visitDate: newVisitDate.trim() || getCurrentDateTime().dateStr,
      visitTime: newVisitTime.trim() || getCurrentDateTime().timeStr,
      inspectorName: activeUser.name,
      inspectorRole: activeUser.roleTitle || (activeUser.role === 'ADMIN' ? 'Super Administrator' : activeUser.role === 'BACKOFFICE' ? 'IT Lead / Backoffice' : 'Field Engineer'),
      visitType: newVisitType,
      readinessScoreSnapshot: readinessPercent,
      summaryNote: newVisitNote.trim() || `Pengecekan kamar & fasilitas kunjungan ke-${visits.length + 1} (${readinessPercent}% lulus)`,
      blockersFound: issuesRooms.length + issuesFacilities.length,
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

    setIsVisitModalOpen(false);
    setNewVisitNote('');
  };

  const filteredFloors = building.floors.filter(f => {
    if (selectedFloorId !== 'ALL' && f.id !== selectedFloorId) return false;
    return true;
  });

  // Helper to find previous issue data from global issue list
  const getPreviousIssueData = (location: string, category: 'INTERNET' | 'TV' | 'SMARTLOCK') => {
    return issues.find(i => i.location === location && i.category === category);
  };

  // ROOM ISSUE/SOLVE POP-OUT TRIGGERS
  const handleTriggerWifiRoom = (floorId: string, room: RoomColiving) => {
    const isFail = room.wifiStatus === 'FAIL';
    const prevIssue = getPreviousIssueData(`Kamar ${room.number}`, 'INTERNET');

    setIssueModalState({
      isOpen: true,
      mode: isFail ? 'SOLVE_ISSUE' : 'REPORT_ISSUE',
      target: {
        type: 'ROOM',
        floorId,
        entityId: room.id,
        title: `Kamar ${room.number}`,
        pillar: 'WIFI',
        currentStatus: room.wifiStatus,
        previousIssueText: room.wifiIssueText || prevIssue?.issue || `Wi-Fi drop (${room.wifiSpeedMbps} Mbps) di bawah standar`,
        previousPhotoUrl: room.wifiIssuePhoto || prevIssue?.photoUrl,
        previousReportedAt: prevIssue?.photoTimestamp || prevIssue?.createdAt || 'Sebelumnya',
        speedMbps: room.wifiSpeedMbps,
      },
    });
  };

  const handleSpeedChange = (floorId: string, room: RoomColiving, speed: number) => {
    onUpdateRoom(floorId, {
      ...room,
      wifiSpeedMbps: speed,
      wifiStatus: speed >= 15 ? 'PASS' : 'FAIL',
    });
  };

  // Speedtest & Coverage Handlers
  const handleSaveSpeedtestResult = (result: WifiSpeedtestResult) => {
    if (!speedtestTarget) return;
    const { floorId, entityId, entityType } = speedtestTarget;

    if (entityType === 'ROOM') {
      const floor = building.floors.find(f => f.id === floorId);
      const room = floor?.rooms.find(r => r.id === entityId);
      if (room) {
        const updatedRoom: RoomColiving = {
          ...room,
          wifiSpeedMbps: result.downloadMbps,
          wifiSignalDbm: result.signalDbm,
          wifiBandTested: result.bandTested,
          wifiSpeed24Mbps: result.band24G.supported ? result.band24G.downloadMbps : undefined,
          wifiSignal24Dbm: result.band24G.supported ? result.band24G.signalDbm : undefined,
          wifiDualBandSupport: result.band5G.supported && result.band24G.supported,
          wifiEvidenceUrl: result.evidenceDataUrl,
          wifiStatus: result.status, // PASS if >= 15 Mbps, FAIL if < 15 Mbps
        };
        onUpdateRoom(floorId, updatedRoom);
      }
    } else if (entityType === 'FACILITY') {
      const floor = building.floors.find(f => f.id === floorId);
      const fac = floor?.facilities.find(f => f.id === entityId);
      if (fac) {
        const updatedFac: FloorFacility = {
          ...fac,
          wifiSpeedMbps: result.downloadMbps,
          wifiSignalDbm: result.signalDbm,
          wifiBandTested: result.bandTested,
          wifiSpeed24Mbps: result.band24G.supported ? result.band24G.downloadMbps : undefined,
          wifiSignal24Dbm: result.band24G.supported ? result.band24G.signalDbm : undefined,
          wifiDualBandSupport: result.band5G.supported && result.band24G.supported,
          wifiEvidenceUrl: result.evidenceDataUrl,
          wifiStatus: result.status,
        };
        onUpdateFacility(floorId, updatedFac);
      }
    }
  };

  const handleSpeedtestReportIssue = (issueText: string, evidenceDataUrl: string) => {
    if (!speedtestTarget) return;
    const { floorId, entityId, entityTitle, entityType, currentSpeedMbps } = speedtestTarget;
    setIssueModalState({
      isOpen: true,
      mode: 'REPORT_ISSUE',
      target: {
        type: entityType,
        floorId,
        entityId,
        title: entityTitle,
        pillar: 'WIFI',
        currentStatus: 'FAIL',
        previousIssueText: issueText,
        previousPhotoUrl: evidenceDataUrl,
        previousReportedAt: 'Baru saja (Speedtest)',
        speedMbps: currentSpeedMbps,
      },
    });
  };

  const handleTriggerTvRoom = (floorId: string, room: RoomColiving) => {
    if (!room.hasTv) return;
    const isFail = room.tvStatus === 'FAIL';
    const prevIssue = getPreviousIssueData(`Kamar ${room.number}`, 'TV');

    setIssueModalState({
      isOpen: true,
      mode: isFail ? 'SOLVE_ISSUE' : 'REPORT_ISSUE',
      target: {
        type: 'ROOM',
        floorId,
        entityId: room.id,
        title: `Kamar ${room.number}`,
        pillar: 'TV',
        currentStatus: room.tvStatus,
        previousIssueText: room.tvIssueText || prevIssue?.issue || 'Android TV / Cable TV error tidak bisa ditonton',
        previousPhotoUrl: room.tvIssuePhoto || prevIssue?.photoUrl,
        previousReportedAt: prevIssue?.photoTimestamp || prevIssue?.createdAt || 'Sebelumnya',
      },
    });
  };

  const handleTriggerLockRoom = (floorId: string, room: RoomColiving) => {
    const isFail = room.lockStatus === 'FAIL';
    const prevIssue = getPreviousIssueData(`Kamar ${room.number}`, 'SMARTLOCK');

    setIssueModalState({
      isOpen: true,
      mode: isFail ? 'SOLVE_ISSUE' : 'REPORT_ISSUE',
      target: {
        type: 'ROOM',
        floorId,
        entityId: room.id,
        title: `Kamar ${room.number}`,
        pillar: 'SMARTLOCK',
        currentStatus: room.lockStatus,
        previousIssueText: room.lockIssueText || prevIssue?.issue || (room.hasSmartlock ? 'Smartlock error / macet / RFID gagal' : 'Kunci kamar bermasalah / macet'),
        previousPhotoUrl: room.lockIssuePhoto || prevIssue?.photoUrl,
        previousReportedAt: prevIssue?.photoTimestamp || prevIssue?.createdAt || 'Sebelumnya',
      },
    });
  };

  const handleFacilitySpeedChange = (floorId: string, fac: FloorFacility, speed: number) => {
    onUpdateFacility(floorId, {
      ...fac,
      wifiSpeedMbps: speed,
      wifiStatus: speed >= 15 ? 'PASS' : 'FAIL',
    });
  };

  // Photos Gathering Helpers for Evidence History Modal
  const getRoomPhotos = (room: RoomColiving): EvidencePhotoItem[] => {
    const list: EvidencePhotoItem[] = [];
    if (room.wifiEvidenceUrl) {
      list.push({
        id: `wifi-cert-${room.id}`,
        url: room.wifiEvidenceUrl,
        title: `Sertifikat Speedtest (${room.wifiSpeedMbps} Mbps)`,
        pillar: 'WIFI',
        statusTag: 'SPEEDTEST',
        timestamp: 'Speedtest Terverifikasi',
      });
    }
    if (room.wifiIssuePhoto) {
      list.push({
        id: `wifi-issue-${room.id}`,
        url: room.wifiIssuePhoto,
        title: `Kendala Wi-Fi: ${room.wifiIssueText || 'Drop'}`,
        pillar: 'WIFI',
        statusTag: 'FAIL',
        timestamp: 'Laporan Kendala',
      });
    }
    if (room.wifiResolvedPhoto) {
      list.push({
        id: `wifi-res-${room.id}`,
        url: room.wifiResolvedPhoto,
        title: `Perbaikan Wi-Fi: ${room.wifiResolvedNote || 'Selesai'}`,
        pillar: 'WIFI',
        statusTag: 'RESOLVED',
        timestamp: 'Perbaikan Selesai',
      });
    }
    if (room.tvIssuePhoto) {
      list.push({
        id: `tv-issue-${room.id}`,
        url: room.tvIssuePhoto,
        title: `Kendala TV: ${room.tvIssueText || 'Error'}`,
        pillar: 'TV',
        statusTag: 'FAIL',
        timestamp: 'Laporan Kendala',
      });
    }
    if (room.tvResolvedPhoto) {
      list.push({
        id: `tv-res-${room.id}`,
        url: room.tvResolvedPhoto,
        title: `Inspeksi TV: ${room.tvResolvedNote || 'Normal'}`,
        pillar: 'TV',
        statusTag: 'PASS',
        timestamp: 'Inspeksi QC',
      });
    }
    if (room.lockIssuePhoto) {
      list.push({
        id: `lock-issue-${room.id}`,
        url: room.lockIssuePhoto,
        title: `Kendala Smartlock: ${room.lockIssueText || 'Macet'}`,
        pillar: 'SMARTLOCK',
        statusTag: 'FAIL',
        timestamp: 'Laporan Kendala',
      });
    }
    if (room.lockResolvedPhoto) {
      list.push({
        id: `lock-res-${room.id}`,
        url: room.lockResolvedPhoto,
        title: `Inspeksi Smartlock: ${room.lockResolvedNote || 'Normal'}`,
        pillar: 'SMARTLOCK',
        statusTag: 'PASS',
        timestamp: 'Inspeksi QC',
      });
    }

    issues.filter(i => i.location === `Kamar ${room.number}`).forEach(i => {
      if (i.photoUrl && !list.some(p => p.url === i.photoUrl)) {
        list.push({
          id: `iss-${i.id}`,
          url: i.photoUrl,
          title: `Kendala: ${i.issue}`,
          pillar: i.category === 'INTERNET' ? 'WIFI' : i.category === 'TV' ? 'TV' : 'SMARTLOCK',
          statusTag: i.status === 'RESOLVED' ? 'RESOLVED' : 'FAIL',
          timestamp: i.photoTimestamp || i.createdAt,
        });
      }
    });

    return list;
  };

  const getFacilityPhotos = (fac: FloorFacility): EvidencePhotoItem[] => {
    const list: EvidencePhotoItem[] = [];
    if (fac.wifiEvidenceUrl) {
      list.push({
        id: `wifi-cert-${fac.id}`,
        url: fac.wifiEvidenceUrl,
        title: `Sertifikat Speedtest (${fac.wifiSpeedMbps} Mbps)`,
        pillar: 'WIFI',
        statusTag: 'SPEEDTEST',
        timestamp: 'Speedtest Terverifikasi',
      });
    }
    if (fac.wifiIssuePhoto) {
      list.push({
        id: `wifi-issue-${fac.id}`,
        url: fac.wifiIssuePhoto,
        title: `Kendala Wi-Fi: ${fac.wifiIssueText || 'Drop'}`,
        pillar: 'WIFI',
        statusTag: 'FAIL',
        timestamp: 'Laporan Kendala',
      });
    }
    if (fac.wifiResolvedPhoto) {
      list.push({
        id: `wifi-res-${fac.id}`,
        url: fac.wifiResolvedPhoto,
        title: `Perbaikan Wi-Fi: ${fac.wifiResolvedNote || 'Selesai'}`,
        pillar: 'WIFI',
        statusTag: 'RESOLVED',
        timestamp: 'Perbaikan Selesai',
      });
    }
    if (fac.tvIssuePhoto) {
      list.push({
        id: `tv-issue-${fac.id}`,
        url: fac.tvIssuePhoto,
        title: `Kendala TV: ${fac.tvIssueText || 'Error'}`,
        pillar: 'TV',
        statusTag: 'FAIL',
        timestamp: 'Laporan Kendala',
      });
    }
    if (fac.tvResolvedPhoto) {
      list.push({
        id: `tv-res-${fac.id}`,
        url: fac.tvResolvedPhoto,
        title: `Inspeksi TV: ${fac.tvResolvedNote || 'Normal'}`,
        pillar: 'TV',
        statusTag: 'PASS',
        timestamp: 'Inspeksi QC',
      });
    }
    if (fac.lockIssuePhoto) {
      list.push({
        id: `lock-issue-${fac.id}`,
        url: fac.lockIssuePhoto,
        title: `Kendala Smartlock: ${fac.lockIssueText || 'Macet'}`,
        pillar: 'SMARTLOCK',
        statusTag: 'FAIL',
        timestamp: 'Laporan Kendala',
      });
    }
    if (fac.lockResolvedPhoto) {
      list.push({
        id: `lock-res-${fac.id}`,
        url: fac.lockResolvedPhoto,
        title: `Inspeksi Smartlock: ${fac.lockResolvedNote || 'Normal'}`,
        pillar: 'SMARTLOCK',
        statusTag: 'PASS',
        timestamp: 'Inspeksi QC',
      });
    }

    issues.filter(i => i.location === fac.name).forEach(i => {
      if (i.photoUrl && !list.some(p => p.url === i.photoUrl)) {
        list.push({
          id: `iss-${i.id}`,
          url: i.photoUrl,
          title: `Kendala: ${i.issue}`,
          pillar: i.category === 'INTERNET' ? 'WIFI' : i.category === 'TV' ? 'TV' : 'SMARTLOCK',
          statusTag: i.status === 'RESOLVED' ? 'RESOLVED' : 'FAIL',
          timestamp: i.photoTimestamp || i.createdAt,
        });
      }
    });

    return list;
  };

  const handleOpenItemInspect = (
    type: 'ROOM' | 'FACILITY',
    floorId: string,
    entityId: string,
    title: string,
    pillar: 'TV' | 'SMARTLOCK',
    currentStatus: CheckStatus
  ) => {
    setInspectModalTarget({
      type,
      floorId,
      entityId,
      title,
      pillar,
      currentStatus,
    });
  };

  const handleConfirmItemInspection = ({
    status,
    note,
    photoUrl,
    issuePreset,
  }: {
    status: 'PASS' | 'FAIL';
    note?: string;
    photoUrl?: string;
    issuePreset?: string;
  }) => {
    if (!inspectModalTarget) return;
    const { type, floorId, entityId, title, pillar } = inspectModalTarget;

    if (type === 'ROOM') {
      const floor = building.floors.find(f => f.id === floorId);
      const room = floor?.rooms.find(r => r.id === entityId);
      if (room) {
        let updated: RoomColiving = { ...room };
        if (pillar === 'TV') {
          if (status === 'PASS') {
            updated = {
              ...updated,
              tvStatus: 'PASS',
              tvResolvedNote: note,
              tvResolvedPhoto: photoUrl,
              tvIssueText: undefined,
              tvIssuePhoto: undefined,
            };
          } else {
            updated = {
              ...updated,
              tvStatus: 'FAIL',
              tvIssueText: issuePreset || note || 'TV bermasalah',
              tvIssuePhoto: photoUrl,
            };
            onReportIssue(title, 'TV', issuePreset || note || 'TV bermasalah', photoUrl);
          }
        } else if (pillar === 'SMARTLOCK') {
          if (status === 'PASS') {
            updated = {
              ...updated,
              lockStatus: 'PASS',
              lockResolvedNote: note,
              lockResolvedPhoto: photoUrl,
              lockIssueText: undefined,
              lockIssuePhoto: undefined,
            };
          } else {
            updated = {
              ...updated,
              lockStatus: 'FAIL',
              lockIssueText: issuePreset || note || 'Smartlock bermasalah',
              lockIssuePhoto: photoUrl,
            };
            onReportIssue(title, 'SMARTLOCK', issuePreset || note || 'Smartlock bermasalah', photoUrl);
          }
        }
        onUpdateRoom(floorId, updated);
      }
    } else {
      const floor = building.floors.find(f => f.id === floorId);
      const fac = floor?.facilities.find(fc => fc.id === entityId);
      if (fac) {
        let updated: FloorFacility = { ...fac };
        if (pillar === 'TV') {
          if (status === 'PASS') {
            updated = {
              ...updated,
              tvStatus: 'PASS',
              tvResolvedNote: note,
              tvResolvedPhoto: photoUrl,
              tvIssueText: undefined,
              tvIssuePhoto: undefined,
            };
          } else {
            updated = {
              ...updated,
              tvStatus: 'FAIL',
              tvIssueText: issuePreset || note || 'TV fasilitas bermasalah',
              tvIssuePhoto: photoUrl,
            };
            onReportIssue(title, 'TV', issuePreset || note || 'TV fasilitas bermasalah', photoUrl);
          }
        } else if (pillar === 'SMARTLOCK') {
          if (status === 'PASS') {
            updated = {
              ...updated,
              lockStatus: 'PASS',
              lockResolvedNote: note,
              lockResolvedPhoto: photoUrl,
              lockIssueText: undefined,
              lockIssuePhoto: undefined,
            };
          } else {
            updated = {
              ...updated,
              lockStatus: 'FAIL',
              lockIssueText: issuePreset || note || 'Akses smartlock fasilitas bermasalah',
              lockIssuePhoto: photoUrl,
            };
            onReportIssue(title, 'SMARTLOCK', issuePreset || note || 'Akses smartlock fasilitas bermasalah', photoUrl);
          }
        }
        onUpdateFacility(floorId, updated);
      }
    }
  };

  const handleOpenPhotoHistory = (entityTitle: string, photos: EvidencePhotoItem[]) => {
    setHistoryModalState({
      isOpen: true,
      entityTitle,
      photos,
    });
  };

  // FACILITY ISSUE/SOLVE POP-OUT TRIGGERS
  const handleTriggerFacilityWifi = (floorId: string, fac: FloorFacility) => {
    const isFail = fac.wifiStatus === 'FAIL';
    const prevIssue = getPreviousIssueData(fac.name, 'INTERNET');

    setIssueModalState({
      isOpen: true,
      mode: isFail ? 'SOLVE_ISSUE' : 'REPORT_ISSUE',
      target: {
        type: 'FACILITY',
        floorId,
        entityId: fac.id,
        title: fac.name,
        pillar: 'WIFI',
        currentStatus: fac.wifiStatus,
        previousIssueText: fac.wifiIssueText || prevIssue?.issue || `Wi-Fi di ${fac.name} drop / tidak terhubung`,
        previousPhotoUrl: fac.wifiIssuePhoto || prevIssue?.photoUrl,
        previousReportedAt: prevIssue?.photoTimestamp || prevIssue?.createdAt || 'Sebelumnya',
        speedMbps: fac.wifiSpeedMbps,
      },
    });
  };

  const handleTriggerFacilityLock = (floorId: string, fac: FloorFacility) => {
    const isFail = fac.lockStatus === 'FAIL';
    const prevIssue = getPreviousIssueData(fac.name, 'SMARTLOCK');

    setIssueModalState({
      isOpen: true,
      mode: isFail ? 'SOLVE_ISSUE' : 'REPORT_ISSUE',
      target: {
        type: 'FACILITY',
        floorId,
        entityId: fac.id,
        title: fac.name,
        pillar: 'SMARTLOCK',
        currentStatus: fac.lockStatus,
        previousIssueText: fac.lockIssueText || prevIssue?.issue || `Akses smartlock/pintu di ${fac.name} gagal berfungsi`,
        previousPhotoUrl: fac.lockIssuePhoto || prevIssue?.photoUrl,
        previousReportedAt: prevIssue?.photoTimestamp || prevIssue?.createdAt || 'Sebelumnya',
      },
    });
  };

  const handleTriggerFacilityTv = (floorId: string, fac: FloorFacility) => {
    const isFail = fac.tvStatus === 'FAIL';
    const prevIssue = getPreviousIssueData(fac.name, 'TV');

    setIssueModalState({
      isOpen: true,
      mode: isFail ? 'SOLVE_ISSUE' : 'REPORT_ISSUE',
      target: {
        type: 'FACILITY',
        floorId,
        entityId: fac.id,
        title: fac.name,
        pillar: 'TV',
        currentStatus: fac.tvStatus,
        previousIssueText: fac.tvIssueText || prevIssue?.issue || `TV di ${fac.name} tidak bisa ditonton`,
        previousPhotoUrl: fac.tvIssuePhoto || prevIssue?.photoUrl,
        previousReportedAt: prevIssue?.photoTimestamp || prevIssue?.createdAt || 'Sebelumnya',
      },
    });
  };

  // CONFIRM REPORT (FAIL) HANDLER
  const handleConfirmReport = ({
    issueText,
    photoUrl,
    photoTimestamp,
    vendorTarget,
  }: {
    issueText: string;
    photoUrl?: string;
    photoTimestamp?: string;
    vendorTarget?: string;
  }) => {
    if (!issueModalState.target) return;
    const { type, floorId, entityId, pillar, title } = issueModalState.target;
    const category = pillar === 'WIFI' ? 'INTERNET' : pillar === 'TV' ? 'TV' : 'SMARTLOCK';

    if (type === 'ROOM') {
      const floor = building.floors.find(f => f.id === floorId);
      const room = floor?.rooms.find(r => r.id === entityId);
      if (room) {
        const updated: RoomColiving = {
          ...room,
          ...(pillar === 'WIFI' && {
            wifiStatus: 'FAIL',
            wifiIssueText: issueText,
            wifiIssuePhoto: photoUrl,
          }),
          ...(pillar === 'TV' && {
            tvStatus: 'FAIL',
            tvIssueText: issueText,
            tvIssuePhoto: photoUrl,
          }),
          ...(pillar === 'SMARTLOCK' && {
            lockStatus: 'FAIL',
            lockIssueText: issueText,
            lockIssuePhoto: photoUrl,
          }),
        };
        onUpdateRoom(floorId, updated);
      }
    } else {
      const floor = building.floors.find(f => f.id === floorId);
      const fac = floor?.facilities.find(fc => fc.id === entityId);
      if (fac) {
        const updated: FloorFacility = {
          ...fac,
          ...(pillar === 'WIFI' && {
            wifiStatus: 'FAIL',
            wifiIssueText: issueText,
            wifiIssuePhoto: photoUrl,
          }),
          ...(pillar === 'TV' && {
            tvStatus: 'FAIL',
            tvIssueText: issueText,
            tvIssuePhoto: photoUrl,
          }),
          ...(pillar === 'SMARTLOCK' && {
            lockStatus: 'FAIL',
            lockIssueText: issueText,
            lockIssuePhoto: photoUrl,
          }),
        };
        onUpdateFacility(floorId, updated);
      }
    }

    onReportIssue(title, category, issueText, photoUrl, vendorTarget);
  };

  // CONFIRM SOLVE (PASS / OK) HANDLER
  const handleConfirmSolve = ({
    resolutionNote,
    resolutionPhotoUrl,
    resolutionTimestamp,
    updatedSpeedMbps,
  }: {
    resolutionNote: string;
    resolutionPhotoUrl?: string;
    resolutionTimestamp?: string;
    updatedSpeedMbps?: number;
  }) => {
    if (!issueModalState.target) return;
    const { type, floorId, entityId, pillar, title } = issueModalState.target;
    const category = pillar === 'WIFI' ? 'INTERNET' : pillar === 'TV' ? 'TV' : 'SMARTLOCK';

    if (type === 'ROOM') {
      const floor = building.floors.find(f => f.id === floorId);
      const room = floor?.rooms.find(r => r.id === entityId);
      if (room) {
        const updated: RoomColiving = {
          ...room,
          ...(pillar === 'WIFI' && {
            wifiStatus: 'PASS',
            wifiResolvedNote: resolutionNote,
            wifiResolvedPhoto: resolutionPhotoUrl,
            ...(updatedSpeedMbps ? { wifiSpeedMbps: updatedSpeedMbps } : {}),
          }),
          ...(pillar === 'TV' && {
            tvStatus: 'PASS',
            tvResolvedNote: resolutionNote,
            tvResolvedPhoto: resolutionPhotoUrl,
          }),
          ...(pillar === 'SMARTLOCK' && {
            lockStatus: 'PASS',
            lockResolvedNote: resolutionNote,
            lockResolvedPhoto: resolutionPhotoUrl,
          }),
        };
        onUpdateRoom(floorId, updated);
      }
    } else {
      const floor = building.floors.find(f => f.id === floorId);
      const fac = floor?.facilities.find(fc => fc.id === entityId);
      if (fac) {
        const updated: FloorFacility = {
          ...fac,
          ...(pillar === 'WIFI' && {
            wifiStatus: 'PASS',
            wifiResolvedNote: resolutionNote,
            wifiResolvedPhoto: resolutionPhotoUrl,
            ...(updatedSpeedMbps ? { wifiSpeedMbps: updatedSpeedMbps } : {}),
          }),
          ...(pillar === 'TV' && {
            tvStatus: 'PASS',
            tvResolvedNote: resolutionNote,
            tvResolvedPhoto: resolutionPhotoUrl,
          }),
          ...(pillar === 'SMARTLOCK' && {
            lockStatus: 'PASS',
            lockResolvedNote: resolutionNote,
            lockResolvedPhoto: resolutionPhotoUrl,
          }),
        };
        onUpdateFacility(floorId, updated);
      }
    }

    if (onResolveIssue) {
      onResolveIssue(title, category, resolutionNote, resolutionPhotoUrl);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner: Skor Kesiapan Penilaian Lapangan */}
      <div className="p-3 sm:p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs">
        <div>
          <span className="text-sm sm:text-base font-bold text-foreground block">
            Kesiapan Live IT — {building.name}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
            Checklist Wi-Fi kamar, fasilitas, TV, dan akses kunci
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right">
            <span className={`text-base sm:text-xl font-mono font-bold block leading-none ${readinessPercent >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {readinessPercent}%
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">
              {totalPassed}/{totalPoints} Titik
            </span>
          </div>

          <div className="w-12 sm:w-16 h-2 rounded-full bg-muted overflow-hidden">
            <div
              style={{ width: `${readinessPercent}%` }}
              className={`h-full rounded-full ${readinessPercent >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
          </div>
        </div>
      </div>

      {/* Banner Mode Penilaian QC Lapangan (Spesifikasi Master Terkunci) */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground">Mode Penilaian QC (Spesifikasi Gedung Terkunci)</span>
              <span className="text-[10px] px-2 py-0.2 rounded font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 uppercase">
                Read-Only Template
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Data kamar, lantai, dan fasilitas mengikuti base template properti. Pada tahap ini Anda hanya melakukan inspeksi sinyal/speedtest, fungsionalitas TV & Smartlock, serta pelaporan kendala.
            </p>
          </div>
        </div>

        {onOpenPropertyTab && (
          <button
            onClick={onOpenPropertyTab}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-2xs cursor-pointer"
            title="Buka modul Gedung & Template jika perlu mengubah struktur kamar/lantai"
          >
            <span>Ubah Master Template</span>
            <ExternalLink className="w-3 h-3 text-blue-500" />
          </button>
        )}
      </div>

      {/* Sesi Kunjungan & Info Tanggal Cek Visit Lapangan */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground">Sesi Cek Visit:</span>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-background border border-border text-blue-600 dark:text-blue-400">
                {latestVisit ? `Kunjungan #${latestVisit.visitNumber} (${latestVisit.visitDate})` : 'Kunjungan Perdana (Hari ini)'}
              </span>
              {latestVisit?.visitTime && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-muted text-muted-foreground border border-border">
                  {latestVisit.visitTime}
                </span>
              )}
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                {latestVisit ? latestVisit.visitType.replace(/_/g, ' ') : 'QC PROGRESS'}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                Teknisi Bertugas: <strong className="text-foreground">{latestVisit ? latestVisit.inspectorName : 'Tim IT Field Ops'}</strong>
                {latestVisit?.inspectorRole && <span className="text-muted-foreground font-normal">({latestVisit.inspectorRole})</span>}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <History className="w-3 h-3 text-blue-500" />
                <span>{visits.length}x riwayat visit</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenVisitModal}
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors shadow-xs active:scale-95"
            title="Catat sesi kunjungan baru oleh akun Anda"
          >
            <Plus className="w-3 h-3" />
            <span>+ Catat Visit Baru</span>
          </button>
          {onOpenLiveTab && (
            <button
              onClick={onOpenLiveTab}
              className="px-2.5 py-1 rounded bg-background border border-border hover:bg-muted text-foreground font-semibold text-[11px] flex items-center gap-1 transition-colors shadow-xs"
              title="Buka laporan kesiapan live & audit trail lengkap"
            >
              <span>Riwayat & Kesiapan Live</span>
              <ExternalLink className="w-3 h-3 text-blue-500" />
            </button>
          )}
        </div>
      </div>

      {/* SOP Penyeragaman Wi-Fi & SSID Testing Info Banner */}
      {building.wifiStandardProfile?.status === 'STANDAR_TERAPKAN' ? (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">SSID Standar Live:</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-background border border-border text-blue-600 dark:text-blue-400">
                  {building.wifiStandardProfile.guestSsid}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  SOP Live Terpenuhi
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Password: <strong className="text-foreground font-mono">{building.wifiStandardProfile.isCaptivePortal ? 'Captive Portal / Web Login' : (building.wifiStandardProfile.guestPassword || '-')}</strong></span>
                <span>•</span>
                <span>Hubungkan HP inspeksi ke SSID ini untuk uji speedtest & roaming</span>
              </div>
            </div>
          </div>

          {onOpenPropertyTab && (
            <button
              onClick={onOpenPropertyTab}
              className="px-2.5 py-1 rounded bg-background border border-border hover:bg-muted text-foreground text-[11px] font-semibold shrink-0 self-start sm:self-auto flex items-center gap-1 shadow-xs"
            >
              <span>Detail SSID</span>
              <ExternalLink className="w-3 h-3 text-blue-500" />
            </button>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">Prosedur SOP: SSID Belum Diseragamkan!</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  Wajib Setting
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                SSID properti masih menggunakan nama default vendor/teknisi (<strong className="text-foreground font-mono">{building.wifiStandardProfile?.guestSsid || 'Default Vendor'}</strong>). Prosedur live mewajibkan penyeragaman SSID & Password ke standar brand sebelum Go-Live.
              </p>
            </div>
          </div>

          {onOpenPropertyTab && (
            <button
              onClick={onOpenPropertyTab}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-xs self-start sm:self-auto active:scale-95"
            >
              <span>Atur SSID Sekarang</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Filter Bar: Floor selector & Search */}
      <div className="flex flex-col gap-2 p-2.5 sm:p-3 rounded-xl bg-card border border-border">
        
        {/* Floor Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs -mx-1 px-1 touch-pan-x">
          <button
            onClick={() => setSelectedFloorId('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${selectedFloorId === 'ALL' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted bg-muted/40'}`}
          >
            Semua ({allRooms.length} Kamar)
          </button>
          {building.floors.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFloorId(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${selectedFloorId === f.id ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted bg-muted/40'}`}
            >
              {f.name.split('(')[0].trim()} ({f.rooms.length})
            </button>
          ))}
        </div>

        {/* Search & Issues Filter */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={() => setFilterMode(filterMode === 'ALL' ? 'ISSUES' : 'ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 flex items-center gap-1 ${
              filterMode === 'ISSUES'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{filterMode === 'ISSUES' ? 'Semua' : `Masalah (${issuesRooms.length + issuesFacilities.length})`}</span>
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Cari kamar / fasilitas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
            />
          </div>

          {/* Quick Denah Lantai Trigger */}
          {selectedFloorId !== 'ALL' && (() => {
            const currentSelectedFloor = building.floors.find(f => f.id === selectedFloorId);
            if (!currentSelectedFloor) return null;
            return (
              <button
                onClick={() => setViewingFloor(currentSelectedFloor)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs ${
                  currentSelectedFloor.floorPlanSketch
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
                title={currentSelectedFloor.floorPlanSketch ? 'Buka denah sketsa lantai ini' : 'Gambar denah lantai baru (Touch & Draw)'}
              >
                <PenTool className="w-3.5 h-3.5 text-indigo-500" />
                <span>{currentSelectedFloor.floorPlanSketch ? `Denah ${currentSelectedFloor.name.split(' ')[0]}` : '+ Denah'}</span>
                {currentSelectedFloor.floorPlanSketch && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Floor by Floor Evaluation Content */}
      <div className="space-y-5">
        {filteredFloors.map((floor) => {
          const roomsMatching = floor.rooms.filter(r => {
            if (filterMode === 'ISSUES') {
              const hasIssue = r.wifiStatus === 'FAIL' || (r.hasTv && r.tvStatus === 'FAIL') || r.lockStatus === 'FAIL';
              if (!hasIssue) return false;
            }
            if (search.trim()) {
              const q = search.toLowerCase();
              const tvLabel = r.hasTv ? 'tv ada tv' : 'tanpa tv non-tv';
              const lockLabel = r.hasSmartlock ? 'smartlock' : 'kunci biasa';
              return r.number.toLowerCase().includes(q) || tvLabel.includes(q) || lockLabel.includes(q);
            }
            return true;
          });

          const facilitiesMatching = floor.facilities.filter(f => {
            if (filterMode === 'ISSUES') {
              const hasIssue = f.wifiStatus === 'FAIL' || f.tvStatus === 'FAIL' || f.lockStatus === 'FAIL';
              if (!hasIssue) return false;
            }
            if (search.trim()) {
              return f.name.toLowerCase().includes(search.toLowerCase());
            }
            return true;
          });

          if (roomsMatching.length === 0 && facilitiesMatching.length === 0) {
            return null;
          }

          const floorDevices = (building.devices || []).filter(
            d => d.floorNumber === floor.floorNumber || d.floorId === floor.id
          );
          const isDevicesExpanded = expandedDevicesFloors[floor.id] ?? true;

          return (
            <div key={floor.id} className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5">
              
              {/* Floor Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">
                    {floor.name}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ({floor.rooms.length} Kamar, {floor.facilities.length} Fasilitas)
                  </span>
                </div>

                {floorDevices.length > 0 && (
                  <button
                    onClick={() => toggleFloorDevices(floor.id)}
                    className="text-[11px] font-medium text-blue-500 hover:text-blue-400 flex items-center gap-1"
                  >
                    <Server className="w-3 h-3" />
                    <span>{floorDevices.length} Perangkat IT</span>
                    {isDevicesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Floor IT Hardware Devices Box (Instant access to AP, Switch, Gateway credentials) */}
              {floorDevices.length > 0 && (
                <div className="rounded-lg border border-border/80 bg-background/90 overflow-hidden shadow-xs">
                  <div
                    onClick={() => toggleFloorDevices(floor.id)}
                    className="p-2.5 px-3 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Server className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        Perangkat IT Terpasang di Lantai Ini ({floorDevices.length} Unit)
                      </span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        • Info IP, SN & Password Teknisi
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {floorDevices.some(d => d.configStatus === 'NEEDS_CONFIG') && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                          Perlu Setting
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {isDevicesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </div>
                  </div>

                  {isDevicesExpanded && (
                    <div className="p-3 pt-1 border-t border-border/60 space-y-2 bg-muted/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {floorDevices.map(dev => {
                          return (
                            <div
                              key={dev.id}
                              className="p-2.5 rounded-lg border border-border bg-card/80 flex flex-col justify-between gap-2 text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-foreground text-xs">{dev.name}</span>
                                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground">
                                      {dev.brandModel}
                                    </span>
                                    {(dev.category === 'ACCESS_POINT' || dev.category === 'WIRELESS_DEVICE' || dev.subCategory === 'Access Point' || dev.subCategory === 'Router Wireless Desktop') && 
                                      dev.category !== 'ROUTER_GATEWAY' && dev.category !== 'ROUTER_MODEM' && dev.subCategory !== 'Router' && !dev.name?.toLowerCase().includes('router gateway') && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                        dev.ssidStatus === 'SSID_CHANGED'
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                      }`}>
                                        {dev.ssidStatus === 'SSID_CHANGED' ? '✓ SSID Diganti' : '⚠️ SSID Default'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                                    📍 {dev.locationDetail}
                                  </span>
                                </div>

                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                                    dev.configStatus === 'CONFIGURED'
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                      : dev.configStatus === 'NEEDS_CONFIG'
                                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                                  }`}
                                >
                                  {dev.configStatus === 'CONFIGURED' && 'Siap Live'}
                                  {dev.configStatus === 'NEEDS_CONFIG' && 'Perlu Config'}
                                  {dev.configStatus === 'OFFLINE' && 'Offline'}
                                </span>
                              </div>
                              {dev.notes && (
                                <p className="text-[10px] text-muted-foreground italic truncate pt-1 border-t border-border/40">
                                  {dev.notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {onOpenDevicesTab && (
                        <div className="text-right pt-1">
                          <button
                            onClick={onOpenDevicesTab}
                            className="text-[11px] text-blue-500 hover:text-blue-400 font-medium inline-flex items-center gap-1"
                          >
                            <span>Buka Inventaris Lengkap & Atur Konfigurasi</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 1. Fasilitas Komunal di Lantai Ini (Dapur, Balcony, Rooftop, dll.) */}
              {facilitiesMatching.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider block">
                    Fasilitas Bersama di Lantai Ini ({facilitiesMatching.length}):
                  </span>

                  <div className="space-y-2">
                    {facilitiesMatching.map((fac) => {
                      const facHasIssue = (fac.hasWifi && fac.wifiStatus === 'FAIL') || (fac.hasLock && fac.lockStatus === 'FAIL') || (fac.hasTv && fac.tvStatus === 'FAIL');

                      return (
                        <div
                          key={fac.id}
                          className={`p-3 rounded-xl border bg-background flex flex-col gap-2.5 text-xs transition-colors shadow-2xs ${
                            facHasIssue ? 'border-rose-500/40 bg-rose-500/[0.03]' : 'border-border'
                          }`}
                        >
                          {/* Baris Utama: Info Fasilitas di kiri, Check Controls di kanan (Identik dengan Kamar) */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 w-full">
                            {/* Facility Icon & Subcategory / Marking Toggles */}
                            <div className="flex items-center justify-between sm:justify-start gap-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-lg bg-muted border border-border/80 flex items-center justify-center shrink-0 shadow-2xs">
                                  {fac.type === 'PARKIRAN' && <Car className="w-5 h-5 text-emerald-500" />}
                                  {fac.type === 'ROOFTOP' && <Sun className="w-5 h-5 text-amber-500" />}
                                  {fac.type === 'DAPUR' && <Utensils className="w-5 h-5 text-orange-500" />}
                                  {fac.type === 'PAGAR_GERBANG' && <Shield className="w-5 h-5 text-indigo-500" />}
                                  {fac.type === 'COMMUNAL_LOUNGE' && <Tv className="w-5 h-5 text-purple-500" />}
                                  {fac.type === 'SERVER_IT' && <Server className="w-5 h-5 text-blue-500" />}
                                  {fac.type === 'LAUNDRY' && <Sparkles className="w-5 h-5 text-cyan-500" />}
                                  {!['PARKIRAN', 'ROOFTOP', 'DAPUR', 'PAGAR_GERBANG', 'COMMUNAL_LOUNGE', 'SERVER_IT', 'LAUNDRY'].includes(fac.type) && (
                                    <Building2 className="w-5 h-5 text-blue-500" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-foreground text-xs sm:text-sm">{fac.name}</span>
                                    {facHasIssue && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                        Kendala
                                      </span>
                                    )}
                                  </div>
                                  {/* Read-Only Base Template Specification Badges (Terkunci Sesuai Master Template) */}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border/60 min-h-[22px] flex items-center">
                                      {fac.type === 'PARKIRAN' ? 'Parkir' : fac.type === 'ROOFTOP' ? 'Rooftop' : fac.type === 'DAPUR' ? 'Dapur' : fac.type === 'PAGAR_GERBANG' ? 'Gerbang' : fac.type === 'COMMUNAL_LOUNGE' ? 'Lounge' : fac.type === 'SERVER_IT' ? 'Server IT' : fac.type === 'LAUNDRY' ? 'Laundry' : fac.type}
                                    </span>

                                    {fac.hasTv ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 min-h-[22px]" title="Template: Fasilitas memiliki TV">
                                        <Tv className="w-3 h-3" />
                                        <span>TV Komunal</span>
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/60 text-muted-foreground border border-border/40 flex items-center gap-1 min-h-[22px]">
                                        <Tv className="w-3 h-3 opacity-40" />
                                        <span>Tanpa TV</span>
                                      </span>
                                    )}

                                    {fac.hasLock ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 min-h-[22px]" title="Template: Menggunakan Smartlock/Access Gate">
                                        <KeyRound className="w-3 h-3" />
                                        <span>{fac.lockType === 'SMARTLOCK_GATE_ACCESS' ? 'Access Gate' : 'Smartlock'}</span>
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/60 text-muted-foreground border border-border/40 flex items-center gap-1 min-h-[22px]">
                                        <KeyRound className="w-3 h-3 opacity-40" />
                                        <span>Kunci Fisik</span>
                                      </span>
                                    )}

                                    {fac.notes && (
                                      <span className="text-[11px] text-muted-foreground hidden lg:inline max-w-xs truncate" title={fac.notes}>
                                        • {fac.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Facility Checks: Wi-Fi, TV, Lock, Bukti Foto (Identik dengan Kamar) */}
                            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                              
                              {/* Wi-Fi Check */}
                              <div className="flex items-center justify-between sm:justify-start gap-1 p-1 rounded-lg bg-muted/40 border border-border col-span-1">
                                {fac.hasWifi ? (
                                  fac.wifiStatus === 'PENDING' ? (
                                    <button
                                      type="button"
                                      onClick={() => setSpeedtestTarget({
                                        isOpen: true,
                                        floorId: floor.id,
                                        entityId: fac.id,
                                        entityTitle: fac.name,
                                        entityType: 'FACILITY',
                                        currentSpeedMbps: fac.wifiSpeedMbps || 50,
                                        currentSignalDbm: fac.wifiSignalDbm,
                                      })}
                                      className="w-full px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center justify-center gap-1 border border-blue-500/30 transition-all active:scale-95 cursor-pointer"
                                      title="Wi-Fi belum dispeedtest. Klik untuk jalankan Speedtest"
                                    >
                                      <Zap className="w-3 h-3 fill-blue-500" />
                                      <span>Inspect</span>
                                    </button>
                                  ) : (
                                    <>
                                      <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0 hidden sm:inline ml-0.5" />
                                      <div className="flex items-center gap-0.5">
                                        <input
                                          type="number"
                                          value={fac.wifiSpeedMbps ?? 50}
                                          onChange={(e) => handleFacilitySpeedChange(floor.id, fac, Number(e.target.value))}
                                          className="w-8 sm:w-10 px-0.5 py-1 rounded border border-border bg-background text-[11px] font-mono font-bold text-center"
                                          title="Kecepatan Wi-Fi Fasilitas (Mbps)"
                                        />
                                        <span className="text-[9px] text-muted-foreground hidden sm:inline">M</span>
                                      </div>
                                      <button
                                        onClick={() => handleTriggerFacilityWifi(floor.id, fac)}
                                        className={`flex-1 sm:flex-initial px-1.5 sm:px-2 py-1 rounded text-[11px] font-bold active:scale-95 transition-all text-center ${
                                          fac.wifiStatus === 'PASS' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                        }`}
                                      >
                                        {fac.wifiStatus === 'PASS' ? 'PASS' : 'FAIL'}
                                      </button>
                                      
                                      {/* Speedtest & dBm Scanner Trigger */}
                                      <button
                                        type="button"
                                        onClick={() => setSpeedtestTarget({
                                          isOpen: true,
                                          floorId: floor.id,
                                          entityId: fac.id,
                                          entityTitle: fac.name,
                                          entityType: 'FACILITY',
                                          currentSpeedMbps: fac.wifiSpeedMbps || 50,
                                          currentSignalDbm: fac.wifiSignalDbm,
                                        })}
                                        className="px-1.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center gap-0.5 border border-blue-500/30 transition-all active:scale-95 shrink-0"
                                        title="Jalankan Ulang Speedtest & Scan Desibel Sinyal Fasilitas"
                                      >
                                        <Zap className="w-2.5 h-2.5 fill-blue-500" />
                                        <span>Test</span>
                                      </button>

                                      {/* Sinyal Desibel (dBm) Badge */}
                                      {fac.wifiSignalDbm !== undefined && (
                                        <span
                                          className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 hidden md:inline-block border ${
                                            fac.wifiSignalDbm >= -65 
                                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                          }`}
                                          title={`Coverage Sinyal: ${fac.wifiSignalDbm} dBm (${fac.wifiSignalDbm >= -65 ? 'Standar Baik' : 'Blind Spot'})`}
                                        >
                                          {fac.wifiSignalDbm} dBm
                                        </span>
                                      )}

                                      {/* Bukti Sertifikat Speedtest Ready */}
                                      {fac.wifiEvidenceUrl && (
                                        <button
                                          type="button"
                                          onClick={() => setCardZoomPhoto(fac.wifiEvidenceUrl!)}
                                          className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] font-mono shrink-0"
                                          title="Lihat Sertifikat Bukti Speedtest"
                                        >
                                          <FileCheck className="w-3 h-3" />
                                        </button>
                                      )}
                                    </>
                                  )
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono py-1 px-1.5 text-center w-full">Tanpa Wi-Fi</span>
                                )}
                              </div>

                              {/* TV Check */}
                              <div className="flex items-center justify-center p-1 rounded-lg bg-muted/40 border border-border col-span-1 min-w-[70px]">
                                {fac.hasTv ? (
                                  <button
                                    onClick={() => handleOpenItemInspect('FACILITY', floor.id, fac.id, fac.name, 'TV', fac.tvStatus)}
                                    className={`w-full px-1.5 sm:px-2 py-1 rounded text-[11px] font-bold active:scale-95 transition-all truncate text-center cursor-pointer ${
                                      fac.tvStatus === 'PASS' 
                                        ? 'bg-emerald-600 text-white' 
                                        : fac.tvStatus === 'FAIL' 
                                        ? 'bg-rose-600 text-white' 
                                        : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/25'
                                    }`}
                                    title={fac.tvStatus === 'PENDING' ? 'TV belum diinspeksi. Klik untuk inspeksi' : 'Klik untuk ubah hasil inspeksi'}
                                  >
                                    {fac.tvStatus === 'PASS' ? 'PASS' : fac.tvStatus === 'FAIL' ? 'FAIL' : 'Inspect'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono py-1 px-1 text-center truncate">Tanpa TV</span>
                                )}
                              </div>

                              {/* Lock / Access Check: Tanpa Smartlock jika bukan smartlock */}
                              <div className="flex items-center justify-center p-1 rounded-lg bg-muted/40 border border-border col-span-1 min-w-[75px]">
                                {fac.hasLock ? (
                                  <button
                                    onClick={() => handleOpenItemInspect('FACILITY', floor.id, fac.id, fac.name, 'SMARTLOCK', fac.lockStatus)}
                                    className={`w-full px-1.5 sm:px-2 py-1 rounded text-[11px] font-bold active:scale-95 transition-all truncate text-center cursor-pointer ${
                                      fac.lockStatus === 'PASS' 
                                        ? 'bg-emerald-600 text-white' 
                                        : fac.lockStatus === 'FAIL' 
                                        ? 'bg-rose-600 text-white' 
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                    }`}
                                    title={fac.lockStatus === 'PENDING' ? 'Smartlock belum diinspeksi. Klik untuk inspeksi' : 'Klik untuk ubah hasil inspeksi'}
                                  >
                                    {fac.lockStatus === 'PASS' ? 'PASS' : fac.lockStatus === 'FAIL' ? 'FAIL' : 'Inspect'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono py-1 px-1 text-center truncate">Tanpa Smartlock</span>
                                )}
                              </div>

                              {/* Foto Bukti Fasilitas: Histori Foto Saja */}
                              <button
                                type="button"
                                onClick={() => handleOpenPhotoHistory(fac.name, getFacilityPhotos(fac))}
                                className="col-span-3 sm:col-span-1 p-1 sm:p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-blue-500 transition-colors flex items-center justify-center gap-1 shrink-0 font-semibold text-[11px] active:scale-95 cursor-pointer"
                                title="Buka histori bukti foto fasilitas ini"
                              >
                                <Camera className="w-3.5 h-3.5 text-blue-500" />
                                <span>Bukti Foto ({getFacilityPhotos(fac).length})</span>
                              </button>

                            </div>
                          </div>

                          {/* Facility Snag Details Bar if any pillar is FAIL - Full Width Bar Below */}
                          {facHasIssue && (
                            <div className="w-full mt-1 pt-2.5 border-t border-rose-500/20 space-y-1.5">
                              {fac.hasWifi && fac.wifiStatus === 'FAIL' && (
                                <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Wifi className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span className="font-bold text-rose-700 dark:text-rose-400 shrink-0">Kendala Wi-Fi:</span>
                                    <span className="text-foreground truncate font-medium">{fac.wifiIssueText || 'Sinyal drop / tidak stabil'}</span>
                                    {fac.wifiIssuePhoto && (
                                      <button
                                        type="button"
                                        onClick={() => setCardZoomPhoto(fac.wifiIssuePhoto!)}
                                        className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 shrink-0"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Foto</span>
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleTriggerFacilityWifi(floor.id, fac)}
                                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs shrink-0 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Selesaikan (Mark OK)</span>
                                  </button>
                                </div>
                              )}

                              {fac.hasTv && fac.tvStatus === 'FAIL' && (
                                <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Tv className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span className="font-bold text-rose-700 dark:text-rose-400 shrink-0">Kendala TV:</span>
                                    <span className="text-foreground truncate font-medium">{fac.tvIssueText || 'TV error / tidak ada sinyal'}</span>
                                    {fac.tvIssuePhoto && (
                                      <button
                                        type="button"
                                        onClick={() => setCardZoomPhoto(fac.tvIssuePhoto!)}
                                        className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 shrink-0"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Foto</span>
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleTriggerFacilityTv(floor.id, fac)}
                                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs shrink-0 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Selesaikan (Mark OK)</span>
                                  </button>
                                </div>
                              )}

                              {fac.hasLock && fac.lockStatus === 'FAIL' && (
                                <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <KeyRound className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span className="font-bold text-rose-700 dark:text-rose-400 shrink-0">Kendala Kunci:</span>
                                    <span className="text-foreground truncate font-medium">{fac.lockIssueText || 'Akses pintu / gerbang bermasalah'}</span>
                                    {fac.lockIssuePhoto && (
                                      <button
                                        type="button"
                                        onClick={() => setCardZoomPhoto(fac.lockIssuePhoto!)}
                                        className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 shrink-0"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Foto</span>
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleTriggerFacilityLock(floor.id, fac)}
                                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs shrink-0 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Selesaikan (Mark OK)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Solved Proof Bar if any pillar was resolved */}
                          {!facHasIssue && (fac.wifiResolvedNote || fac.tvResolvedNote || fac.lockResolvedNote) && (
                            <div className="w-full mt-1 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Riwayat Perbaikan:</span>
                              </span>
                              {fac.wifiResolvedNote && (
                                <span className="flex items-center gap-1">
                                  <span>Wi-Fi: {fac.wifiResolvedNote}</span>
                                  {fac.wifiResolvedPhoto && (
                                    <button
                                      type="button"
                                      onClick={() => setCardZoomPhoto(fac.wifiResolvedPhoto!)}
                                      className="text-blue-500 hover:underline"
                                    >
                                      [Lihat Foto Hasil]
                                    </button>
                                  )}
                                </span>
                              )}
                              {fac.tvResolvedNote && (
                                <span className="flex items-center gap-1">
                                  <span>TV: {fac.tvResolvedNote}</span>
                                  {fac.tvResolvedPhoto && (
                                    <button
                                      type="button"
                                      onClick={() => setCardZoomPhoto(fac.tvResolvedPhoto!)}
                                      className="text-blue-500 hover:underline"
                                    >
                                      [Lihat Foto Hasil]
                                    </button>
                                  )}
                                </span>
                              )}
                              {fac.lockResolvedNote && (
                                <span className="flex items-center gap-1">
                                  <span>Kunci: {fac.lockResolvedNote}</span>
                                  {fac.lockResolvedPhoto && (
                                    <button
                                      type="button"
                                      onClick={() => setCardZoomPhoto(fac.lockResolvedPhoto!)}
                                      className="text-blue-500 hover:underline"
                                    >
                                      [Lihat Foto Hasil]
                                    </button>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Kamar Tidur di Lantai Ini */}
              {roomsMatching.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Kamar Tidur di Lantai Ini ({roomsMatching.length} Kamar):
                  </span>

                  <div className="space-y-2">
                    {roomsMatching.map((room) => {
                      const hasIssue = room.wifiStatus === 'FAIL' || (room.hasTv && room.tvStatus === 'FAIL') || (room.hasSmartlock && room.lockStatus === 'FAIL');

                      return (
                        <div
                          key={room.id}
                          className={`p-3 rounded-xl border bg-background flex flex-col gap-2.5 text-xs transition-colors shadow-2xs ${
                            hasIssue ? 'border-rose-500/40 bg-rose-500/[0.03]' : 'border-border'
                          }`}
                        >
                          {/* Baris Utama: Info Kamar di kiri, Check Controls di kanan (Selalu Rapi & Sejajar) */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 w-full">
                            {/* Room Number & Marking Toggles */}
                            <div className="flex items-center justify-between sm:justify-start gap-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-lg bg-muted border border-border/80 flex items-center justify-center font-mono font-bold text-sm text-foreground shrink-0 shadow-2xs">
                                  {room.number}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-foreground text-xs sm:text-sm">Kamar {room.number}</span>
                                    {hasIssue && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                        Kendala
                                      </span>
                                    )}
                                  </div>
                                  {/* Read-Only Base Template Specification Badges (Terkunci Sesuai Master Template) */}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {room.hasTv ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 min-h-[22px]" title="Template: Kamar memiliki TV">
                                        <Tv className="w-3 h-3" />
                                        <span>{room.tvType === 'CABLE_TV' ? 'Cable TV' : 'Android TV'}</span>
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/60 text-muted-foreground border border-border/40 flex items-center gap-1 min-h-[22px]" title="Template: Kamar tanpa TV">
                                        <Tv className="w-3 h-3 opacity-40" />
                                        <span>Tanpa TV</span>
                                      </span>
                                    )}

                                    {room.hasSmartlock ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 min-h-[22px]" title="Template: Kamar menggunakan Smartlock">
                                        <KeyRound className="w-3 h-3" />
                                        <span>Smartlock</span>
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/60 text-muted-foreground border border-border/40 flex items-center gap-1 min-h-[22px]" title="Template: Kamar menggunakan Kunci Biasa">
                                        <KeyRound className="w-3 h-3 opacity-40" />
                                        <span>Kunci Biasa</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Room Checks: Wi-Fi, TV, Lock */}
                            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                              
                              {/* Wi-Fi Check */}
                              <div className="flex items-center justify-between sm:justify-start gap-1 p-1 rounded-lg bg-muted/40 border border-border col-span-1 min-w-[120px]">
                                {room.wifiStatus === 'PENDING' ? (
                                  <button
                                    type="button"
                                    onClick={() => setSpeedtestTarget({
                                      isOpen: true,
                                      floorId: floor.id,
                                      entityId: room.id,
                                      entityTitle: `Kamar ${room.number}`,
                                      entityType: 'ROOM',
                                      currentSpeedMbps: room.wifiSpeedMbps || 50,
                                      currentSignalDbm: room.wifiSignalDbm,
                                    })}
                                    className="w-full px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center justify-center gap-1 border border-blue-500/30 transition-all active:scale-95 cursor-pointer"
                                    title="Wi-Fi belum dispeedtest. Klik untuk jalankan Speedtest"
                                  >
                                    <Zap className="w-3 h-3 fill-blue-500" />
                                    <span>Inspect</span>
                                  </button>
                                ) : (
                                  <>
                                    <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0 hidden sm:inline ml-0.5" />
                                    <div className="flex items-center gap-0.5">
                                      <input
                                        type="number"
                                        value={room.wifiSpeedMbps}
                                        onChange={(e) => handleSpeedChange(floor.id, room, Number(e.target.value))}
                                        className="w-8 sm:w-10 px-0.5 py-1 rounded border border-border bg-background text-[11px] font-mono font-bold text-center"
                                        title="Kecepatan Wi-Fi (Mbps)"
                                      />
                                      <span className="text-[9px] text-muted-foreground hidden sm:inline">M</span>
                                    </div>
                                    <button
                                      onClick={() => handleTriggerWifiRoom(floor.id, room)}
                                      className={`flex-1 sm:flex-initial px-1.5 sm:px-2 py-1 rounded text-[11px] font-bold active:scale-95 transition-all text-center ${
                                        room.wifiStatus === 'PASS' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                      }`}
                                    >
                                      {room.wifiStatus === 'PASS' ? 'PASS' : 'FAIL'}
                                    </button>
                                    
                                    {/* ⚡ Speedtest & dBm Scanner Trigger */}
                                    <button
                                      type="button"
                                      onClick={() => setSpeedtestTarget({
                                        isOpen: true,
                                        floorId: floor.id,
                                        entityId: room.id,
                                        entityTitle: `Kamar ${room.number}`,
                                        entityType: 'ROOM',
                                        currentSpeedMbps: room.wifiSpeedMbps || 50,
                                        currentSignalDbm: room.wifiSignalDbm,
                                      })}
                                      className="px-1.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center gap-0.5 border border-blue-500/30 transition-all active:scale-95 shrink-0"
                                      title="Jalankan Speedtest & Scan Desibel Sinyal Terdekat"
                                    >
                                      <Zap className="w-2.5 h-2.5 fill-blue-500" />
                                      <span>Test</span>
                                    </button>

                                    {/* Sinyal Desibel (dBm) Badge */}
                                    {room.wifiSignalDbm !== undefined && (
                                      <span
                                        className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 hidden md:inline-block border ${
                                          room.wifiSignalDbm >= -65 
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                        }`}
                                        title={`Coverage Sinyal: ${room.wifiSignalDbm} dBm (${room.wifiSignalDbm >= -65 ? 'Standar Baik' : 'Blind Spot'})`}
                                      >
                                        {room.wifiSignalDbm} dBm
                                      </span>
                                    )}

                                    {/* Bukti Sertifikat Speedtest Ready */}
                                    {room.wifiEvidenceUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setCardZoomPhoto(room.wifiEvidenceUrl!)}
                                        className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] font-mono shrink-0"
                                        title="Lihat Sertifikat Bukti Speedtest"
                                      >
                                        <FileCheck className="w-3 h-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* TV Check */}
                              <div className="flex items-center justify-center p-1 rounded-lg bg-muted/40 border border-border col-span-1 min-w-[70px]">
                                {room.hasTv ? (
                                  <button
                                    onClick={() => handleOpenItemInspect('ROOM', floor.id, room.id, `Kamar ${room.number}`, 'TV', room.tvStatus)}
                                    className={`w-full px-1.5 sm:px-2 py-1 rounded text-[11px] font-bold active:scale-95 transition-all truncate text-center cursor-pointer ${
                                      room.tvStatus === 'PASS' 
                                        ? 'bg-emerald-600 text-white' 
                                        : room.tvStatus === 'FAIL' 
                                        ? 'bg-rose-600 text-white' 
                                        : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/25'
                                    }`}
                                    title={room.tvStatus === 'PENDING' ? 'TV belum diinspeksi. Klik untuk inspeksi' : 'Klik untuk ubah hasil inspeksi'}
                                  >
                                    {room.tvStatus === 'PASS' ? 'PASS' : room.tvStatus === 'FAIL' ? 'FAIL' : 'Inspect'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono py-1 px-1 text-center truncate">Tanpa TV</span>
                                )}
                              </div>

                              {/* Lock Check: Tanpa Smartlock jika bukan smartlock */}
                              <div className="flex items-center justify-center p-1 rounded-lg bg-muted/40 border border-border col-span-1 min-w-[75px]">
                                {room.hasSmartlock ? (
                                  <button
                                    onClick={() => handleOpenItemInspect('ROOM', floor.id, room.id, `Kamar ${room.number}`, 'SMARTLOCK', room.lockStatus)}
                                    className={`w-full px-1.5 sm:px-2 py-1 rounded text-[11px] font-bold active:scale-95 transition-all truncate text-center cursor-pointer ${
                                      room.lockStatus === 'PASS' 
                                        ? 'bg-emerald-600 text-white' 
                                        : room.lockStatus === 'FAIL' 
                                        ? 'bg-rose-600 text-white' 
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                    }`}
                                    title={room.lockStatus === 'PENDING' ? 'Smartlock belum diinspeksi. Klik untuk inspeksi' : 'Klik untuk ubah hasil inspeksi'}
                                  >
                                    {room.lockStatus === 'PASS' ? 'PASS' : room.lockStatus === 'FAIL' ? 'FAIL' : 'Inspect'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-mono py-1 px-1 text-center truncate">Tanpa Smartlock</span>
                                )}
                              </div>

                              {/* Foto Bukti Kamar: Histori Foto Saja */}
                              <button
                                type="button"
                                onClick={() => handleOpenPhotoHistory(`Kamar ${room.number}`, getRoomPhotos(room))}
                                className="col-span-3 sm:col-span-1 p-1 sm:p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-blue-500 transition-colors flex items-center justify-center gap-1 shrink-0 font-semibold text-[11px] active:scale-95 cursor-pointer"
                                title="Buka histori bukti foto kamar ini"
                              >
                                <Camera className="w-3.5 h-3.5 text-blue-500" />
                                <span>Bukti Foto ({getRoomPhotos(room).length})</span>
                              </button>

                            </div>
                          </div>

                          {/* Room Snag Details Bar if any pillar is FAIL - Full Width Bar Below */}
                          {hasIssue && (
                            <div className="w-full mt-1 pt-2.5 border-t border-rose-500/20 space-y-1.5">
                              {room.wifiStatus === 'FAIL' && (
                                <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Wifi className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span className="font-bold text-rose-700 dark:text-rose-400 shrink-0">Kendala Wi-Fi:</span>
                                    <span className="text-foreground truncate font-medium">{room.wifiIssueText || 'Sinyal drop / tidak stabil'}</span>
                                    {room.wifiIssuePhoto && (
                                      <button
                                        type="button"
                                        onClick={() => setCardZoomPhoto(room.wifiIssuePhoto!)}
                                        className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 shrink-0"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Foto</span>
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleTriggerWifiRoom(floor.id, room)}
                                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs shrink-0 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Selesaikan (Mark OK)</span>
                                  </button>
                                </div>
                              )}

                              {room.hasTv && room.tvStatus === 'FAIL' && (
                                <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Tv className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span className="font-bold text-rose-700 dark:text-rose-400 shrink-0">Kendala TV:</span>
                                    <span className="text-foreground truncate font-medium">{room.tvIssueText || 'TV error / tidak ada sinyal'}</span>
                                    {room.tvIssuePhoto && (
                                      <button
                                        type="button"
                                        onClick={() => setCardZoomPhoto(room.tvIssuePhoto!)}
                                        className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 shrink-0"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Foto</span>
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleTriggerTvRoom(floor.id, room)}
                                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs shrink-0 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Selesaikan (Mark OK)</span>
                                  </button>
                                </div>
                              )}

                              {room.hasSmartlock && room.lockStatus === 'FAIL' && (
                                <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <KeyRound className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span className="font-bold text-rose-700 dark:text-rose-400 shrink-0">Kendala Kunci:</span>
                                    <span className="text-foreground truncate font-medium">{room.lockIssueText || 'Smartlock macet / baterai drop'}</span>
                                    {room.lockIssuePhoto && (
                                      <button
                                        type="button"
                                        onClick={() => setCardZoomPhoto(room.lockIssuePhoto!)}
                                        className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 shrink-0"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Foto</span>
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleTriggerLockRoom(floor.id, room)}
                                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs shrink-0 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Selesaikan (Mark OK)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Solved Proof Bar if any pillar was resolved */}
                          {!hasIssue && (room.wifiResolvedNote || (room.hasTv && room.tvResolvedNote) || (room.hasSmartlock && room.lockResolvedNote)) && (
                            <div className="w-full mt-1 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Riwayat Perbaikan:</span>
                              </span>
                              {room.wifiResolvedNote && (
                                <span className="flex items-center gap-1">
                                  <span>Wi-Fi: {room.wifiResolvedNote}</span>
                                  {room.wifiResolvedPhoto && (
                                    <button
                                      type="button"
                                      onClick={() => setCardZoomPhoto(room.wifiResolvedPhoto!)}
                                      className="text-blue-500 hover:underline"
                                    >
                                      [Lihat Foto Hasil]
                                    </button>
                                  )}
                                </span>
                              )}
                              {room.hasTv && room.tvResolvedNote && (
                                <span className="flex items-center gap-1">
                                  <span>TV: {room.tvResolvedNote}</span>
                                  {room.tvResolvedPhoto && (
                                    <button
                                      type="button"
                                      onClick={() => setCardZoomPhoto(room.tvResolvedPhoto!)}
                                      className="text-blue-500 hover:underline"
                                    >
                                      [Lihat Foto Hasil]
                                    </button>
                                  )}
                                </span>
                              )}
                              {room.hasSmartlock && room.lockResolvedNote && (
                                <span className="flex items-center gap-1">
                                  <span>Smartlock: {room.lockResolvedNote}</span>
                                  {room.lockResolvedPhoto && (
                                    <button
                                      type="button"
                                      onClick={() => setCardZoomPhoto(room.lockResolvedPhoto!)}
                                      className="text-blue-500 hover:underline"
                                    >
                                      [Lihat Foto Hasil]
                                    </button>
                                  )}
                                </span>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Evidence Capture Modal */}
      <EvidenceCaptureModal
        isOpen={evidenceModal.isOpen}
        onClose={() => setEvidenceModal(prev => ({ ...prev, isOpen: false }))}
        building={building}
        entityId={evidenceModal.entityId}
        entityName={evidenceModal.entityName}
        defaultCategory={evidenceModal.defaultCategory}
        availableCategories={[
          { label: 'Wi-Fi Speedtest', value: 'WIFI_SPEEDTEST' },
          { label: 'Display TV', value: 'TV_CHECK' },
          { label: 'Akses Smartlock', value: 'SMARTLOCK_CHECK' },
          { label: 'Bukti Kamar Umum', value: 'GENERAL_EVIDENCE' },
        ]}
      />

      {/* Modal Catat Kunjungan / Visit Baru di Field Ops */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-foreground text-sm">
                  Catat Kunjungan Lapangan Baru (Visit #{visits.length + 1})
                </h3>
              </div>
              <button
                onClick={() => setIsVisitModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="p-4 space-y-3.5 text-xs">
              
              {/* Tanggal & Waktu Visit */}
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
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Nama Teknisi / Pemeriksa (Fix sesuai akun yang sedang login) */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Nama Teknisi / Inspektor Lapangan</label>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 text-xs">
                  <div className={`w-7 h-7 rounded-md ${activeUser.avatarColor || (activeUser.role === 'ADMIN' ? 'bg-indigo-600' : activeUser.role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600')} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                    {activeUser.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground truncate">{activeUser.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20 shrink-0">
                        Akun Aktif
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {activeUser.roleTitle || activeUser.role} • Siaga IT
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
                  placeholder="Contoh: Pengecekan kamar 201-207, speedtest stabil. AP koridor normal."
                  rows={3}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Snapshot Skor Saat Ini */}
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground block">Skor Kesiapan Saat Visit:</span>
                  <span className="text-[11px] text-muted-foreground">Snapshot otomatis tersimpan di riwayat</span>
                </div>
                <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                  readinessPercent >= 85 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                }`}>
                  {readinessPercent}%
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border mt-3">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Catatan Visit</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Studio Touch & Draw Denah Lantai dari Evaluasi */}
      {viewingFloor && (
        <FloorPlanDrawingModal
          isOpen={!!viewingFloor}
          onClose={() => setViewingFloor(null)}
          building={building}
          floor={viewingFloor}
          onSaveFloorPlan={handleSaveFloorPlanInEval}
        />
      )}

      {/* Pop-Out Action Modal (Laporkan Kendala FAIL vs Selesaikan Kendala OK) */}
      {issueModalState.isOpen && issueModalState.target && (
        <IssueActionModal
          key={`${issueModalState.target.entityId}-${issueModalState.target.pillar}-${issueModalState.mode}`}
          isOpen={issueModalState.isOpen}
          onClose={() => setIssueModalState(prev => ({ ...prev, isOpen: false }))}
          mode={issueModalState.mode}
          target={issueModalState.target}
          onConfirmReport={handleConfirmReport}
          onConfirmSolve={handleConfirmSolve}
        />
      )}

      {/* Lightbox Zoom Foto Bukti dari Kartu Kamar / Fasilitas */}
      {cardZoomPhoto && (
        <div 
          onClick={() => setCardZoomPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-2">
            <img 
              src={cardZoomPhoto} 
              alt="Bukti foto checklist" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="p-2 text-center text-xs text-muted-foreground font-mono">
              Klik di mana saja atau tombol X untuk menutup
            </div>
            <button
              onClick={() => setCardZoomPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/75 hover:bg-black text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Speedtest & Sinyal Desibel Coverage */}
      {speedtestTarget && speedtestTarget.isOpen && (
        <WifiSpeedtestModal
          isOpen={speedtestTarget.isOpen}
          onClose={() => setSpeedtestTarget(null)}
          building={building}
          floorId={speedtestTarget.floorId}
          entityId={speedtestTarget.entityId}
          entityTitle={speedtestTarget.entityTitle}
          entityType={speedtestTarget.entityType}
          initialSpeedMbps={speedtestTarget.currentSpeedMbps}
          initialSignalDbm={speedtestTarget.currentSignalDbm}
          onSaveResult={handleSaveSpeedtestResult}
          onReportIssueWithEvidence={handleSpeedtestReportIssue}
        />
      )}

      {/* Modal Inspeksi Item Lapangan (TV & Smartlock) */}
      <ItemInspectModal
        isOpen={!!inspectModalTarget}
        onClose={() => setInspectModalTarget(null)}
        target={inspectModalTarget}
        onConfirmInspection={handleConfirmItemInspection}
      />

      {/* Modal Galeri Histori Bukti Foto (Read-only, no upload form) */}
      <EvidenceHistoryModal
        isOpen={historyModalState.isOpen}
        onClose={() => setHistoryModalState(prev => ({ ...prev, isOpen: false }))}
        entityTitle={historyModalState.entityTitle}
        photos={historyModalState.photos}
      />

    </div>
  );
};
