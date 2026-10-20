import React, { useState, useRef } from 'react';
import { CheckStatus } from '../../types/hotel';
import { 
  X, 
  AlertCircle, 
  Check, 
  Camera, 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Eye, 
  Wifi, 
  Tv, 
  KeyRound, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  FileText
} from 'lucide-react';
import { fileToBase64 } from '../../utils/evidenceStorage';
import { LiveCameraModal } from '../common/LiveCameraModal';

export interface IssueModalTarget {
  type: 'ROOM' | 'FACILITY';
  floorId: string;
  entityId: string;
  title: string; // e.g. "Kamar 204" or "Dapur Bersama Lt 1"
  pillar: 'WIFI' | 'TV' | 'SMARTLOCK';
  currentStatus: CheckStatus;
  previousIssueText?: string;
  previousPhotoUrl?: string;
  previousReportedAt?: string;
  speedMbps?: number;
}

interface IssueActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'REPORT_ISSUE' | 'SOLVE_ISSUE';
  target: IssueModalTarget;
  onConfirmReport: (params: {
    issueText: string;
    photoUrl?: string;
    photoTimestamp?: string;
    vendorTarget?: string;
  }) => void;
  onConfirmSolve: (params: {
    resolutionNote: string;
    resolutionPhotoUrl?: string;
    resolutionTimestamp?: string;
    updatedSpeedMbps?: number;
  }) => void;
}

const COMMON_ISSUE_PRESETS = {
  WIFI: [
    'Sinyal Drop / Lemah (<20 Mbps)',
    'SSID Tidak Terdeteksi di Area Kamar',
    'Kabel LAN / Port RJ45 Longgar',
    'IP Conflict / Gagal Dapat DHCP',
    'Koneksi Sering Putus / High Latency',
  ],
  TV: [
    'Layar Bintik / Layar Mati Total',
    'Remote TV Hilang / Tidak Respon',
    'Tidak Ada Suara / Audio Distorsi',
    'Kabel HDMI / Power Lepas',
    'Aplikasi YouTube/Netflix Tidak Bisa Login',
  ],
  SMARTLOCK: [
    'Deadbolt Macet / Seret Saat Mengunci',
    'Reader RFID / Keypad PIN Tidak Respon',
    'Baterai Lemah (Indikator Merah Berkedip)',
    'BLE Mobile Key Gagal Pairing',
    'Gagang Pintu Kendor / Longgar',
  ],
};

const COMMON_RESOLVE_PRESETS = {
  WIFI: [
    'Kabel UTP di-re-crimping & konektor baru dipasang',
    'Posisi AP koridor digeser agar cover maksimal',
    'Port PoE Switch dipindahkan & dites ulang',
    'Perangkat di-restart & profil SSID diterapkan ulang',
  ],
  TV: [
    'Kabel HDMI & adaptor power diganti baru',
    'Unit TV di-reset pabrik & firmware di-update',
    'Baterai remote diganti baru & ditest lancar',
    'Braket dinding dikencangkan ulang',
  ],
  SMARTLOCK: [
    'Baterai diganti baru 4x AA Alkaline (100%)',
    'Deadbolt & pelat kusen disetting ulang hingga pas',
    'Kartu Master RFID & PIN tamu diprogram ulang',
    'Engsel & gagang pintu dilumasi, buka-tutup lancar',
  ],
};

