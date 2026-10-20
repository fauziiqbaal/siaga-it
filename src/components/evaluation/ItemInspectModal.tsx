import React, { useState, useRef } from 'react';
import { CheckStatus } from '../../types/hotel';
import { 
  X, 
  Check, 
  Camera, 
  Upload, 
  Trash2, 
  Tv, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  HelpCircle,
  FileCheck,
  Eye
} from 'lucide-react';
import { fileToBase64 } from '../../utils/evidenceStorage';
import { LiveCameraModal } from '../common/LiveCameraModal';

export interface InspectTarget {
  type: 'ROOM' | 'FACILITY';
  floorId: string;
  entityId: string;
  title: string; // e.g. "Kamar 201" or "Communal Lounge & TV Bersama"
  pillar: 'TV' | 'SMARTLOCK';
  currentStatus: CheckStatus;
}

interface ItemInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: InspectTarget | null;
  onConfirmInspection: (params: {
    status: 'PASS' | 'FAIL';
    note?: string;
    photoUrl?: string;
    issuePreset?: string;
  }) => void;
}

const TV_CHECKLIST = [
  { id: 'screen', label: 'Panel & Layar TV bersih tanpa garis/flicker/dead pixel' },
  { id: 'remote', label: 'Remote fisik responsif, tombol berfungsi & baterai terpasang' },
  { id: 'audio', label: 'Speaker & sinkronisasi suara jernih tanpa distorsi' },
  { id: 'stream', label: 'Aplikasi TV (YouTube / Netflix / IPTV) login & streaming lancar' },
];

const SMARTLOCK_CHECKLIST = [
  { id: 'rfid', label: 'Tap Kartu Master RFID / Kartu Tamu respon cepat (< 1 detik)' },
  { id: 'pin', label: 'Keypad digital PIN menyala & merespon kombinasi angka' },
  { id: 'deadbolt', label: 'Deadbolt mekanis presisi, menutup rapat & tidak seret kusen' },
  { id: 'battery', label: 'Indikator daya baterai terdeteksi normal (> 80%)' },
  { id: 'ble', label: 'Konektivitas BLE / TTLOCK / Mobile Key sync normal' },
];

const TV_FAIL_PRESETS = [
  'Layar Mati Total / Blank',
  'Remote TV Hilang / Rusak',
  'Suara TV Bisu / Audio Distorsi',
  'Aplikasi YouTube/Netflix Gagal Login',
  'Kabel HDMI / Power Rusak',
];

const SMARTLOCK_FAIL_PRESETS = [
  'Deadbolt Macet / Seret Kusen Pintu',
  'Reader RFID Tidak Respon / Bunyi Beep Error',
  'Indikator Baterai Lemah (< 20%)',
  'Keypad PIN Tidak Menyala',
  'Gagang Pintu Kendor / Longgar',
];

