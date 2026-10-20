import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  Download, 
  Eye, 
  FileCheck, 
  Tv, 
  KeyRound, 
  Wifi, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

export interface EvidencePhotoItem {
  id: string;
  url: string;
  title: string;
  pillar: 'WIFI' | 'TV' | 'SMARTLOCK' | 'GENERAL';
  statusTag?: 'PASS' | 'FAIL' | 'SPEEDTEST' | 'RESOLVED' | 'INSPECTION';
  timestamp?: string;
  note?: string;
}

interface EvidenceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityTitle: string; // e.g. "Kamar 201" or "Communal Lounge & TV Bersama"
  photos: EvidencePhotoItem[];
}

export const EvidenceHistoryModal: React.FC<EvidenceHistoryModalProps> = ({
  isOpen,
  onClose,
  entityTitle,
  photos,
}) => {
  const [selectedPillar, setSelectedPillar] = useState<'ALL' | 'WIFI' | 'TV' | 'SMARTLOCK'>('ALL');
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredPhotos = selectedPillar === 'ALL' 
    ? photos 
    : photos.filter(p => p.pillar === selectedPillar);

  const wifiCount = photos.filter(p => p.pillar === 'WIFI').length;
  const tvCount = photos.filter(p => p.pillar === 'TV').length;
  const lockCount = photos.filter(p => p.pillar === 'SMARTLOCK').length;

  const handleDownload = (photo: EvidencePhotoItem) => {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = `${entityTitle.replace(/\s+/g, '_')}_${photo.pillar}_${photo.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  Histori Bukti Foto
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  {photos.length} Foto Tercatat
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entityTitle} • Arsip dokumentasi visual hasil Speedtest dan Inspeksi QC
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills if photos exist */}
        {photos.length > 0 && (
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setSelectedPillar('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedPillar === 'ALL'
                  ? 'bg-foreground text-background shadow-2xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              Semua ({photos.length})
            </button>
            {wifiCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPillar('WIFI')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  selectedPillar === 'WIFI'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Wifi className="w-3 h-3" />
                <span>Wi-Fi ({wifiCount})</span>
              </button>
            )}
            {tvCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPillar('TV')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  selectedPillar === 'TV'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Tv className="w-3 h-3" />
                <span>TV ({tvCount})</span>
              </button>
            )}
            {lockCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPillar('SMARTLOCK')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  selectedPillar === 'SMARTLOCK'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                <KeyRound className="w-3 h-3" />
                <span>Smartlock ({lockCount})</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-3">
          {filteredPhotos.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/15 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-6 h-6 opacity-60" />
              </div>
              <div className="max-w-sm">
                <h4 className="font-bold text-foreground text-sm">Belum Ada Histori Foto</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Belum ada dokumen foto yang tersimpan untuk <span className="font-semibold text-foreground">{entityTitle}</span>.
                  Foto bukti akan otomatis tercatat di sini saat Anda melakukan Speedtest atau saat Inspeksi QC TV & Smartlock.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPhotos.map((photo) => {
                const isWifi = photo.pillar === 'WIFI';
                const isTv = photo.pillar === 'TV';
                const isLock = photo.pillar === 'SMARTLOCK';

                return (
                  <div
                    key={photo.id}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/40 transition-all shadow-2xs flex flex-col"
                  >
                    {/* Image Preview with hover overlay */}
                    <div className="relative aspect-video bg-muted/50 overflow-hidden border-b border-border/60">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setZoomPhoto(photo.url)}
                          className="px-2.5 py-1.5 rounded-lg bg-background/90 text-foreground text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-background"
                          title="Lihat Layar Penuh"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>Zoom</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(photo)}
                          className="px-2.5 py-1.5 rounded-lg bg-background/90 text-foreground text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-background"
                          title="Download Foto"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Unduh</span>
                        </button>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-xs flex items-center gap-1 ${
                          isWifi 
                            ? 'bg-blue-600 text-white' 
                            : isTv 
                            ? 'bg-purple-600 text-white' 
                            : isLock 
                            ? 'bg-amber-600 text-white' 
                            : 'bg-zinc-700 text-white'
                        }`}>
                          {isWifi && <Wifi className="w-2.5 h-2.5" />}
                          {isTv && <Tv className="w-2.5 h-2.5" />}
                          {isLock && <KeyRound className="w-2.5 h-2.5" />}
                          <span>{photo.pillar}</span>
                        </span>

                        {photo.statusTag && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shadow-xs ${
                            photo.statusTag === 'SPEEDTEST'
                              ? 'bg-emerald-600/90 text-white'
                              : photo.statusTag === 'RESOLVED' || photo.statusTag === 'PASS'
                              ? 'bg-emerald-600/90 text-white'
                              : photo.statusTag === 'FAIL'
                              ? 'bg-rose-600/90 text-white'
                              : 'bg-muted text-foreground'
                          }`}>
                            {photo.statusTag}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Photo Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between gap-1.5 text-xs">
                      <div>
                        <span className="font-bold text-foreground block truncate" title={photo.title}>
                          {photo.title}
                        </span>
                        {photo.note && (
                          <span className="text-[11px] text-muted-foreground block line-clamp-2 mt-0.5">
                            {photo.note}
                          </span>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{photo.timestamp || 'Terekam saat inspeksi'}</span>
                        <button
                          type="button"
                          onClick={() => setZoomPhoto(photo.url)}
                          className="text-blue-500 hover:underline flex items-center gap-0.5 font-sans font-semibold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Buka</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground italic hidden sm:block">
            * Foto bukti terekam otomatis saat Anda melakukan Speedtest & Inspeksi QC
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Fullscreen Zoom Modal */}
      {zoomPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setZoomPhoto(null)}
        >
          <button
            onClick={() => setZoomPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomPhoto}
            alt="Zoom Bukti"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
