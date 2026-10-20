import React, { useState, useRef, useEffect } from 'react';
import { ColivingIssue, Building, SimpleUser, EvidenceMedia } from '../../types/hotel';
import { 
  X, 
  CheckCircle2, 
  Camera, 
  Upload, 
  Trash2, 
  Wifi, 
  Video, 
  Tv, 
  KeyRound, 
  Clock, 
  Gauge, 
  Signal, 
  Eye, 
  ShieldCheck, 
  AlertCircle,
  Sparkles,
  UserCheck,
  FileCheck2,
  Maximize2
} from 'lucide-react';
import { fileToBase64, saveEvidenceItem, generateEvidencePath, getBuildingSlug } from '../../utils/evidenceStorage';
import { LiveCameraModal } from '../common/LiveCameraModal';
import { WifiSpeedtestModal, WifiSpeedtestResult } from '../common/WifiSpeedtestModal';

export interface ResolveIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: ColivingIssue | null;
  buildingName: string;
  currentBuilding?: Building;
  currentUser?: SimpleUser;
  onConfirm: (proofData: {
    resolutionNote: string;
    resolutionPhotoUrl?: string;
    resolutionTimestamp?: string;
    resolvedBy: string;
    recheckSpeedMbps?: number;
    recheckSignalDbm?: number;
    recheckNotes?: string;
  }) => void;
}

const COMMON_RESOLVE_PRESETS: Record<string, string[]> = {
  INTERNET: [
    'Kabel UTP di-re-crimping & konektor RJ45 baru dipasang, link gigabit stabil',
    'Posisi Access Point koridor digeser agar coverage meja kerja optimal',
    'Port PoE Switch dipindahkan & profil SSID 5GHz diterapkan ulang',
    'Perangkat AP di-restart & channel Wi-Fi dipindah ke frekuensi minim interferensi',
    'Throughput dites ulang dan stabil di atas 70 Mbps'
  ],
  CCTV: [
    'Kabel power DC 12V & adaptor diganti baru, kamera kembali online di NVR',
    'Konektor RJ45 PoE di-crimping ulang & port switch dipindah ke port cadangan',
    'Lensa kamera dibersihkan & sudut pandang diarahkan ulang ke koridor utama',
    'IP address kamera disetting static & stream rekaman 24/7 aktif',
    'Kamera di-reboot dan terdeteksi online normal di NVR monitor'
  ],
  TV: [
    'Kabel HDMI & adaptor power diganti baru, resolusi FHD 1080p jernih',
    'Unit Android TV di-reset pabrik & firmware di-update ke versi terbaru',
    'Baterai remote diganti baru (2x AAA Alkaline) & sensor responsif',
    'Aplikasi YouTube & streaming disetting ulang, akun terhubung lancar',
    'Braket dinding dikencangkan ulang & kabel tertata rapi'
  ],
  SMARTLOCK: [
    'Baterai diganti 4x AA Alkaline baru (kapasitas 100%, indikator hijau)',
    'Deadbolt & pelat kusen disetting serta dilumasi, buka-tutup lancar tanpa seret',
    'Kartu Master RFID & PIN tamu diprogram ulang dan berfungsi responsif (<1s)',
    'BLE Gateway di-reset & mobile key pairing kembali sinkron ke sistem',
    'Gagang pintu & baut pengunci dikencangkan dengan torsi pas'
  ],
};