export const ItemInspectModal: React.FC<ItemInspectModalProps> = ({
  isOpen,
  onClose,
  target,
  onConfirmInspection,
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedFailPreset, setSelectedFailPreset] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !target) return null;

  const isTv = target.pillar === 'TV';
  const checklist = isTv ? TV_CHECKLIST : SMARTLOCK_CHECKLIST;
  const failPresets = isTv ? TV_FAIL_PRESETS : SMARTLOCK_FAIL_PRESETS;

  const handleToggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = () => {
    const allChecked: Record<string, boolean> = {};
    checklist.forEach(item => { allChecked[item.id] = true; });
    setCheckedItems(allChecked);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setPhotoUrl(base64);
    }
  };

  const handlePass = () => {
    const defaultNote = isTv 
      ? 'Inspeksi TV lengkap: Layar jernih, remote & audio normal lancar' 
      : 'Inspeksi Smartlock lengkap: Tap RFID <1s, deadbolt pas, baterai normal';
    onConfirmInspection({
      status: 'PASS',
      note: note.trim() || defaultNote,
      photoUrl: photoUrl || undefined,
    });
    handleReset();
    onClose();
  };

  const handleFail = () => {
    const defaultIssue = selectedFailPreset || (isTv ? 'Kendala TV / display bermasalah' : 'Kendala smartlock / akses pintu bermasalah');
    onConfirmInspection({
      status: 'FAIL',
      note: note.trim() || defaultIssue,
      photoUrl: photoUrl || undefined,
      issuePreset: defaultIssue,
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCheckedItems({});
    setNote('');
    setPhotoUrl(null);
    setSelectedFailPreset('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b border-border flex items-center justify-between ${
          isTv ? 'bg-purple-500/10' : 'bg-amber-500/10'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isTv 
                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' 
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              {isTv ? <Tv className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-sm sm:text-base truncate">
                  Inspeksi {isTv ? 'TV & Media' : 'Smartlock & Akses'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  target.currentStatus === 'PASS' 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                    : target.currentStatus === 'FAIL' 
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {target.currentStatus === 'PASS' ? 'Saat Ini: PASS' : target.currentStatus === 'FAIL' ? 'Saat Ini: FAIL' : 'Belum Diinspeksi'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {target.title} • {isTv ? 'Pilar Cable TV & IPTV' : 'Pilar Smartlock & Door Access'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Checklist Standard */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                Daftar Uji Kelayakan Standar IT:
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
              >
                Pilih Semua (Centang Semua)
              </button>
            </div>

            <div className="space-y-1.5">
              {checklist.map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <label
                    key={item.id}
                    onClick={() => handleToggleCheck(item.id)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      isChecked 
                        ? 'bg-emerald-500/[0.07] border-emerald-500/30 text-foreground' 
                        : 'bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium text-xs leading-tight">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Photo Capture Section (Ambil foto bukti saat inspect) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                Foto Bukti Saat Inspeksi:
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {photoUrl ? '1 Foto Siap Disimpan' : 'Opsional tapi disarankan'}
              </span>
            </div>

            {photoUrl ? (
              <div className="relative rounded-xl border border-border overflow-hidden bg-black/40 group max-w-xs mx-auto">
                <img src={photoUrl} alt="Bukti Inspeksi" className="w-full max-h-48 object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="p-1.5 rounded-lg bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="p-3 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-xs">Buka Kamera Live</span>
                  <span className="text-[10px] text-muted-foreground">Foto langsung perangkat</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted/50 text-foreground flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="font-bold text-xs">Unggah dari Galeri</span>
                  <span className="text-[10px] text-muted-foreground">Pilih file JPG/PNG</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Quick Issue Preset (if FAIL) */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <span className="font-bold text-muted-foreground text-[11px] block">
              Preset Kendala Cepat (Pilih jika ada masalah/FAIL):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {failPresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedFailPreset(preset);
                    setNote(preset);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-all cursor-pointer ${
                    selectedFailPreset === preset
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50'
                      : 'bg-muted/40 text-muted-foreground border-border hover:border-foreground/30'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Notes field */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">
              Catatan Hasil Inspeksi / Tindak Lanjut:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isTv ? 'Contoh: TV Samsung 43" berfungsi jernih, remote normal' : 'Contoh: Smartlock respon RFID cepat, baterai 100%'}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Action Footer with PASS & FAIL Buttons */}
        <div className="p-3 sm:p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => { handleReset(); onClose(); }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer order-3 sm:order-1 text-center"
          >
            Batal
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {/* Mark FAIL Button */}
            <button
              type="button"
              onClick={handleFail}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Tandai ada kendala pada perangkat ini"
            >
              <X className="w-4 h-4" />
              <span>Mark FAIL (Kendala)</span>
            </button>

            {/* Mark PASS Button */}
            <button
              type="button"
              onClick={handlePass}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
              title="Tandai perangkat ini lolos uji QC standar"
            >
              <Check className="w-4 h-4" />
              <span>Mark PASS (Lolos)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Camera Modal */}
      {isCameraOpen && (
        <LiveCameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(dataUrl) => {
            setPhotoUrl(dataUrl);
            setIsCameraOpen(false);
          }}
          title={`Foto Bukti ${isTv ? 'TV' : 'Smartlock'} — ${target.title}`}
        />
      )}
    </div>
  );
};
