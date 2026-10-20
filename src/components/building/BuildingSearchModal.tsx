import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Building, SimpleUser } from '../../types/hotel';
import { 
  Search, 
  Building2, 
  MapPin, 
  Wifi, 
  Calendar, 
  Check, 
  Plus, 
  X, 
  Layers, 
  DoorClosed,
  ArrowRight,
  Sparkles,
  Trash2
} from 'lucide-react';

interface BuildingSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings: Building[];
  currentBuildingId: string;
  currentUser?: SimpleUser;
  onSelectBuilding: (building: Building) => void;
  onOpenNewBuilding: () => void;
  onRequestDeleteBuilding?: (building: Building) => void;
}

export const BuildingSearchModal: React.FC<BuildingSearchModalProps> = ({
  isOpen,
  onClose,
  buildings,
  currentBuildingId,
  currentUser,
  onSelectBuilding,
  onOpenNewBuilding,
  onRequestDeleteBuilding,
}) => {
  const [query, setQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setSelectedArea('ALL');
    }
  }, [isOpen]);

  // Extract distinct areas or cities if any
  const areas = useMemo(() => {
    const list = new Set<string>();
    buildings.forEach(b => {
      const parts = b.address.split(',');
      if (parts.length > 1) {
        const city = parts[parts.length - 1].trim();
        if (city) list.add(city);
      }
    });
    return Array.from(list);
  }, [buildings]);

  // Filtered buildings
  const filteredBuildings = useMemo(() => {
    const q = query.toLowerCase().trim();
    return buildings.filter(b => {
      if (selectedArea !== 'ALL' && !b.address.toLowerCase().includes(selectedArea.toLowerCase())) {
        return false;
      }
      if (!q) return true;
      const matchName = b.name.toLowerCase().includes(q);
      const matchAddress = b.address.toLowerCase().includes(q);
      const matchIsp = b.ispProvider.toLowerCase().includes(q) || 
        (b.internetConnections && b.internetConnections.some(ic => 
          ic.ispName.toLowerCase().includes(q) || 
          ic.customerNumber.toLowerCase().includes(q) ||
          (ic.ipPublic && ic.ipPublic.toLowerCase().includes(q))
        ));
      return matchName || matchAddress || Boolean(matchIsp);
    });
  }, [buildings, query, selectedArea]);

  if (!isOpen) return null;

  const handleSelect = (b: Building) => {
    onSelectBuilding(b);
    onClose();
  };

  const handleAddNew = () => {
    onClose();
    onOpenNewBuilding();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-12 sm:pt-20 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header & Search Input Box */}
        <div className="p-4 sm:p-5 border-b border-border bg-card">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                  Pilih Gedung / Unit Coliving
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Tersedia {buildings.length} properti terdaftar dalam sistem Siaga IT
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Large Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama properti, jalan, area (contoh: Tomang, Benhil, Kemang, BSD)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Area Filter Tags */}
          {areas.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 text-xs scrollbar-none">
              <span className="text-[11px] text-muted-foreground mr-1 shrink-0">Wilayah:</span>
              <button
                onClick={() => setSelectedArea('ALL')}
                className={`px-2 py-0.5 rounded-md text-[11px] transition-colors shrink-0 ${
                  selectedArea === 'ALL'
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted border border-border'
                }`}
              >
                Semua ({buildings.length})
              </button>
              {areas.map(area => (
                <button
                  key={area}
                  onClick={() => setSelectedArea(area)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors shrink-0 ${
                    selectedArea === area
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-muted border border-border'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Building List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y-0">
          {filteredBuildings.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                <Search className="w-6 h-6 opacity-40" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  Tidak ditemukan properti untuk &ldquo;{query}&rdquo;
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pastikan ejaan benar atau daftarkan building baru jika ini unit onboarding terbaru.
                </p>
              </div>

              <button
                onClick={handleAddNew}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Unit &ldquo;{query || 'Baru'}&rdquo; Sekarang</span>
              </button>
            </div>
          ) : (
            filteredBuildings.map((b) => {
              const isActive = b.id === currentBuildingId;
              const totalRooms = b.floors.reduce((acc, f) => acc + f.rooms.length, 0);
              const totalDevices = b.devices?.length || 0;

              return (
                <div
                  key={b.id}
                  onClick={() => handleSelect(b)}
                  className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isActive
                      ? 'border-blue-500/60 bg-blue-500/5 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-border bg-card/60 hover:bg-muted/40 hover:border-border/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {b.name}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1">
                          <Check className="w-3 h-3" /> Sedang Aktif
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate max-w-md">{b.address}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <DoorClosed className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <strong className="text-foreground">{totalRooms}</strong> Kamar
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <strong className="text-foreground">{b.floors.length}</strong> Lantai
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-foreground truncate max-w-[150px]">{b.ispProvider}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Live: {b.openingDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {onRequestDeleteBuilding && (currentUser?.role === 'ADMIN' || currentUser?.role === 'BACKOFFICE') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDeleteBuilding(b);
                          onClose();
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                        title={`Hapus properti ${b.name} (Khusus Role Admin / Backoffice)`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {isActive ? (
                      <span className="text-[11px] font-semibold text-blue-500 px-2 py-1 rounded bg-blue-500/10">
                        Aktif Sekarang
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelect(b); }}
                        className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-primary hover:text-primary-foreground font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Pilih Gedung</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar: Quick Add Building & Close */}
        <div className="p-3 sm:p-4 border-t border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="text-[11px] text-muted-foreground">
            💡 Siklus pembukaan tiap 15 hari: Daftarkan unit baru untuk checklist QC
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              Tutup (Esc)
            </button>
            <button
              onClick={handleAddNew}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Unit Baru</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
