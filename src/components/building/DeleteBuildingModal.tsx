import React, { useState, useEffect } from 'react';
import { Building, SimpleUser } from '../../types/hotel';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Lock, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Building2, 
  DoorClosed, 
  Video, 
  Cpu, 
  Layers 
} from 'lucide-react';

interface DeleteBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building | null;
  currentUser: SimpleUser;
  users: SimpleUser[];
  totalBuildingsCount: number;
  onConfirmDelete: (buildingId: string) => void;
}

export const DeleteBuildingModal: React.FC<DeleteBuildingModalProps> = ({
  isOpen,
  onClose,
  building,
  currentUser,
  totalBuildingsCount,
  onConfirmDelete,
}) => {
  const isAuthorized = currentUser.role === 'ADMIN' || currentUser.role === 'BACKOFFICE';
  const [enteredPin, setEnteredPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEnteredPin('');
      setShowPin(false);
      setIsAgreed(false);
      setErrorMessage('');
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!isOpen || !building) return null;

  const totalRooms = building.floors.reduce((acc, f) => acc + f.rooms.length, 0);
  const totalCctv = building.cctvPoints?.length || 0;
  const totalDevices = building.devices?.length || 0;
  const isOnlyBuilding = totalBuildingsCount <= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isAuthorized) {
      setErrorMessage('Akses ditolak: Hanya akun Administrator / Backoffice yang berhak menghapus properti.');
      return;
    }

    if (isOnlyBuilding) {
      setErrorMessage('Tidak dapat menghapus properti ini. Sistem membutuhkan minimal 1 properti aktif.');
      return;
    }

    if (!isAgreed) {
      setErrorMessage('Anda harus mencentang konfirmasi persetujuan dampak penghapusan.');
      return;
    }

    if (!enteredPin.trim() || enteredPin.length !== 4) {
      setErrorMessage('Silakan masukkan 4-digit PIN akun Anda untuk otorisasi.');
      return;
    }

    // Verify PIN strictly against logged-in user's PIN
    if (enteredPin.trim() !== currentUser.pin) {
      setErrorMessage('PIN akun Anda salah! Penghapusan dibatalkan.');
      return;
    }

    // PIN verified successfully
    setIsDeleting(true);
    setTimeout(() => {
      onConfirmDelete(building.id);
      setIsDeleting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-rose-500/30 shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin">
        
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-3.5 border-b border-border mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground leading-tight">
                  Hapus Properti & Seluruh Data
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  Admin & Backoffice
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tindakan berbahaya — Memerlukan otorisasi PIN akun resmi
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. JIKA ROLE TEKNISI -> STRICT ACCESS DENIED */}
        {!isAuthorized ? (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs space-y-3 mb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>Akses Ditolak: Hanya untuk Administrator & Backoffice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-foreground/90">
              Penghapusan data properti adalah tindakan level tinggi yang <strong>hanya dapat dieksekusi oleh akun dengan peran ADMIN atau BACKOFFICE</strong>.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Akun Anda saat ini login sebagai: <strong className="text-foreground">{currentUser.name} ({currentUser.role})</strong>. Teknisi lapangan tidak memiliki wewenang menghapus gedung properti dari sistem Siaga IT.
            </p>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-background border border-border text-foreground font-semibold text-xs hover:bg-muted transition-colors"
              >
                Kembali & Tutup
              </button>
            </div>
          </div>
        ) : isOnlyBuilding ? (
          /* 2. PROTEKSI GEDUNG TERAKHIR */
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs space-y-2 mb-4">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Gedung Terakhir Tidak Dapat Dihapus</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Ini adalah satu-satunya properti yang terdaftar di sistem. Anda harus menambahkan properti baru terlebih dahulu sebelum dapat menghapus properti <strong>{building.name}</strong>.
            </p>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-background border border-border text-foreground font-semibold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* 3. FORM HAPUS PROPERTI (KHUSUS AKUN BACKOFFICE) */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Card Target Properti */}
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.03] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Properti yang akan dihapus:
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{building.id}</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-foreground">
                  {building.name}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {building.address} • ISP: {building.ispProvider}
                </p>
              </div>

              {/* Data counts that will be purged */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-rose-500/10 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-background border border-border flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span><strong>{building.floors.length}</strong> Lantai</span>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border flex items-center gap-1.5">
                  <DoorClosed className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span><strong>{totalRooms}</strong> Kamar</span>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span><strong>{totalCctv}</strong> CCTV</span>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span><strong>{totalDevices}</strong> Perangkat</span>
                </div>
              </div>
            </div>

            {/* Warning Text */}
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-muted-foreground text-[11px] leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Peringatan Kehilangan Data:</strong> Seluruh riwayat penilaian QC, log Wi-Fi speedtest, berkas foto bukti lapangan, serta tiket kendala pada gedung ini akan <span className="text-rose-600 dark:text-rose-400 font-bold underline">dihapus secara permanen</span> dan tidak dapat dikembalikan.
              </div>
            </div>

            {/* Otorisasi Akun Admin / Backoffice & Input PIN */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Otorisasi Akun Anda ({currentUser.role})</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  currentUser.role === 'ADMIN' 
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' 
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                }`}>
                  {currentUser.role}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-border bg-background flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-foreground">{currentUser.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">@{currentUser.username} • {currentUser.email}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Terverifikasi
                </span>
              </div>

              {/* Input PIN Akun 4 Digit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-muted-foreground font-medium">
                    Masukkan PIN Akun Anda (4 Digit) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPin ? 'Sembunyikan' : 'Lihat'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={4}
                    value={enteredPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setEnteredPin(val);
                      setErrorMessage('');
                    }}
                    placeholder="•••• (4 Digit PIN)"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono tracking-widest font-bold text-center outline-none focus:border-rose-500"
                    autoFocus
                  />
                </div>
                <span className="text-[10px] text-muted-foreground block mt-1">
                  PIN akun Backoffice Anda ({currentUser.username}): <strong>{currentUser.pin}</strong>
                </span>
              </div>
            </div>

            {/* Checkbox Konfirmasi Pemahaman */}
            <label className="p-3 rounded-lg border border-border bg-card flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => {
                  setIsAgreed(e.target.checked);
                  setErrorMessage('');
                }}
                className="w-4 h-4 rounded text-rose-600 accent-rose-600 mt-0.5 shrink-0"
              />
              <span className="text-[11px] text-foreground leading-snug">
                Saya mengonfirmasi bahwa saya berwenang sebagai Backoffice dan menyetujui properti <strong>{building.name}</strong> dihapus permanen.
              </span>
            </label>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-100">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!isAgreed || enteredPin.length !== 4 || isDeleting}
                className={`px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  !isAgreed || enteredPin.length !== 4 || isDeleting
                    ? 'bg-rose-500/40 cursor-not-allowed opacity-60'
                    : 'bg-rose-600 hover:bg-rose-700 active:scale-95'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Menghapus Properti...' : 'Konfirmasi & Hapus Properti'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
