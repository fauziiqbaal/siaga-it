import React, { useState, useMemo } from 'react';
import { Building, ColivingIssue, SimpleUser } from '../../types/hotel';
import { calculateBuildingReadiness, BuildingReadinessResult } from '../../utils/readinessCalculator';
import { 
  getBuildingDueDateInfo, 
  ITDueDateInfo, 
  REFERENCE_DATE,
  parseIndonesianDate,
  getDaysRemaining
} from '../../utils/dateUtils';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Wifi, 
  Video, 
  Lock, 
  Tv, 
  ArrowRight, 
  Building2, 
  Server, 
  Search, 
  Filter, 
  Sparkles, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileText,
  UserCheck,
  Tag,
  Info
} from 'lucide-react';

interface LiveDashboardViewProps {
  buildings: Building[];
  issues: ColivingIssue[];
  currentUser: SimpleUser;
  onSelectBuilding: (building: Building) => void;
  onNavigateTab: (tab: string, buildingId?: string) => void;
  onUpdateIssue?: (issueId: string, newStatus: 'OPEN' | 'RESOLVED') => void;
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return dateStr.trim().replace(/\s+\d{4}$/, '');
}

export const LiveDashboardView: React.FC<LiveDashboardViewProps> = ({
  buildings,
  issues,
  currentUser,
  onSelectBuilding,
  onNavigateTab,
  onUpdateIssue,
}) => {
  const [filterMode, setFilterMode] = useState<'30_DAYS' | 'ALL'>('30_DAYS');
  const [searchQuery, setSearchQuery] = useState('');

  // Enhanced buildings with parsed dates, days remaining, readiness calculation, and H-3 IT Due Date
  const enrichedBuildings = useMemo(() => {
    return buildings.map(b => {
      const liveDateObj = parseIndonesianDate(b.openingDate) || new Date(2026, 10, 1);
      const daysRemaining = getDaysRemaining(liveDateObj, REFERENCE_DATE);
      const readiness = calculateBuildingReadiness(b);
      const dueInfo = getBuildingDueDateInfo(b, REFERENCE_DATE);
      const buildingIssues = issues.filter(iss => iss.buildingId === b.id && iss.status === 'OPEN');
      const latestVisit = (b.inspectionVisits && b.inspectionVisits.length > 0)
        ? b.inspectionVisits[b.inspectionVisits.length - 1]
        : null;

      const isWithin30Days = daysRemaining >= 0 && daysRemaining <= 30;

      return {
        ...b,
        liveDateObj,
        daysRemaining,
        readiness,
        dueInfo,
        buildingIssues,
        latestVisit,
        isWithin30Days,
      };
    });
  }, [buildings, issues]);

  // Filtered buildings sorted by nearest live date or presale date!
  const displayedBuildings = useMemo(() => {
    return enrichedBuildings.filter(b => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchAddress = b.address.toLowerCase().includes(q);
        const matchIsp = b.ispProvider.toLowerCase().includes(q);
        const matchPresale = b.presaleDate && b.presaleDate.toLowerCase().includes(q);
        if (!matchName && !matchAddress && !matchIsp && !matchPresale) return false;
      }

      // Filter: 30 days vs All
      if (filterMode === '30_DAYS') return b.isWithin30Days;
      return true; // 'ALL'
    }).sort((a, b) => {
      // Sort by earliest target date (Pre-Sale date if available, otherwise Live date)
      return a.dueInfo.benchmarkDateObj.getTime() - b.dueInfo.benchmarkDateObj.getTime();
    });
  }, [enrichedBuildings, filterMode, searchQuery]);

  // Executive summary statistics
  const stats = useMemo(() => {
    const liveWithin30 = enrichedBuildings.filter(b => b.isWithin30Days);
    const avgScore = liveWithin30.length > 0
      ? Math.round(liveWithin30.reduce((acc, b) => acc + b.readiness.overallScore, 0) / liveWithin30.length)
      : 0;

    const totalConns = liveWithin30.flatMap(b => b.internetConnections || []);
    const takeoverDone = totalConns.filter(c => c.isBillingTakeover || c.billingTakeoverStatus === 'SUDAH_TAKEOVER').length;

    const openBlockers = liveWithin30.flatMap(b => b.buildingIssues).length;
    const totalRooms = liveWithin30.reduce((acc, b) => acc + b.floors.flatMap(f => f.rooms).length, 0);

    return {
      count30Days: liveWithin30.length,
      avgScore,
      takeoverRatio: { done: takeoverDone, total: totalConns.length },
      openBlockers,
      totalRooms,
    };
  }, [enrichedBuildings]);

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* 1. Header Banner & Executive Context */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Pipeline Pembukaan Gedung 30 Hari
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Ref: 19 Okt 2026 • Monitoring Kesiapan Live
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Dashboard Kesiapan IT & Jadwal Live
              </h1>
              <span 
                title="Pemantauan 4 pilar IT operasional siklus opening. Due date IT jatuh pada H-3 Pre-Sale (jika ada) atau H-3 Live Date."
                className="cursor-help text-muted-foreground hover:text-foreground inline-flex"
              >
                <Info className="w-4 h-4 opacity-60 hover:opacity-100" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Monitoring 4 pilar teknis operasional untuk properti live siklus 30 hari ke depan
            </p>
          </div>

          {/* Quick cycle countdown highlight */}
          <div className="flex items-center gap-3 bg-muted/40 border border-border/80 rounded-xl p-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">Pembukaan Terdekat:</div>
              <div className="text-sm sm:text-base font-bold text-foreground">
                01 Nov 2026 <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">(H-13)</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Target Terdekat: 24 Okt (Tomang H-3 Pre-Sale)
              </div>
            </div>
          </div>
        </div>

        {/* 2. Executive KPI Cards (Grid 4 Columns) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4 sm:mt-5 pt-4 border-t border-border/60">
          
          {/* Card 1: Live dalam 30 Hari */}
          <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium">Live dlm 30 Hari</span>
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {stats.count30Days} <span className="text-xs font-normal text-muted-foreground">Gedung</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {stats.totalRooms} Kamar terdaftar
            </div>
          </div>

          {/* Card 2: Rata-rata Skor Kesiapan */}
          <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium">Rata-rata Skor IT</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {stats.avgScore}%
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.avgScore >= 85 ? '🟢 Siap Live Standar Rukita' : '🟡 Masih Proses Konfigurasi'}
            </div>
          </div>

          {/* Card 3: ISP Takeover */}
          <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium">Takeover Billing ISP</span>
              <Wifi className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight font-mono">
              {stats.takeoverRatio.done}/{stats.takeoverRatio.total}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              ke it.billing@rukita.co
            </div>
          </div>

          {/* Card 4: Open Issues / Blockers */}
          <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium">Kendala / Snag IT</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {stats.openBlockers} <span className="text-xs font-normal text-muted-foreground">Isu Open</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.openBlockers === 0 ? 'Semua tiket terselesaikan' : 'Perlu atensi teknisi vendor'}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Interactive Filters (Clean: 30 Hari vs Semua Properti) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-2.5 sm:p-3 rounded-xl">
        
        {/* Clean Filter Tabs */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilterMode('30_DAYS')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              filterMode === '30_DAYS'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>Upcoming 30 Hari</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              filterMode === '30_DAYS' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {stats.count30Days}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>Semua Properti</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              filterMode === 'ALL' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {enrichedBuildings.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-72">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari properti / lokasi / ISP..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

      </div>

      {/* 4. Building Cards Grid */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Daftar Properti Menjelang Live ({displayedBuildings.length} Gedung)
            </h2>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Urut berdasarkan tanggal target terdekat
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lihat Kalender Lengkap</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {displayedBuildings.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-card border border-border space-y-2">
            <Building2 className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Tidak ada gedung yang cocok dengan filter</p>
            <p className="text-xs text-muted-foreground">Coba ubah kata kunci pencarian atau ganti filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedBuildings.map((building) => {
              const r = building.readiness;
              const isLiveReady = r.overallScore >= 85;
              const openIssues = building.buildingIssues;

              return (
                <div
                  key={building.id}
                  className="rounded-xl bg-card border border-border p-4 sm:p-5 shadow-xs hover:border-border/90 transition-all flex flex-col justify-between gap-4 group"
                >
                  {/* Card Header & Information */}
                  <div className="space-y-2.5">
                    {/* Baris Atas: Nama Gedung & Alamat di kiri, Skor Kesiapan di kanan (Selalu Sejajar) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug group-hover:text-blue-500 transition-colors">
                          {building.name}
                        </h3>

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate">{building.address}</span>
                        </p>
                      </div>

                      {/* Overall Readiness Score Badge */}
                      <div className="text-right shrink-0">
                        <div className={`text-2xl font-black font-mono tracking-tight leading-none ${
                          isLiveReady
                            ? 'text-emerald-500'
                            : r.overallScore >= 75
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }`}>
                          {r.overallScore}%
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                          isLiveReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {isLiveReady ? 'Siap Live' : r.overallScore >= 75 ? 'Catatan Minor' : 'Perlu Perbaikan'}
                        </div>
                      </div>
                    </div>

                    {/* Target Schedule Dates: Simple, Compact & Balanced */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono">
                        Live: {formatShortDate(building.openingDate)}
                      </span>

                      {building.presaleDate && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          <span>Pre-Sale: {formatShortDate(building.presaleDate)}</span>
                        </span>
                      )}

                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        building.dueInfo.isOverdue
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                          : building.dueInfo.isDueSoon
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}>
                        <span>Due IT: {formatShortDate(building.dueInfo.itDueDateStr)}</span>
                        <span className="opacity-80">
                          ({building.dueInfo.daysUntilDueDate < 0 
                            ? `Lewat ${Math.abs(building.dueInfo.daysUntilDueDate)} Hari` 
                            : building.dueInfo.daysUntilDueDate === 0 
                            ? 'Hari Ini' 
                            : `T-${building.dueInfo.daysUntilDueDate} Hari`})
                        </span>
                      </span>
                    </div>

                    {/* Clean Progress Bar Section */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium text-[11px]">Progres Kesiapan IT</span>
                        <span className="font-mono font-bold text-foreground text-xs">{r.overallScore}% Selesai</span>
                      </div>
                      <div className="w-full bg-muted/70 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isLiveReady ? 'bg-emerald-500' : r.overallScore >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${r.overallScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Issues / Blocker Info */}
                    {openIssues.length > 0 ? (
                      <div className="p-2.5 rounded-lg bg-rose-500/[0.08] border border-rose-500/30 flex items-start gap-2.5 text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="font-bold text-rose-700 dark:text-rose-400 text-xs">
                              {openIssues.length} Kendala Terbuka
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono">
                              BLOCKER
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px] truncate">
                            {openIssues[0].location}: {openIssues[0].issue}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-medium text-[11px]">Tidak ada kendala aktif (Sistem siap operasional)</span>
                      </div>
                    )}
                  </div>

                  {/* Single Clean Action Button -> View Details to Laporan Kesiapan Live */}
                  <div className="pt-2 border-t border-border/50">
                    <button
                      onClick={() => {
                        onSelectBuilding(building);
                        onNavigateTab('readiness', building.id);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs group cursor-pointer"
                    >
                      <span>Lihat Detail Kesiapan Live</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rukita Opening SOP Standards Guideline Footer */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Standar Siklus Live Rukita:</strong> Go-Live jatuh pada tanggal 1 dan 15. H-14 instalasi hardware, H-7 penyeragaman SSID & audit CCTV, H-2 sign-off berita acara live IT.
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground/80 shrink-0">
          Siaga IT Ops • VibeCode 2026
        </span>
      </div>

    </div>
  );
};
