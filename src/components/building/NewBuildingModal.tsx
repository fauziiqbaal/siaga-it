import React, { useState, useMemo } from 'react';
import { Building, FloorConfig } from '../../types/hotel';
import { getBuildingDueDateInfo } from '../../utils/dateUtils';
import { 
  X, 
  Building2, 
  Plus, 
  Calendar, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Info
} from 'lucide-react';

interface NewBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBuilding: (newBuilding: Building) => void;
}

export const NewBuildingModal: React.FC<NewBuildingModalProps> = ({
  isOpen,
  onClose,
  onAddBuilding,
}) => {
  // Hanya Data Dasar Properti & Bangunan (Seksi 1)
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [floorsCount, setFloorsCount] = useState<number>(3);
  const [openingDate, setOpeningDate] = useState('15 Nov 2026');
  const [presaleDate, setPresaleDate] = useState('');

  const dueDatePreview = useMemo(() => {
    return getBuildingDueDateInfo({
      openingDate: openingDate.trim() || '15 Nov 2026',
      presaleDate: presaleDate.trim() || undefined,
    });
  }, [openingDate, presaleDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Generate struktur lantai dasar sesuai jumlah lantai
    // Kamar, fasilitas bersama, dan koneksi internet ditambahkan manual setelah properti dibuat
    const generatedFloors: FloorConfig[] = [];
    for (let f = 1; f <= floorsCount; f++) {
      generatedFloors.push({
        id: `fl-${Date.now()}-${f}`,
        floorNumber: f,
        name: `Lantai ${f}`,
        rooms: [],
        facilities: [],
      });
    }

    const newBuilding: Building = {
      id: `bld-${Date.now()}`,
      name: name.trim(),
      address: address.trim() || 'Jakarta',
      openingDate: openingDate.trim() || '15 Nov 2026',
      presaleDate: presaleDate.trim() || undefined,
      ispProvider: 'Belum dikonfigurasi',
      internetConnections: [],
      floors: generatedFloors,
      cctvPoints: [],
      devices: [],
    };

    onAddBuilding(newBuilding);
    setName('');
    setAddress('');
    setFloorsCount(3);
    setOpeningDate('15 Nov 2026');
    setPresaleDate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin">
        
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-3.5 border-b border-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                Tambah Properti Baru
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Input data identitas & struktur lantai gedung saat visit
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* INFORMASI DASAR PROPERTI */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3.5">
            <div>
              <label className="text-muted-foreground block mb-1 font-medium">
                Nama Gedung / Unit Kost <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Rukita RK Residence Benhil / Rukita Tomang"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-semibold outline-none focus:border-blue-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">
                Alamat / Lokasi Lengkap
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Bendungan Hilir No. 8, Jakarta Pusat"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">
                  Jumlah Lantai <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={floorsCount}
                    onChange={(e) => setFloorsCount(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono font-bold"
                    required
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-muted-foreground pointer-events-none">
                    Lantai
                  </span>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">
                  Target Tanggal Live <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                    placeholder="15 Nov 2026"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-semibold"
                    required
                  />
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Pre-sale & Due date IT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">
                  Tanggal Pre-Sale (Opsional)
                </label>
                <input
                  type="text"
                  value={presaleDate}
                  onChange={(e) => setPresaleDate(e.target.value)}
                  placeholder="Contoh: 10 Nov 2026"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium"
                />
              </div>

              <div className="flex flex-col justify-center text-[11px] text-muted-foreground bg-background/80 p-2.5 rounded-lg border border-border/70">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Target Due Date IT:</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <strong className="text-foreground font-mono">{dueDatePreview.itDueDateStr}</strong>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                    {dueDatePreview.countdownBadgeText}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PETUNJUK INPUT LANJUTAN */}
          <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] flex items-start gap-2.5 text-muted-foreground">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-foreground">Langkah Berikutnya Setelah Disimpan:</strong>
              <p className="mt-0.5">
                Kamar, fasilitas bersama (Dapur, Rooftop, Parkir), serta data provider internet (ISP Biznet/Telkom, CID, modem WAN) dapat langsung Anda tambahkan secara fleksibel di halaman manajemen gedung.
              </p>
            </div>
          </div>

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
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan & Buat Properti</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