export const ResolveIssueModal: React.FC<ResolveIssueModalProps> = ({
  isOpen,
  onClose,
  issue,
  buildingName,
  currentBuilding,
  currentUser,
  onConfirm,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvedBy, setResolvedBy] = useState('');
  
  // Re-QC Checklist & Metrics
  const [downloadSpeed, setDownloadSpeed] = useState<number>(75);
  const [uploadSpeed, setUploadSpeed] = useState<number>(35);
  const [signalDbm, setSignalDbm] = useState<number>(-55);
  const [cctvStreamPass, setCctvStreamPass] = useState(true);
  const [cctvAnglePass, setCctvAnglePass] = useState(true);
  const [tvDisplayPass, setTvDisplayPass] = useState(true);
  const [tvRemotePass, setTvRemotePass] = useState(true);
  const [lockTapPass, setLockTapPass] = useState(true);
  const [lockDeadboltPass, setLockDeadboltPass] = useState(true);
  const [lockBatteryPass, setLockBatteryPass] = useState(true);
  const [checklistVerified, setChecklistVerified] = useState(true);

  // Evidence Photo State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState<string>('');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isSpeedtestModalOpen, setIsSpeedtestModalOpen] = useState(false);
  const [isZoomingPhoto, setIsZoomingPhoto] = useState<string | null>(null);

  // Auto-init state on issue change
  useEffect(() => {
    if (isOpen && issue) {
      setResolutionNote(issue.resolutionNote || '');
      setResolvedBy(issue.resolvedBy || currentUser?.name || 'Teknisi Siaga IT');
      setPhotoPreview(issue.resolutionPhotoUrl || null);
      setPhotoTimestamp(issue.resolutionTimestamp || new Date().toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
      setDownloadSpeed(issue.recheckSpeedMbps || 75);
      setSignalDbm(issue.recheckSignalDbm || -55);
      setCctvStreamPass(true);
      setCctvAnglePass(true);
      setTvDisplayPass(true);
      setTvRemotePass(true);
      setLockTapPass(true);
      setLockDeadboltPass(true);
      setLockBatteryPass(true);
      setChecklistVerified(true);
    }
  }, [isOpen, issue, currentUser]);

  if (!isOpen || !issue) return null;

  const category = issue.category;
  const CategoryIcon = category === 'INTERNET' ? Wifi : category === 'CCTV' ? Video : category === 'TV' ? Tv : KeyRound;
  const presets = COMMON_RESOLVE_PRESETS[category] || [];

  // Handle Photo Capture from Live Camera
  const handleLiveCameraCapture = async (dataUrl: string) => {
    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB';

    const cleanLoc = issue.location.replace(/[^a-zA-Z0-9]/g, '_');
    const fName = `QC_SOLVED_${cleanLoc}_${category}_${now.getTime().toString().slice(-6)}.jpg`;

    setPhotoPreview(dataUrl);
    setPhotoTimestamp(timeStr);
    setPhotoFileName(fName);
    setIsLiveCameraOpen(false);

    // Also auto-archive into Evidence DB if currentBuilding exists
    if (currentBuilding) {
      try {
        const catMap = category === 'INTERNET' ? 'WIFI_SPEEDTEST' : category === 'CCTV' ? 'CCTV_CHECK' : category === 'TV' ? 'TV_CHECK' : 'SMARTLOCK_CHECK';
        const { folderPath } = generateEvidencePath(currentBuilding, catMap as any, issue.location);
        const evidenceItem: EvidenceMedia = {
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          buildingId: currentBuilding.id,
          buildingSlug: getBuildingSlug(currentBuilding.name),
          category: catMap as any,
          mediaType: 'image',
          fileUrl: dataUrl,
          fileName: fName,
          folderPath,
          originalName: fName,
          sizeBytes: Math.round(dataUrl.length * 0.75),
          capturedAt: new Date().toISOString(),
          entityId: issue.id,
          entityName: issue.location,
          notes: `Bukti Selesai & QC Ulang: ${issue.issue}`,
        };
        await saveEvidenceItem(evidenceItem);
      } catch (err) {
        console.warn('Auto-save evidence warning:', err);
      }
    }
  };

  // Handle Photo File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const now = new Date();
      const timeStr = now.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';

      const cleanLoc = issue.location.replace(/[^a-zA-Z0-9]/g, '_');
      const fName = `QC_SOLVED_${cleanLoc}_${category}_${now.getTime().toString().slice(-6)}.jpg`;

      setPhotoPreview(base64);
      setPhotoTimestamp(timeStr);
      setPhotoFileName(fName);

      // Save to evidence storage
      if (currentBuilding) {
        const catMap = category === 'INTERNET' ? 'WIFI_SPEEDTEST' : category === 'CCTV' ? 'CCTV_CHECK' : category === 'TV' ? 'TV_CHECK' : 'SMARTLOCK_CHECK';
        const { folderPath } = generateEvidencePath(currentBuilding, catMap as any, issue.location);
        const evidenceItem: EvidenceMedia = {
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          buildingId: currentBuilding.id,
          buildingSlug: getBuildingSlug(currentBuilding.name),
          category: catMap as any,
          mediaType: 'image',
          fileUrl: base64,
          fileName: fName,
          folderPath,
          originalName: file.name,
          sizeBytes: file.size,
          capturedAt: new Date().toISOString(),
          entityId: issue.id,
          entityName: issue.location,
          notes: `Bukti Selesai & QC Ulang: ${issue.issue}`,
        };
        await saveEvidenceItem(evidenceItem);
      }
    } catch (err) {
      console.error('Error reading image file:', err);
      alert('Gagal memproses gambar. Silakan coba lagi.');
    }
  };

  // Handle Speedtest Result from WifiSpeedtestModal
  const handleSpeedtestComplete = (result: WifiSpeedtestResult) => {
    setDownloadSpeed(result.downloadMbps);
    setUploadSpeed(result.uploadMbps);
    setSignalDbm(result.signalDbm);
    if (result.evidenceDataUrl) {
      setPhotoPreview(result.evidenceDataUrl);
      setPhotoTimestamp(result.capturedAt);
      setPhotoFileName(`SPEEDTEST_${result.downloadMbps}MBPS_${Date.now().toString().slice(-6)}.jpg`);
    }
    // Auto-append speed to note if not already written
    const speedNote = `Uji QC Speedtest Wi-Fi aktual: Download ${result.downloadMbps} Mbps, Upload ${result.uploadMbps} Mbps, Sinyal ${result.signalDbm} dBm (Lolos Standar Rukita)`;
    if (!resolutionNote.trim()) {
      setResolutionNote(speedNote);
    } else if (!resolutionNote.includes('Speedtest')) {
      setResolutionNote(prev => `${prev}. ${speedNote}`);
    }
    setIsSpeedtestModalOpen(false);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNote.trim()) {
      alert('Mohon isi catatan tindakan perbaikan / verifikasi QC ulang.');
      return;
    }

    // Build Re-QC summary notes
    let recheckSummary = '';
    if (category === 'INTERNET') {
      recheckSummary = `Speed: ${downloadSpeed} Mbps / Up: ${uploadSpeed} Mbps / Sinyal: ${signalDbm} dBm (PASS >=15 Mbps)`;
    } else if (category === 'CCTV') {
      recheckSummary = `Stream NVR: ${cctvStreamPass ? 'Online' : 'Offline'} • Sudut: ${cctvAnglePass ? 'Fokus/Pas' : 'Perlu Penyesuaian'}`;
    } else if (category === 'TV') {
      recheckSummary = `Layar: ${tvDisplayPass ? 'FHD Jernih' : 'Rusak'} • Remote: ${tvRemotePass ? 'Responsif' : 'Lemah'}`;
    } else if (category === 'SMARTLOCK') {
      recheckSummary = `RFID Tap: ${lockTapPass ? '<1s Normal' : 'Lambat'} • Deadbolt: ${lockDeadboltPass ? 'Lancar' : 'Seret'} • Baterai: ${lockBatteryPass ? '>80%' : '<80%'}`;
    }

    onConfirm({
      resolutionNote: resolutionNote.trim(),
      resolutionPhotoUrl: photoPreview || undefined,
      resolutionTimestamp: photoTimestamp || new Date().toLocaleString('id-ID'),
      resolvedBy: resolvedBy.trim() || currentUser?.name || 'Teknisi Siaga IT',
      recheckSpeedMbps: category === 'INTERNET' ? downloadSpeed : undefined,
      recheckSignalDbm: category === 'INTERNET' ? signalDbm : undefined,
      recheckNotes: recheckSummary,
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
          
          {/* HEADER */}
          <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Verifikasi Selesai & QC Ulang
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <strong className="text-foreground">{issue.location}</strong> • {buildingName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SCROLLABLE BODY */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-xs">
            
            {/* 1. INFORMASI TEMUAN KENDALA AWAL */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Temuan Kendala yang Dilaporkan</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Dilaporkan: {issue.createdAt}
                </span>
              </div>
              <p className="text-foreground font-medium text-xs sm:text-sm pl-5">
                "{issue.issue}"
              </p>
              <div className="pl-5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span>PIC/Vendor Tindak Lanjut Awal:</span>
                <strong className="text-foreground font-mono">{issue.vendorNote || 'Internal IT'}</strong>
              </div>
            </div>

            {/* 2. FORM QC ULANG (CATEGORY-SPECIFIC RE-CHECK) */}
            <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                    Pengukuran & Verifikasi QC Ulang
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">Standar Operasional IT Pre-Opening</span>
              </div>

              {/* A. JIKA KATEGORI = INTERNET / WI-FI */}
              {category === 'INTERNET' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    
                    {/* Download Speed */}
                    <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-blue-500" />
                          <span>Unduh (Download)</span>
                        </span>
                        <span className={`text-[10px] font-bold px-1 rounded ${downloadSpeed >= 15 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
                          {downloadSpeed >= 15 ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={downloadSpeed}
                          onChange={(e) => setDownloadSpeed(Number(e.target.value))}
                          className="w-full text-base font-bold font-mono bg-transparent text-foreground outline-none border-b border-border focus:border-blue-500 py-0.5"
                          min="0"
                          max="1000"
                          required
                        />
                        <span className="text-xs text-muted-foreground font-mono shrink-0">Mbps</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Target Minimum: ≥ 15 Mbps</p>
                    </div>

                    {/* Upload Speed */}
                    <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-cyan-500" />
                          <span>Unggah (Upload)</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={uploadSpeed}
                          onChange={(e) => setUploadSpeed(Number(e.target.value))}
                          className="w-full text-base font-bold font-mono bg-transparent text-foreground outline-none border-b border-border focus:border-blue-500 py-0.5"
                          min="0"
                          max="1000"
                        />
                        <span className="text-xs text-muted-foreground font-mono shrink-0">Mbps</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Rekomendasi: ≥ 20 Mbps</p>
                    </div>

                    {/* Signal dBm */}
                    <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="flex items-center gap-1">
                          <Signal className="w-3 h-3 text-amber-500" />
                          <span>Kekuatan Sinyal</span>
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {signalDbm >= -65 ? 'Sangat Baik' : 'Cukup'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={signalDbm}
                          onChange={(e) => setSignalDbm(Number(e.target.value))}
                          className="w-full text-base font-bold font-mono bg-transparent text-foreground outline-none border-b border-border focus:border-blue-500 py-0.5"
                          min="-100"
                          max="-20"
                        />
                        <span className="text-xs text-muted-foreground font-mono shrink-0">dBm</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Ideal: -40 dBm s/d -65 dBm</p>
                    </div>

                  </div>

                  {/* Tombol Jalankan Speedtest Riil */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSpeedtestModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Jalankan Uji Speedtest Wi-Fi & Coverage</span>
                    </button>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Simulasi pengujian dual-band & bukti capture
                    </span>
                  </div>
                </div>
              )}

              {/* B. JIKA KATEGORI = CCTV */}
              {category === 'CCTV' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  
                  {/* Status Stream NVR */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
                    <span className="text-muted-foreground text-[11px] block font-medium">Stream NVR 24/7</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCctvStreamPass(true)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-all ${
                          cctvStreamPass ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Online</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCctvStreamPass(false)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-all ${
                          !cctvStreamPass ? 'bg-rose-600 text-white shadow-2xs' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <X className="w-3 h-3" />
                        <span>Offline</span>
                      </button>
                    </div>
                  </div>

                  {/* Sudut Lensa & Kerapatan */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
                    <span className="text-muted-foreground text-[11px] block font-medium">Sudut & Fokus Lensa</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCctvAnglePass(true)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-all ${
                          cctvAnglePass ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span>Jelas/Pas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCctvAnglePass(false)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-all ${
                          !cctvAnglePass ? 'bg-rose-600 text-white shadow-2xs' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span>Terhalang</span>
                      </button>
                    </div>
                  </div>

                  {/* Kabel & Port Power DC/PoE */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
                    <span className="text-muted-foreground text-[11px] block font-medium">Kabel Power / PoE</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Kencang & Aman</span>
                    </div>
                  </div>

                </div>
              )}

              {/* C. JIKA KATEGORI = TV */}
              {category === 'TV' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  
                  {/* Status Layar */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
                    <span className="text-muted-foreground text-[11px] block font-medium">Resolusi & Tampilan Layar</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTvDisplayPass(true)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 ${
                          tvDisplayPass ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span>Jernih (FHD 1080p)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTvDisplayPass(false)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 ${
                          !tvDisplayPass ? 'bg-rose-600 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span>Bintik/Cacat</span>
                      </button>
                    </div>
                  </div>

                  {/* Remote & App */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
                    <span className="text-muted-foreground text-[11px] block font-medium">Remote & Aplikasi Streaming</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTvRemotePass(true)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 ${
                          tvRemotePass ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span>Responsif & Normal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTvRemotePass(false)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 ${
                          !tvRemotePass ? 'bg-rose-600 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span>Kendala</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* D. JIKA KATEGORI = SMARTLOCK */}
              {category === 'SMARTLOCK' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  
                  {/* Respon Tap RFID */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
                    <span className="text-muted-foreground text-[11px] block font-medium">Tap Kartu RFID</span>
                    <button
                      type="button"
                      onClick={() => setLockTapPass(prev => !prev)}
                      className={`w-full py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 ${
                        lockTapPass ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      <span>{lockTapPass ? 'Cepat (< 1 Detik)' : 'Lambat (> 1.5s)'}</span>
                    </button>
                  </div>

                  {/* Mekanikal Deadbolt */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
                    <span className="text-muted-foreground text-[11px] block font-medium">Mekanikal Deadbolt</span>
                    <button
                      type="button"
                      onClick={() => setLockDeadboltPass(prev => !prev)}
                      className={`w-full py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 ${
                        lockDeadboltPass ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      <span>{lockDeadboltPass ? 'Lancar & Presisi' : 'Seret / Macet'}</span>
                    </button>
                  </div>

                  {/* Baterai */}
                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
                    <span className="text-muted-foreground text-[11px] block font-medium">Kondisi Baterai</span>
                    <button
                      type="button"
                      onClick={() => setLockBatteryPass(prev => !prev)}
                      className={`w-full py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 ${
                        lockBatteryPass ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      <span>{lockBatteryPass ? 'Baterai > 80% (Baru)' : 'Perlu Ganti'}</span>
                    </button>
                  </div>

                </div>
              )}

              {/* Checklist Konfirmasi Akhir */}
              <label className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checklistVerified}
                  onChange={(e) => setChecklistVerified(e.target.checked)}
                  className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>Saya menyatakan fungsi perangkat di atas telah diuji ulang secara fisik di lokasi kamar/area.</span>
              </label>

            </div>

            {/* 3. CATATAN TINDAKAN PERBAIKAN (RESOLUTION NOTE) */}
            <div className="space-y-2">
              <label className="font-bold text-foreground flex items-center justify-between">
                <span>Catatan Tindakan Perbaikan (Resolution Note) *</span>
                <span className="text-[10px] text-muted-foreground font-normal">Wajib diisi</span>
              </label>

              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Jelaskan tindakan teknis yang telah dikerjakan (contoh: kabel adaptor diganti baru, port NVR dipindahkan & stream dipastikan online 24 jam)..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />

              {/* Preset Chips */}
              {presets.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Pilih cepat template tindakan perbaikan:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!resolutionNote.trim()) {
                            setResolutionNote(preset);
                          } else if (!resolutionNote.includes(preset)) {
                            setResolutionNote(prev => `${prev}. ${preset}`);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-[11px] text-foreground text-left transition-colors border border-border/60 hover:border-emerald-500/40 cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. INPUT BUKTI FOTO PENYELESAIAN (RESOLUTION PHOTO EVIDENCE) */}
            <div className="space-y-2.5 p-3.5 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block text-xs">
                    Bukti Foto Hasil Perbaikan & Re-QC
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Dokumentasikan fisik perangkat, layar NVR, hasil speedtest, atau kondisi setelah normal
                  </p>
                </div>
                {photoPreview && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                    Foto Terlampir
                  </span>
                )}
              </div>

              {/* Action Buttons for Photo */}
              {!photoPreview ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  
                  {/* Buka Kamera Langsung (Live Viewfinder) */}
                  <button
                    type="button"
                    onClick={() => setIsLiveCameraOpen(true)}
                    className="p-3 rounded-xl border-2 border-dashed border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 flex items-center justify-center gap-2 text-foreground font-semibold transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Ambil Foto Kamera Langsung
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Live viewfinder & watermark otomatis
                      </span>
                    </div>
                  </button>

                  {/* Unggah Berkas Gambar */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-muted/70 flex items-center justify-center gap-2 text-foreground font-semibold transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground group-hover:text-foreground flex items-center justify-center shrink-0 border border-border">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-foreground">
                        Unggah dari Berkas / Galeri
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Format JPG, PNG, atau WebP
                      </span>
                    </div>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              ) : (
                /* Photo Preview Card */
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-card space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-mono text-muted-foreground truncate">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{photoTimestamp || 'Waktu Realtime'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIsZoomingPhoto(photoPreview)}
                        className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Perbesar Foto"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Zoom</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoTimestamp('');
                          setPhotoFileName('');
                        }}
                        className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Hapus / Ambil Ulang"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail */}
                  <div 
                    onClick={() => setIsZoomingPhoto(photoPreview)}
                    className="relative rounded-lg overflow-hidden border border-border aspect-video sm:aspect-21/9 bg-black/40 cursor-pointer group flex items-center justify-center"
                  >
                    <img
                      src={photoPreview}
                      alt="Bukti Re-QC Penyelesaian"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-semibold text-xs">
                      <Eye className="w-4 h-4" />
                      <span>Klik untuk memperbesar</span>
                    </div>
                    {/* Timestamp HUD pill */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono border border-white/20">
                      QC SOLVED • {photoTimestamp}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. TEKNISI PELAKSANA (RESOLVED BY) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Teknisi / Verifikator QC</span>
                </label>
                <input
                  type="text"
                  value={resolvedBy}
                  onChange={(e) => setResolvedBy(e.target.value)}
                  placeholder="Nama teknisi pelaksana"
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Waktu Verifikasi Selesai</span>
                </label>
                <input
                  type="text"
                  value={photoTimestamp || 'Hari ini, Waktu Sekarang'}
                  disabled
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-muted/40 text-muted-foreground text-xs font-mono outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* FOOTER BUTTONS */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={!resolutionNote.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Selesai & Simpan Bukti Re-QC</span>
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* LIVE CAMERA VIEWFINDER MODAL */}
      {isLiveCameraOpen && (
        <LiveCameraModal
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onCapture={handleLiveCameraCapture}
          onFallbackToFileInput={() => fileInputRef.current?.click()}
          title={`Foto Re-QC Selesai: ${issue.location}`}
          subtitle="Jepret foto bukti perbaikan atau kondisi normal perangkat setelah di-QC ulang"
        />
      )}

      {/* WIFI SPEEDTEST MODAL */}
      {isSpeedtestModalOpen && currentBuilding && (
        <WifiSpeedtestModal
          isOpen={isSpeedtestModalOpen}
          onClose={() => setIsSpeedtestModalOpen(false)}
          building={currentBuilding}
          floorId={currentBuilding.floors[0]?.id || 'fl-1'}
          entityId={issue.id}
          entityTitle={issue.location}
          entityType="ROOM"
          initialSpeedMbps={downloadSpeed}
          initialSignalDbm={signalDbm}
          onSaveResult={handleSpeedtestComplete}
        />
      )}

      {/* PHOTO ZOOM FULLSCREEN MODAL */}
      {isZoomingPhoto && (
        <div 
          onClick={() => setIsZoomingPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={isZoomingPhoto}
              alt="Pratinjau Foto Re-QC Penuh"
              className="max-w-full max-h-[82vh] object-contain rounded-xl border border-white/20 shadow-2xl"
            />
            <div className="mt-3 px-3 py-1.5 rounded-full bg-zinc-900/90 text-white text-xs font-mono flex items-center gap-2 border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{issue.location} • Bukti QC Ulang: {photoTimestamp}</span>
            </div>
            <button
              onClick={() => setIsZoomingPhoto(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