export const IssueActionModal: React.FC<IssueActionModalProps> = ({
  isOpen,
  onClose,
  mode,
  target,
  onConfirmReport,
  onConfirmSolve,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [issueText, setIssueText] = useState(target.previousIssueText || '');
  const [resolutionNote, setResolutionNote] = useState('');
  const [vendorTarget, setVendorTarget] = useState(
    target.pillar === 'WIFI' ? 'ISP Biznet / Ruijie' : target.pillar === 'TV' ? 'Samsung / Google TV' : 'Salto / Bardi Smartlock'
  );
  const [newSpeedMbps, setNewSpeedMbps] = useState<number>(
    target.speedMbps && target.speedMbps > 25 ? target.speedMbps : 70
  );

  // Evidence Photo State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState<string>('');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [isZoomingPhoto, setIsZoomingPhoto] = useState<string | null>(null);

  if (!isOpen) return null;

  const pillarLabel = target.pillar === 'WIFI' ? 'Wi-Fi' : target.pillar === 'TV' ? 'TV' : 'Smartlock';
  const PillarIcon = target.pillar === 'WIFI' ? Wifi : target.pillar === 'TV' ? Tv : KeyRound;

  // Handle Photo Select / Capture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const now = new Date();
      const timeStr = now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const tag = mode === 'REPORT_ISSUE' ? 'KENDALA' : 'SOLVED';
      const cleanTitle = target.title.replace(/[^a-zA-Z0-9]/g, '_');
      const genName = `${tag}_${cleanTitle}_${target.pillar}_${now.getTime().toString().slice(-6)}.jpg`;

      setPhotoPreview(base64);
      setPhotoTimestamp(timeStr);
      setPhotoFileName(genName);
    } catch (err) {
      console.error('Error reading image file:', err);
      alert('Gagal memproses gambar. Silakan coba lagi.');
    }
  };

  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  // Handle Photo Capture from Live Camera Viewfinder
  const handleLivePhotoCapture = (dataUrl: string, _file: File) => {
    const now = new Date();
    const timeStr = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const tag = mode === 'REPORT_ISSUE' ? 'KENDALA' : 'SOLVED';
    const cleanTitle = target.title.replace(/[^a-zA-Z0-9]/g, '_');
    const genName = `${tag}_${cleanTitle}_${target.pillar}_${now.getTime().toString().slice(-6)}.jpg`;

    setPhotoPreview(dataUrl);
    setPhotoTimestamp(timeStr);
    setPhotoFileName(genName);
    setIsLiveCameraOpen(false);
  };

  // Submit Report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim()) {
      alert('Mohon masukkan deskripsi kendala yang ditemukan.');
      return;
    }

    onConfirmReport({
      issueText: issueText.trim(),
      photoUrl: photoPreview || undefined,
      photoTimestamp: photoTimestamp || undefined,
      vendorTarget: vendorTarget.trim() || undefined,
    });
    onClose();
  };

  // Submit Solve
  const handleSubmitSolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNote.trim()) {
      alert('Mohon masukkan alasan / tindakan perbaikan yang telah dilakukan.');
      return;
    }

    onConfirmSolve({
      resolutionNote: resolutionNote.trim(),
      resolutionPhotoUrl: photoPreview || undefined,
      resolutionTimestamp: photoTimestamp || undefined,
      updatedSpeedMbps: target.pillar === 'WIFI' ? Number(newSpeedMbps) || 70 : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* HEADER BAR */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          mode === 'REPORT_ISSUE'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              mode === 'REPORT_ISSUE' ? 'bg-rose-500/20 text-rose-600' : 'bg-emerald-500/20 text-emerald-600'
            }`}>
              {mode === 'REPORT_ISSUE' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {mode === 'REPORT_ISSUE' ? 'Laporkan Kendala' : 'Penyelesaian Kendala'} {pillarLabel}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono border ${
                  mode === 'REPORT_ISSUE'
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                }`}>
                  {mode === 'REPORT_ISSUE' ? 'SET FAIL' : 'MARK SOLVED & OK'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium">
                <span>{target.title}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <PillarIcon className="w-3 h-3" />
                  <span>Pilar: {pillarLabel}</span>
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          
          {/* ==================================================== */}
          {/* CASE 2: MODE SOLVE_ISSUE -> TAMPILKAN ISSUE SEBELUMNYA */}
          {/* ==================================================== */}
          {mode === 'SOLVE_ISSUE' && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Kendala Yang Pernah Dilaporkan Sebelumnya:</span>
                </div>
                {target.previousReportedAt && (
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {target.previousReportedAt}
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-background border border-amber-500/20 text-foreground font-medium text-xs leading-relaxed">
                {target.previousIssueText || 'Kendala status FAIL sebelumnya tercatat pada checklist.'}
              </div>

              {/* Foto Bukti Kendala Lama jika ada */}
              {target.previousPhotoUrl ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    Foto Bukti Kendala Lama:
                  </span>
                  <div 
                    onClick={() => setIsZoomingPhoto(target.previousPhotoUrl!)}
                    className="relative w-32 h-24 rounded-lg overflow-hidden border border-border bg-black/10 cursor-pointer group hover:ring-2 hover:ring-amber-500 transition-all shadow-xs"
                    title="Klik untuk perbesar foto"
                  >
                    <img 
                      src={target.previousPhotoUrl} 
                      alt="Foto kendala lama" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-bold gap-1">
                      <Eye className="w-4 h-4" />
                      <span>Lihat</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">
                  (Tidak ada lampiran foto bukti pada laporan kendala sebelumnya)
                </p>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* FORM: REPORT KENDALA BARU (FAIL)                     */}
          {/* ==================================================== */}
          {mode === 'REPORT_ISSUE' ? (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              
              {/* Deskripsi Kendala */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1">
                    <span>Deskripsi Kendala yang Ditemukan *</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">Wajib diisi</span>
                </div>

                <textarea
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder={`Jelaskan secara detail kendala ${pillarLabel} di ${target.title}...`}
                  rows={3}
                  required
                  autoFocus
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-xs outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
                />

                {/* Preset Cepat Kendala */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold block">
                    Preset Cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_ISSUE_PRESETS[target.pillar].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setIssueText(preset)}
                        className="px-2 py-0.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground text-[10px] font-medium transition-colors"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target Eskalasi Vendor */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground block">
                  Eskalasi ke Vendor / Pihak Terkait (Opsional)
                </label>
                <input
                  type="text"
                  value={vendorTarget}
                  onChange={(e) => setVendorTarget(e.target.value)}
                  placeholder="Contoh: ISP Biznet / Ruijie Reyee / Salto Smartlock"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Upload Foto Bukti Kendala */}
              <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Camera className="w-4 h-4 text-rose-500" />
                    <span>Upload Foto Bukti Kendala</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Direct Kamera / File HP
                  </span>
                </div>

                {photoPreview ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-border bg-black/10 aspect-video max-h-48 flex items-center justify-center">
                      <img 
                        src={photoPreview} 
                        alt="Bukti kendala" 
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoTimestamp('');
                          setPhotoFileName('');
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span className="truncate max-w-[240px] text-foreground font-medium">{photoFileName}</span>
                      <span>{photoTimestamp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLiveCameraOpen(true)}
                      className="py-3 px-3 rounded-xl border border-dashed border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
                    >
                      <Camera className="w-5 h-5 text-rose-500" />
                      <span className="text-xs">Buka Kamera</span>
                      <span className="text-[9px] opacity-75 font-normal">Ambil foto langsung</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-3 px-3 rounded-xl border border-dashed border-border bg-background hover:bg-muted text-foreground font-semibold flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
                    >
                      <Upload className="w-5 h-5 text-blue-500" />
                      <span className="text-xs">Pilih File Galeri</span>
                      <span className="text-[9px] text-muted-foreground font-normal">Dari HP / Laptop</span>
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Simpan Kendala (Set Status FAIL)</span>
                </button>
              </div>

            </form>
          ) : (
            // ====================================================
            // FORM: SOLVE KENDALA (MARK AS PASS / OK)
            // ====================================================
            <form onSubmit={handleSubmitSolve} className="space-y-4">
              
              {/* Alasan / Tindakan Perbaikan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1">
                    <span>Alasan / Tindakan Perbaikan yang Dilakukan *</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">Wajib diisi</span>
                </div>

                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Jelaskan tindakan perbaikan yang telah dilakukan hingga normal..."
                  rows={3}
                  required
                  autoFocus
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />

                {/* Preset Cepat Penyelesaian */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold block">
                    Preset Cepat Solusi:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_RESOLVE_PRESETS[target.pillar].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setResolutionNote(preset)}
                        className="px-2 py-0.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground text-[10px] font-medium transition-colors text-left"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Jika Wi-Fi: Input Kecepatan Speedtest Baru */}
              {target.pillar === 'WIFI' && (
                <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-foreground block text-xs">
                      Hasil Speedtest Baru (Mbps):
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Standar minimum live &ge; 15 Mbps
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={newSpeedMbps}
                      onChange={(e) => setNewSpeedMbps(Number(e.target.value))}
                      className="w-16 px-2 py-1.5 rounded-lg border border-border bg-background font-mono font-bold text-sm text-center outline-none focus:border-emerald-500"
                      required
                    />
                    <span className="font-mono font-bold text-xs text-muted-foreground">Mbps</span>
                  </div>
                </div>
              )}

              {/* Upload Foto Bukti Perbaikan / Selesai */}
              <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Camera className="w-4 h-4 text-emerald-500" />
                    <span>Upload Foto Bukti Perbaikan (Solved)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Foto hasil perbaikan
                  </span>
                </div>

                {photoPreview ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-border bg-black/10 aspect-video max-h-48 flex items-center justify-center">
                      <img 
                        src={photoPreview} 
                        alt="Bukti perbaikan" 
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoTimestamp('');
                          setPhotoFileName('');
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span className="truncate max-w-[240px] text-foreground font-medium">{photoFileName}</span>
                      <span>{photoTimestamp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLiveCameraOpen(true)}
                      className="py-3 px-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
                    >
                      <Camera className="w-5 h-5 text-emerald-500" />
                      <span className="text-xs">Buka Kamera</span>
                      <span className="text-[9px] opacity-75 font-normal">Foto hasil normal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-3 px-3 rounded-xl border border-dashed border-border bg-background hover:bg-muted text-foreground font-semibold flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
                    >
                      <Upload className="w-5 h-5 text-blue-500" />
                      <span className="text-xs">Pilih File Galeri</span>
                      <span className="text-[9px] text-muted-foreground font-normal">Dari HP / Laptop</span>
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Selesaikan Kendala (Mark as OK / SOLVED)</span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

      {/* ZOOM PHOTO MODAL */}
      {isZoomingPhoto && (
        <div 
          onClick={() => setIsZoomingPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-xl">
            <img 
              src={isZoomingPhoto} 
              alt="Perbesar bukti" 
              className="max-w-full max-h-[85vh] object-contain"
            />
            <button
              onClick={() => setIsZoomingPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onCapture={handleLivePhotoCapture}
        onFallbackToFileInput={() => cameraInputRef.current?.click()}
        title={`Foto Bukti ${mode === 'REPORT_ISSUE' ? 'Kendala' : 'Perbaikan'}: ${target.title}`}
        subtitle={`Ambil foto ${pillarLabel} untuk ${target.title}`}
      />

    </div>
  );
};
