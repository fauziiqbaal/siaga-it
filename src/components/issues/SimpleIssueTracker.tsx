import React, { useState } from 'react';
import { ColivingIssue, Building, SimpleUser } from '../../types/hotel';
import { 
  CheckCircle2, 
  Plus, 
  X, 
  AlertTriangle, 
  Camera, 
  Wifi, 
  Video, 
  Tv, 
  KeyRound, 
  Clock, 
  UserCheck, 
  Maximize2, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { ResolveIssueModal } from './ResolveIssueModal';

interface SimpleIssueTrackerProps {
  issues: ColivingIssue[];
  buildingName: string;
  currentBuilding?: Building;
  currentUser?: SimpleUser;
  onToggleStatus: (issueId: string) => void;
  onResolveIssueWithProof?: (issueId: string, proofData: {
    resolutionNote: string;
    resolutionPhotoUrl?: string;
    resolutionTimestamp?: string;
    resolvedBy: string;
    recheckSpeedMbps?: number;
    recheckSignalDbm?: number;
    recheckNotes?: string;
  }) => void;
  onAddIssue: (issue: Omit<ColivingIssue, 'id' | 'createdAt' | 'status'>) => void;
}

export const SimpleIssueTracker: React.FC<SimpleIssueTrackerProps> = ({
  issues,
  buildingName,
  currentBuilding,
  currentUser,
  onToggleStatus,
  onResolveIssueWithProof,
  onAddIssue,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [location, setLocation] = useState('Kamar 101');
  const [category, setCategory] = useState<'INTERNET' | 'CCTV' | 'TV' | 'SMARTLOCK'>('INTERNET');
  const [issueText, setIssueText] = useState('');
  const [vendorNote, setVendorNote] = useState('Biznet');

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Re-QC & Resolution Modal State
  const [resolvingIssue, setResolvingIssue] = useState<ColivingIssue | null>(null);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<{ url: string; title: string; time?: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim()) return;

    onAddIssue({
      buildingId: currentBuilding?.id || 'current',
      location,
      category,
      issue: issueText.trim(),
      vendorNote: vendorNote.trim() || 'Internal IT',
    });
    setIssueText('');
    setIsAdding(false);
  };

  // Click Tandai Selesai Handler
  const handleStartResolve = (issue: ColivingIssue) => {
    setResolvingIssue(issue);
  };

  // Confirm Resolution from Modal
  const handleConfirmResolve = (proofData: {
    resolutionNote: string;
    resolutionPhotoUrl?: string;
    resolutionTimestamp?: string;
    resolvedBy: string;
    recheckSpeedMbps?: number;
    recheckSignalDbm?: number;
    recheckNotes?: string;
  }) => {
    if (!resolvingIssue) return;

    if (onResolveIssueWithProof) {
      onResolveIssueWithProof(resolvingIssue.id, proofData);
    } else {
      onToggleStatus(resolvingIssue.id);
    }

    setResolvingIssue(null);
  };

  // Re-open Issue Handler
  const handleReopen = (issueId: string) => {
    if (window.confirm('Buka kembali kendala ini ke status "Perlu Follow-up"?')) {
      onToggleStatus(issueId);
    }
  };

  // Counts
  const openCount = issues.filter(i => i.status === 'OPEN').length;
  const resolvedCount = issues.filter(i => i.status === 'RESOLVED').length;

  // Filtered Issues
  const filteredIssues = issues.filter(i => {
    if (statusFilter === 'OPEN' && i.status !== 'OPEN') return false;
    if (statusFilter === 'RESOLVED' && i.status !== 'RESOLVED') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLoc = i.location.toLowerCase().includes(q);
      const matchText = i.issue.toLowerCase().includes(q);
      const matchCat = i.category.toLowerCase().includes(q);
      const matchVendor = (i.vendorNote || '').toLowerCase().includes(q);
      return matchLoc || matchText || matchCat || matchVendor;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            5. Catatan Kendala & Tiket — {buildingName} ({openCount} Belum Selesai)
          </h2>
          <p className="text-xs text-muted-foreground">
            Daftar temuan kendala teknis saat QC yang perlu difollow-up dan diverifikasi Re-QC sebelum serah terima unit
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Masalah</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-foreground text-background shadow-2xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua ({issues.length})
          </button>
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === 'OPEN'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Perlu Follow-up</span>
            {openCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'OPEN' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                {openCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Selesai</span>
            {resolvedCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'RESOLVED' ? 'bg-white text-emerald-600' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}>
                {resolvedCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kamar, kendala, vendor..."
            className="w-full pl-8 pr-3 py-1 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Modal / Form Add */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-bold text-foreground text-sm">Catat Masalah Baru</span>
            <button type="button" onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground block mb-1">Lokasi (Kamar / Area)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Kamar 204 / Dapur Bersama"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
              >
                <option value="INTERNET">Internet & Wi-Fi</option>
                <option value="CCTV">CCTV & Keamanan</option>
                <option value="TV">Android TV / Cable TV</option>
                <option value="SMARTLOCK">Smartlock & Akses Pintu</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-muted-foreground block mb-1">Deskripsi Kendala</label>
            <input
              type="text"
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="Contoh: Wi-Fi di pojok meja drop / Adaptor CCTV lepas"
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-muted-foreground block mb-1">Vendor / PIC Tindak Lanjut</label>
            <input
              type="text"
              value={vendorNote}
              onChange={(e) => setVendorNote(e.target.value)}
              placeholder="Contoh: Biznet / Bardi / Teknisi Lokal / Internal IT"
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Simpan Masalah
            </button>
          </div>
        </form>
      )}

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.map((i) => {
          const isOpen = i.status === 'OPEN';
          const CategoryIcon = i.category === 'INTERNET' ? Wifi : i.category === 'CCTV' ? Video : i.category === 'TV' ? Tv : KeyRound;

          return (
            <div
              key={i.id}
              className={`p-3.5 sm:p-4 rounded-xl border bg-card transition-all ${
                isOpen 
                  ? 'border-rose-500/30 bg-rose-500/5 shadow-2xs' 
                  : 'border-emerald-500/30 bg-emerald-500/5'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                
                {/* Left Content Area */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  
                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono font-bold text-foreground text-xs sm:text-sm">
                      {i.location}
                    </span>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60 flex items-center gap-1">
                      <CategoryIcon className="w-3 h-3 text-blue-500 shrink-0" />
                      <span>{i.category}</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isOpen 
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30' 
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {isOpen ? 'Perlu Follow-up' : 'Selesai'}
                    </span>

                    {/* Re-QC Speedtest Badge if available */}
                    {!isOpen && i.recheckSpeedMbps && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        ⚡ Speed: {i.recheckSpeedMbps} Mbps
                      </span>
                    )}
                  </div>

                  {/* Problem Description */}
                  <p className="text-foreground font-medium text-xs sm:text-sm">
                    {i.issue}
                  </p>

                  {/* Meta / Reported Date */}
                  <p className="text-[11px] text-muted-foreground">
                    Vendor/Tindak lanjut: <strong className="text-foreground">{i.vendorNote}</strong> • Dilaporkan: {i.createdAt}
                  </p>

                  {/* ======================================================== */}
                  {/* HASIL RE-QC & BUKTI PERBAIKAN JIKA SUDAH SELESAI         */}
                  {/* ======================================================== */}
                  {!isOpen && (
                    <div className="mt-2.5 p-3 rounded-xl bg-card border border-emerald-500/30 space-y-2 text-xs">
                      
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Hasil Verifikasi Selesai & QC Ulang</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-blue-500" />
                          <span>Oleh: <strong className="text-foreground">{i.resolvedBy || 'Teknisi IT'}</strong> ({i.resolvedAt || i.resolutionTimestamp || 'Tervalidasi'})</span>
                        </div>
                      </div>

                      {/* Resolution Note */}
                      {i.resolutionNote && (
                        <p className="text-foreground text-[11px] bg-muted/30 p-2 rounded-lg border border-border/50">
                          <strong>Tindakan:</strong> {i.resolutionNote}
                        </p>
                      )}

                      {/* Re-QC Specific Metrics */}
                      {i.recheckNotes && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          QC Metrics: <span className="text-foreground font-semibold">{i.recheckNotes}</span>
                        </div>
                      )}

                      {/* Evidence Photo Preview */}
                      {i.resolutionPhotoUrl && (
                        <div className="pt-1 flex items-center gap-3">
                          <div 
                            onClick={() => setZoomPhotoUrl({ url: i.resolutionPhotoUrl!, title: `Bukti Re-QC: ${i.location}`, time: i.resolutionTimestamp })}
                            className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden border border-emerald-500/40 bg-black/50 cursor-pointer group shrink-0"
                          >
                            <img
                              src={i.resolutionPhotoUrl}
                              alt="Bukti Re-QC"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="w-3.5 h-3.5" />
                            </div>
                            <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/70 text-white font-mono text-[8px]">
                              BUKTI
                            </span>
                          </div>

                          <div className="text-[11px] space-y-0.5">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <Camera className="w-3 h-3 text-emerald-500" />
                              <span>Foto Bukti QC Ulang Terlampir</span>
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              {i.resolutionTimestamp || 'Waktu pengambilan tercatat di sistem'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setZoomPhotoUrl({ url: i.resolutionPhotoUrl!, title: `Bukti Re-QC: ${i.location}`, time: i.resolutionTimestamp })}
                              className="text-[10px] text-blue-500 hover:underline font-semibold cursor-pointer"
                            >
                              Lihat Foto Resolusi Tinggi
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* Right Action Buttons */}
                <div className="flex sm:flex-col items-center gap-2 shrink-0 self-end sm:self-start">
                  {isOpen ? (
                    <button
                      onClick={() => handleStartResolve(i)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tandai Selesai</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartResolve(i)}
                        className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Buka kembali form verifikasi untuk memperbarui bukti / catatan"
                      >
                        <ShieldCheck className="w-3 h-3 text-blue-500" />
                        <span>Edit Re-QC</span>
                      </button>

                      <button
                        onClick={() => handleReopen(i.id)}
                        className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Buka kembali kendala jika masalah kambuh"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Buka Kembali</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}

        {filteredIssues.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-medium text-foreground text-sm">
              {searchQuery
                ? 'Tidak ada kendala yang cocok dengan pencarian.'
                : statusFilter === 'OPEN'
                ? 'Semua kendala telah berhasil diselesaikan!'
                : 'Belum ada kendala di properti ini.'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {statusFilter === 'OPEN' ? 'Semua perangkat dan titik QC beroperasi normal.' : 'Gunakan tombol "+ Catat Masalah" untuk menambahkan temuan baru.'}
            </p>
          </div>
        )}
      </div>

      {/* RESOLVE & RE-QC MODAL */}
      {resolvingIssue && (
        <ResolveIssueModal
          isOpen={!!resolvingIssue}
          onClose={() => setResolvingIssue(null)}
          issue={resolvingIssue}
          buildingName={buildingName}
          currentBuilding={currentBuilding}
          currentUser={currentUser}
          onConfirm={handleConfirmResolve}
        />
      )}

      {/* ZOOM PHOTO FULLSCREEN MODAL */}
      {zoomPhotoUrl && (
        <div 
          onClick={() => setZoomPhotoUrl(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={zoomPhotoUrl.url}
              alt={zoomPhotoUrl.title}
              className="max-w-full max-h-[82vh] object-contain rounded-xl border border-white/20 shadow-2xl"
            />
            <div className="mt-3 px-3 py-1.5 rounded-full bg-zinc-900/90 text-white text-xs font-mono flex items-center gap-2 border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{zoomPhotoUrl.title} • {zoomPhotoUrl.time || 'Bukti Valid'}</span>
            </div>
            <button
              onClick={() => setZoomPhotoUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
