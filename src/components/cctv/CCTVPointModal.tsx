import React, { useState, useEffect } from 'react';
import { 
  CCTVPoint, 
  CheckStatus, 
  CCTVOperationalStatus, 
  TakeoverStatus, 
  CCTVConnectivityType, 
  CCTV_CONNECTIVITY_CONFIG 
} from '../../types/hotel';
import { 
  X, 
  Video, 
  Target, 
  Check, 
  Layers, 
  FileText,
  Sliders,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Lock,
  Wifi,
  Network,
  Cpu
} from 'lucide-react';

export interface CCTVPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'ADD' | 'EDIT';
  point?: CCTVPoint | null;
  nextNumber: number;
  availableFloors?: number[];
  onSave: (pointData: {
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
  }) => void;
}

export const CCTVPointModal: React.FC<CCTVPointModalProps> = ({
  isOpen,
  onClose,
  mode,
  point,
  nextNumber,
  availableFloors = [1, 2, 3],
  onSave,
}) => {
  // Form State
  const [pointNumber, setPointNumber] = useState<number>(1);
  const [objectCoverage, setObjectCoverage] = useState('');
  const [floorNumber, setFloorNumber] = useState<number | undefined>(1);
  const [cctvStatus, setCctvStatus] = useState<CCTVOperationalStatus>('ONLINE');
  const [connectivityType, setConnectivityType] = useState<CCTVConnectivityType>('LAN_POE_NVR');
  const [notes, setNotes] = useState('');
  const [createIssueNow, setCreateIssueNow] = useState(true);
  // Standalone IP Cam & Takeover State
  const [takeoverStatus, setTakeoverStatus] = useState<TakeoverStatus>('SUDAH_TAKEOVER');
  const [masterAccount, setMasterAccount] = useState<string>('siaga.it@rukita.co');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'EDIT' && point) {
        // Extract clean number
        let num = point.pointNumber;
        if (!num) {
          const match = point.locationName.match(/\d+/);
          num = match ? parseInt(match[0], 10) : (point.channel || 1);
        }
        setPointNumber(num);
        setObjectCoverage(point.objectCoverage || '');
        setFloorNumber(point.floorNumber || 1);
        
        // Connectivity Type
        if (point.connectivityType) {
          setConnectivityType(point.connectivityType);
        } else if (point.isStandalone) {
          setConnectivityType('WIFI_CAM_STANDALONE');
        } else {
          setConnectivityType('LAN_POE_NVR');
        }

        // Map cctvStatus
        if (point.cctvStatus) {
          setCctvStatus(point.cctvStatus);
        } else if (point.status === 'PASS') {
          setCctvStatus('ONLINE');
        } else if (point.installationStatus === 'BELUM_TERPASANG') {
          setCctvStatus('PERLU_INSTALASI');
        } else if (point.installationStatus === 'PERLU_RELOKASI' || point.notes?.toLowerCase().includes('reposisi')) {
          setCctvStatus('PERLU_REPOSISI');
        } else if (point.status === 'FAIL') {
          setCctvStatus('OFFLINE');
        } else {
          setCctvStatus('BELUM_DIKETAHUI');
        }

        setNotes(point.notes || '');
        setCreateIssueNow(point.status !== 'PASS');
        setTakeoverStatus(point.takeoverStatus || 'SUDAH_TAKEOVER');
        setMasterAccount(point.masterAccount || 'siaga.it@rukita.co');
      } else {
        // Add Mode
        setPointNumber(nextNumber > 0 ? nextNumber : 1);
        setObjectCoverage('');
        setFloorNumber(1);
        setCctvStatus('ONLINE');
        setConnectivityType('LAN_POE_NVR');
        setNotes('');
        setCreateIssueNow(false);
        setTakeoverStatus('SUDAH_TAKEOVER');
        setMasterAccount('siaga.it@rukita.co');
      }
    }
  }, [isOpen, mode, point, nextNumber]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNumber = Number(pointNumber) || 1;
    const finalLocationName = `Titik ${finalNumber}`;

    // Map operational status to CheckStatus and installationStatus
    let checkStatus: CheckStatus = 'PASS';
    let installStatus: 'TERPASANG' | 'BELUM_TERPASANG' | 'PERLU_RELOKASI' = 'TERPASANG';

    if (cctvStatus === 'ONLINE') {
      checkStatus = 'PASS';
      installStatus = 'TERPASANG';
    } else if (cctvStatus === 'OFFLINE') {
      checkStatus = 'FAIL';
      installStatus = 'TERPASANG';
    } else if (cctvStatus === 'PERLU_REPOSISI') {
      checkStatus = 'FAIL';
      installStatus = 'PERLU_RELOKASI';
    } else if (cctvStatus === 'PERLU_INSTALASI') {
      checkStatus = 'PENDING';
      installStatus = 'BELUM_TERPASANG';
    } else if (cctvStatus === 'BELUM_DIKETAHUI') {
      checkStatus = 'PENDING';
      installStatus = 'TERPASANG';
    }

    const isStandaloneCamera = connectivityType === 'WIFI_CAM_STANDALONE';

    onSave({
      pointNumber: finalNumber,
      locationName: finalLocationName,
      objectCoverage: objectCoverage.trim(),
      floorNumber,
      cctvStatus,
      connectivityType,
      status: checkStatus,
      installationStatus: installStatus,
      notes: notes.trim() || undefined,
      createIssueNow: cctvStatus !== 'ONLINE' && createIssueNow,
      isStandalone: isStandaloneCamera,
      takeoverStatus: isStandaloneCamera ? takeoverStatus : undefined,
      masterAccount: isStandaloneCamera ? masterAccount.trim() : undefined,
    });
    onClose();
  };

  const connectivityOptions: {
    type: CCTVConnectivityType;
    num: number;
    label: string;
    sub: string;
  }[] = [
    {
      type: 'COAXIAL_DVR',
      num: 1,
      label: 'Coaxial to DVR',
      sub: 'Kabel Coaxial RG59/RG6 + Power DC terhubung ke DVR Analog',
    },
    {
      type: 'LAN_POE_NVR',
      num: 2,
      label: 'LAN POE to NVR',
      sub: 'Kabel UTP RJ45 via Power over Ethernet (PoE Switch / NVR PoE)',
    },
    {
      type: 'LAN_NON_POE_NVR',
      num: 3,
      label: 'LAN Non POE to NVR',
      sub: 'Kabel UTP data LAN + Adaptor Listrik DC terpisah ke NVR',
    },
    {
      type: 'WIFI_CAM_STANDALONE',
      num: 4,
      label: 'Wifi Camera Standalone',
      sub: 'Kamera Wi-Fi independen tanpa NVR (MicroSD/Cloud App, perlu takeover)',
    },
    {
      type: 'WIFI_CAM_NVR',
      num: 5,
      label: 'Wifi Camera to NVR',
      sub: 'Kamera Wi-Fi wireless di-stream & direkam terpusat ke NVR',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {mode === 'ADD' ? 'Tambah Titik CCTV Baru' : `Edit Titik CCTV #${pointNumber}`}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === 'ADD' 
                  ? 'Tentukan nomor urut titik, tipe konektivitas, objek coverage, dan status' 
                  : 'Ubah nomor titik, tipe konektivitas, coverage, atau status operasional'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Row 1: Nomor Titik & Posisi Lantai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground block mb-1 font-semibold">
                Nomor Titik CCTV *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground font-mono font-bold text-xs">
                  #
                </span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={pointNumber}
                  onChange={(e) => setPointNumber(parseInt(e.target.value, 10) || 1)}
                  placeholder="1"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-xs font-mono font-bold text-foreground outline-none focus:border-blue-500"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Cukup nomor urut titik (misal: 1, 2, 3...)
              </p>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-semibold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Posisi Lantai</span>
              </label>
              <select
                value={floorNumber || 1}
                onChange={(e) => setFloorNumber(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs outline-none focus:border-blue-500 font-medium"
              >
                {availableFloors.map((fl) => (
                  <option key={fl} value={fl}>
                    Lantai {fl}
                  </option>
                ))}
                <option value={99}>Area Luar / Outdoor</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Lantai atau zona penempatan kamera
              </p>
            </div>
          </div>

          {/* Row 2: Target Objek Coverage (Manual Input Tanpa Pilihan Cepat) */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Target className="w-4 h-4" />
                <span>Target Objek Coverage *</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">Diisi manual oleh teknisi</span>
            </label>

            <input
              type="text"
              value={objectCoverage}
              onChange={(e) => setObjectCoverage(e.target.value)}
              placeholder="Ketik target area sorotan (contoh: Area Parkir Motor, Dapur Bersama, Pagar Depan)"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs text-foreground outline-none focus:border-blue-500 font-medium"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Tuliskan deskripsi area atau fasilitas yang harus terpantau oleh titik CCTV ini
            </p>
          </div>

          {/* Row 3: Status Operasional CCTV (Drop-down Pilihan) */}
          <div className="space-y-1.5">
            <label className="text-foreground block font-bold flex items-center gap-1.5 text-xs">
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>Status Operasional CCTV *</span>
            </label>
            
            <select
              value={cctvStatus}
              onChange={(e) => {
                const nextVal = e.target.value as CCTVOperationalStatus;
                setCctvStatus(nextVal);
                setCreateIssueNow(nextVal !== 'ONLINE');
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ONLINE">🟢 Online (Normal & Rekam Aktif)</option>
              <option value="OFFLINE">🔴 Offline (Mati / Terputus)</option>
              <option value="BELUM_DIKETAHUI">⚪ Belum Diketahui (Perlu Verifikasi Lapangan)</option>
              <option value="PERLU_REPOSISI">🔵 Perlu Reposisi (Sudut Sorotan Kurang Pas / Blindspot)</option>
              <option value="PERLU_INSTALASI">🟡 Perlu Penambahan Instalasi (Titik Belum Terpasang)</option>
            </select>

            <p className="text-[10px] text-muted-foreground">
              Pilih status kesiapan titik kamera CCTV di lapangan saat ini
            </p>
          </div>

          {/* Issue Auto-create Checkbox when status !== ONLINE */}
          {cctvStatus !== 'ONLINE' && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1.5 animate-in fade-in duration-150">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createIssueNow}
                  onChange={(e) => setCreateIssueNow(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="font-bold text-foreground text-xs block">
                    Jadikan Catatan Issue & Eskalasi Vendor
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    {cctvStatus === 'PERLU_INSTALASI' && 'Otomatis catat tiket kendala "Perlu penambahan instalasi titik CCTV" untuk penarikan kabel UTP & unit baru.'}
                    {cctvStatus === 'PERLU_REPOSISI' && 'Otomatis catat tiket kendala "Perlu reposisi sudut kamera" agar diarahkan ulang oleh teknisi.'}
                    {cctvStatus === 'OFFLINE' && 'Otomatis catat tiket kendala "Kamera Offline" agar segera dicek adaptor dan port PoE.'}
                    {cctvStatus === 'BELUM_DIKETAHUI' && 'Otomatis catat tiket tugas inspeksi lapangan untuk memastikan koneksi kamera.'}
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Row 4: Tipe Konektivitas (5 Pilihan Standar IT Operasional) */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-foreground font-bold flex items-center gap-1.5 text-xs">
                <Network className="w-4 h-4 text-indigo-500" />
                <span>Tipe Konektivitas *</span>
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {CCTV_CONNECTIVITY_CONFIG[connectivityType]?.shortLabel}
              </span>
            </div>

            {/* List 5 Opsi Konektivitas */}
            <div className="space-y-1.5">
              {connectivityOptions.map((opt) => {
                const isSelected = connectivityType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setConnectivityType(opt.type)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500 text-foreground ring-1 ring-blue-500/40 shadow-xs'
                        : 'bg-background border-border/80 hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {opt.num}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-xs ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                          {opt.label}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded font-mono">
                            ✓ Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">
                        {opt.sub}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Jika Opsi 4: Wifi Camera Standalone, Tampilkan Panel Takeover Master Akses */}
            {connectivityType === 'WIFI_CAM_STANDALONE' ? (
              <div className="pt-2.5 border-t border-purple-500/30 space-y-2.5 animate-in fade-in duration-150 p-2.5 rounded-xl bg-purple-500/[0.04]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                    <span>Status Takeover Master Akses dari Owner *</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    takeoverStatus === 'SUDAH_TAKEOVER'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : takeoverStatus === 'PROSES_TAKEOVER'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {takeoverStatus === 'SUDAH_TAKEOVER' ? '✓ Sudah Takeover' : takeoverStatus === 'PROSES_TAKEOVER' ? '⏳ Sedang Proses' : '⚠️ Belum Takeover'}
                  </span>
                </div>

                <select
                  value={takeoverStatus}
                  onChange={(e) => setTakeoverStatus(e.target.value as TakeoverStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="SUDAH_TAKEOVER">✓ SUDAH TAKEOVER (Master Akses & Akun App Terkendali IT)</option>
                  <option value="BELUM_TAKEOVER">⚠️ BELUM TAKEOVER (Masih Akun Lama / Owner / Vendor)</option>
                  <option value="PROSES_TAKEOVER">⏳ PROSES TAKEOVER (Menunggu Reset / Unbind Cloud)</option>
                </select>

                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1 font-semibold">
                    Akun Master Pengelola / Email Aplikasi IP Cam:
                  </label>
                  <input
                    type="text"
                    value={masterAccount}
                    onChange={(e) => setMasterAccount(e.target.value)}
                    placeholder="Contoh: siaga.cctv@rukita.co atau akun owner lama"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground outline-none focus:border-purple-500 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    *PENTING: Kamera standalone harus di-reset & di-bind ke akun corporate Siaga IT agar tidak diintip pihak lama.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-background/60 border border-border/60 text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>
                  {connectivityType === 'COAXIAL_DVR' && 'Kamera analog terhubung ke DVR. Master akses diatur di akun cloud DVR.'}
                  {(connectivityType === 'LAN_POE_NVR' || connectivityType === 'LAN_NON_POE_NVR') && 'Kamera IP terhubung ke NVR. Master akses dan cloud unbinding diatur di NVR pusat.'}
                  {connectivityType === 'WIFI_CAM_NVR' && 'Kamera Wi-Fi di-stream via RTSP/ONVIF ke NVR. Rekaman terpusat di HDD NVR.'}
                </span>
              </div>
            )}
          </div>

          {/* Row 4: Catatan Khusus Lapangan / Masalah */}
          <div>
            <label className="text-muted-foreground block mb-1 font-semibold flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Catatan Khusus Lapangan (Opsional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                cctvStatus === 'PERLU_INSTALASI'
                  ? 'Contoh: Perlu penarikan kabel UTP 20m & pasang 1 unit dome camera...'
                  : cctvStatus === 'PERLU_REPOSISI'
                  ? 'Contoh: Geser arah lensa 30 derajat ke kanan ke arah pintu masuk...'
                  : cctvStatus === 'OFFLINE'
                  ? 'Contoh: Adaptor DC kendor / port switch PoE mati...'
                  : 'Contoh: Belum sempat dicek di layar monitor NVR...'
              }
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Footer Actions */}
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{mode === 'ADD' ? 'Simpan Titik CCTV' : 'Simpan Perubahan'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
