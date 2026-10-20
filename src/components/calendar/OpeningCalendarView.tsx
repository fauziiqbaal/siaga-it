import React, { useState, useMemo } from 'react';
import { Building, InspectionVisit, VisitType } from '../../types/hotel';
import { getBuildingDueDateInfo } from '../../utils/dateUtils';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  UserCheck, 
  Building2, 
  Plus, 
  X, 
  Check, 
  Award, 
  CheckSquare, 
  AlertCircle, 
  Filter, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  MapPin,
  Tag
} from 'lucide-react';

interface OpeningCalendarViewProps {
  buildings: Building[];
  currentBuilding: Building;
  onSelectBuilding: (building: Building) => void;
  onNavigateTab: (tab: string, buildingId?: string) => void;
  onUpdateBuilding: (updatedBuilding: Building) => void;
}

interface CalendarLiveEvent {
  id: string;
  type: 'LIVE_DATE';
  building: Building;
  dateStr: string;
  dateObj: Date;
}

interface CalendarPresaleEvent {
  id: string;
  type: 'PRE_SALE';
  building: Building;
  dateStr: string;
  dateObj: Date;
}

interface CalendarDueDateEvent {
  id: string;
  type: 'DUE_DATE_IT';
  building: Building;
  dateStr: string;
  dateObj: Date;
  benchmarkType: 'PRE_SALE' | 'LIVE_DATE';
  benchmarkDateStr: string;
}

interface CalendarVisitEvent {
  id: string;
  type: 'QC_VISIT';
  building: Building;
  visit: InspectionVisit;
  dateStr: string;
  dateObj: Date;
}

type CalendarEvent = CalendarLiveEvent | CalendarPresaleEvent | CalendarDueDateEvent | CalendarVisitEvent;

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_MAP_ID: Record<string, number> = {
  'jan': 0, 'januari': 0,
  'feb': 1, 'februari': 1,
  'mar': 2, 'maret': 2,
  'apr': 3, 'april': 3,
  'mei': 4,
  'jun': 5, 'juni': 5,
  'jul': 6, 'juli': 6,
  'agu': 7, 'agt': 7, 'agustus': 7,
  'sep': 8, 'september': 8,
  'okt': 9, 'oktober': 9,
  'nov': 10, 'november': 10,
  'des': 11, 'desember': 11,
};

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // "19 Okt 2026" or "05 Nov 2026"
  const parts = str.split(/[\s-]+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const month = MONTH_MAP_ID[mStr] ?? MONTH_MAP_ID[parts[1].toLowerCase()];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const OpeningCalendarView: React.FC<OpeningCalendarViewProps> = ({
  buildings,
  currentBuilding,
  onSelectBuilding,
  onNavigateTab,
  onUpdateBuilding,
}) => {
  // Current viewed month & year (Default to October 2026)
  const [currentDate, setCurrentDate] = useState(() => {
    // Current application mock time is October 2026
    return new Date(2026, 9, 19);
  });

  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState<'ALL' | 'LIVE_ONLY' | 'PRESALE_ONLY' | 'DUE_DATE_ONLY' | 'VISIT_ONLY'>('ALL');

  // Pop-out Modal Details State
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);

  // Quick Schedule Form State in Popout
  const [isSchedulingVisit, setIsSchedulingVisit] = useState(false);
  const [schedBuildingId, setSchedBuildingId] = useState(currentBuilding.id);
  const [schedTime, setSchedTime] = useState('14:00 WIB');
  const [schedInspector, setSchedInspector] = useState('Budi Pratama (IT Lead)');
  const [schedRole, setSchedRole] = useState('IT Lead');
  const [schedType, setSchedType] = useState<VisitType>('QC_PROGRESS');
  const [schedNotes, setSchedNotes] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Next / Previous month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date(2026, 9, 19);
    setCurrentDate(today);
    handleOpenDay(formatDateKey(today));
  };

  // Compile all events across all buildings (or filtered building)
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    const targetBuildings = selectedBuildingFilter === 'ALL'
      ? buildings
      : buildings.filter(b => b.id === selectedBuildingFilter);

    targetBuildings.forEach(b => {
      // 1. Target Live Date Event
      const liveDate = parseDate(b.openingDate);
      if (liveDate) {
        events.push({
          id: `live-${b.id}-${formatDateKey(liveDate)}`,
          type: 'LIVE_DATE',
          building: b,
          dateStr: b.openingDate,
          dateObj: liveDate,
        });
      }

      // 2. Pre-Sale Date Event (if any)
      if (b.presaleDate) {
        const presaleDate = parseDate(b.presaleDate);
        if (presaleDate) {
          events.push({
            id: `presale-${b.id}-${formatDateKey(presaleDate)}`,
            type: 'PRE_SALE',
            building: b,
            dateStr: b.presaleDate,
            dateObj: presaleDate,
          });
        }
      }

      // 3. Batas Akhir Kesiapan IT Ops (H-3 Pre-sale jika ada, atau H-3 Live Date)
      const dueInfo = getBuildingDueDateInfo(b);
      events.push({
        id: `due-${b.id}-${formatDateKey(dueInfo.itDueDateObj)}`,
        type: 'DUE_DATE_IT',
        building: b,
        dateStr: dueInfo.itDueDateStr,
        dateObj: dueInfo.itDueDateObj,
        benchmarkType: dueInfo.benchmarkType,
        benchmarkDateStr: dueInfo.benchmarkDateStr,
      });

      // 4. Inspection Visits Events
      (b.inspectionVisits || []).forEach(v => {
        const vDate = parseDate(v.visitDate);
        if (vDate) {
          events.push({
            id: `vis-${b.id}-${v.id}`,
            type: 'QC_VISIT',
            building: b,
            visit: v,
            dateStr: v.visitDate,
            dateObj: vDate,
          });
        }
      });
    });

    return events;
  }, [buildings, selectedBuildingFilter]);

  // Group events by day key 'YYYY-MM-DD'
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    allEvents.forEach(evt => {
      // Apply event type filter
      if (eventTypeFilter === 'LIVE_ONLY' && evt.type !== 'LIVE_DATE') return;
      if (eventTypeFilter === 'PRESALE_ONLY' && evt.type !== 'PRE_SALE') return;
      if (eventTypeFilter === 'DUE_DATE_ONLY' && evt.type !== 'DUE_DATE_IT') return;
      if (eventTypeFilter === 'VISIT_ONLY' && evt.type !== 'QC_VISIT') return;

      const key = formatDateKey(evt.dateObj);
      const existing = map.get(key) || [];
      existing.push(evt);
      map.set(key, existing);
    });
    return map;
  }, [allEvents, eventTypeFilter]);

  // Generate calendar grid cells (Monday-first)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // 0 = Sun, 1 = Mon, ..., 6 = Sat
    // Convert to Monday = 0, ..., Sunday = 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const cells: {
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
      dateKey: string;
      isToday: boolean;
    }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      cells.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        dateKey: formatDateKey(d),
        isToday: formatDateKey(d) === '2026-10-19',
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({
        date: d,
        dayNum: day,
        isCurrentMonth: true,
        dateKey: formatDateKey(d),
        isToday: formatDateKey(d) === '2026-10-19',
      });
    }

    // Next month padding to fill complete rows of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      cells.push({
        date: d,
        dayNum: day,
        isCurrentMonth: false,
        dateKey: formatDateKey(d),
        isToday: formatDateKey(d) === '2026-10-19',
      });
    }

    return cells;
  }, [year, month]);

  // Open Popout details modal
  const handleOpenDay = (dateKey: string) => {
    setSelectedDayKey(dateKey);
    setIsPopoutOpen(true);
    setIsSchedulingVisit(false);
  };

  // Selected Day Details for the Popout
  const selectedDayEvents = useMemo(() => {
    if (!selectedDayKey) return [];
    return eventsByDay.get(selectedDayKey) || [];
  }, [selectedDayKey, eventsByDay]);

  const selectedDayDateObj = useMemo(() => {
    if (!selectedDayKey) return new Date();
    const [y, m, d] = selectedDayKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDayKey]);

  // Handle Save New Visit from the Popout
  const handleSaveScheduledVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayKey || !schedInspector.trim()) return;

    const targetBld = buildings.find(b => b.id === schedBuildingId);
    if (!targetBld) return;

    const formattedVisitDate = `${selectedDayDateObj.getDate()} ${MONTH_NAMES_ID[selectedDayDateObj.getMonth()].slice(0, 3)} ${selectedDayDateObj.getFullYear()}`;

    const newVisitObj: InspectionVisit = {
      id: `vis-sched-${Date.now()}`,
      buildingId: targetBld.id,
      visitNumber: (targetBld.inspectionVisits?.length || 0) + 1,
      visitDate: formattedVisitDate,
      visitTime: schedTime.trim(),
      inspectorName: schedInspector.trim(),
      inspectorRole: schedRole.trim(),
      visitType: schedType,
      readinessScoreSnapshot: 90,
      summaryNote: schedNotes.trim() || `Jadwal kunjungan QC lapangan tanggal ${formattedVisitDate}`,
      statusRecommendation: 'GO_LIVE',
      createdAt: new Date().toISOString(),
    };

    const updatedVisits = [...(targetBld.inspectionVisits || []), newVisitObj];

    onUpdateBuilding({
      ...targetBld,
      inspectionVisits: updatedVisits,
    });

    setIsSchedulingVisit(false);
    setSchedNotes('');
  };

  // Monthly Quick Summary Statistics
  const monthLiveCount = useMemo(() => {
    return allEvents.filter(e => 
      e.type === 'LIVE_DATE' && 
      e.dateObj.getFullYear() === year && 
      e.dateObj.getMonth() === month
    ).length;
  }, [allEvents, year, month]);

  const monthVisitCount = useMemo(() => {
    return allEvents.filter(e => 
      e.type === 'QC_VISIT' && 
      e.dateObj.getFullYear() === year && 
      e.dateObj.getMonth() === month
    ).length;
  }, [allEvents, year, month]);

  return (
    <div className="space-y-4">

      {/* Header Bar: Title & Navigation */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Kalender Go-Live & Jadwal Visit QC Lapangan
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pelacakan visual aktual tanggal pembukaan gedung baru dan jadwal inspeksi lapangan para teknisi
          </p>
        </div>

        {/* Month Navigation & Today Jump */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={handleGoToday}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-colors shadow-xs"
            title="Lompat ke tanggal hari ini (19 Okt 2026)"
          >
            Hari Ini
          </button>

          <div className="flex items-center border border-border rounded-lg bg-background shadow-xs overflow-hidden">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-xs sm:text-sm px-3 py-1 font-mono text-foreground min-w-[130px] text-center select-none">
              {MONTH_NAMES_ID[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Strip & Statistics */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        
        {/* Left: Building & Event Type Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">Filter Gedung:</span>
            <select
              value={selectedBuildingFilter}
              onChange={(e) => setSelectedBuildingFilter(e.target.value)}
              className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs font-semibold outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Properti ({buildings.length} Gedung)</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 flex-wrap">
            <button
              onClick={() => setEventTypeFilter('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                eventTypeFilter === 'ALL' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua Agenda
            </button>
            <button
              onClick={() => setEventTypeFilter('LIVE_ONLY')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                eventTypeFilter === 'LIVE_ONLY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>🎯 Go-Live</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('PRESALE_ONLY')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                eventTypeFilter === 'PRESALE_ONLY' ? 'bg-amber-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>🏷️ Pre-Sale</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('DUE_DATE_ONLY')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                eventTypeFilter === 'DUE_DATE_ONLY' ? 'bg-rose-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>⏳ Due IT (H-3)</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('VISIT_ONLY')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                eventTypeFilter === 'VISIT_ONLY' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>👷 Visit QC</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Legend & Stats */}
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Target Live</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Pre-Sale</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Due IT (H-3)</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Visit QC</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hidden sm:inline">
            💡 Klik tanggal untuk buka detail pop-out
          </span>
        </div>
      </div>

      {/* Main Interactive Calendar Grid */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center font-bold text-xs text-foreground">
          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d, idx) => (
            <div key={d} className={`py-2.5 border-r border-border/50 last:border-r-0 ${idx >= 5 ? 'text-rose-500/80 dark:text-rose-400/80' : ''}`}>
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* 7-Columns Day Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-y divide-border/60">
          {calendarCells.map((cell, idx) => {
            const dayEvents = eventsByDay.get(cell.dateKey) || [];
            const liveEvents = dayEvents.filter(e => e.type === 'LIVE_DATE');
            const presaleEvents = dayEvents.filter(e => e.type === 'PRE_SALE');
            const dueEvents = dayEvents.filter(e => e.type === 'DUE_DATE_IT');
            const visitEvents = dayEvents.filter(e => e.type === 'QC_VISIT');

            return (
              <div
                key={cell.dateKey}
                onClick={() => handleOpenDay(cell.dateKey)}
                className={`min-h-[92px] sm:min-h-[115px] p-1.5 sm:p-2 border-r border-border/60 last:border-r-0 transition-all cursor-pointer relative group flex flex-col justify-between ${
                  !cell.isCurrentMonth
                    ? 'bg-muted/10 text-muted-foreground/40 hover:bg-muted/30'
                    : cell.isToday
                    ? 'bg-blue-500/[0.04] hover:bg-blue-500/[0.08]'
                    : 'bg-card hover:bg-muted/30'
                }`}
              >
                {/* Top: Day Number & Today Marker */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
                    cell.isToday
                      ? 'bg-blue-600 text-white shadow-xs'
                      : !cell.isCurrentMonth
                      ? 'text-muted-foreground/40'
                      : 'text-foreground'
                  }`}>
                    {cell.dayNum}
                  </span>

                  {cell.isToday && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono hidden sm:inline">
                      Hari Ini
                    </span>
                  )}
                </div>

                {/* Center / Body: Event Chips */}
                <div className="space-y-1 my-1 overflow-hidden">
                  
                  {/* 1. Target Live Date Badge */}
                  {liveEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-2xs group-hover:border-emerald-500"
                      title={`Target Go-Live: ${evt.building.name}`}
                    >
                      <span className="shrink-0">🎯</span>
                      <span className="truncate">{evt.building.name.replace(/Rukita\s*/i, '')}</span>
                    </div>
                  ))}

                  {/* 2. Pre-Sale Date Badge */}
                  {presaleEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-2xs group-hover:border-amber-500"
                      title={`Pre-Sale Opening: ${evt.building.name}`}
                    >
                      <span className="shrink-0">🏷️</span>
                      <span className="truncate">Pre-Sale: {evt.building.name.replace(/Rukita\s*/i, '')}</span>
                    </div>
                  ))}

                  {/* 3. Due Date IT Ops (H-3) Badge */}
                  {dueEvents.map((evt) => {
                    const dueEvt = evt as CalendarDueDateEvent;
                    return (
                      <div
                        key={evt.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1 shadow-2xs group-hover:border-rose-500"
                        title={`Batas Akhir IT (H-3 ${dueEvt.benchmarkType === 'PRE_SALE' ? 'Pre-Sale' : 'Live'}): ${evt.building.name}`}
                      >
                        <span className="shrink-0">⏳</span>
                        <span className="truncate">Due IT: {evt.building.name.replace(/Rukita\s*/i, '')}</span>
                      </div>
                    );
                  })}

                  {/* 4. Inspection Visit Badges */}
                  {visitEvents.slice(0, Math.max(1, 3 - (liveEvents.length + presaleEvents.length + dueEvents.length))).map((evt) => {
                    const visitEvt = evt as CalendarVisitEvent;
                    const visit = visitEvt.visit;
                    const isFinal = visit.visitType === 'FINAL_AUDIT_SIGN_OFF';
                    const isConfig = visit.visitType === 'INSTALASI_CONFIG';
                    const vTime = visit.visitTime;
                    const timeLabel = vTime ? vTime.replace(/WIB/i, '').trim() : `V#${visit.visitNumber}`;
                    const techFirstName = visit.inspectorName ? visit.inspectorName.split(' ')[0] : 'Teknisi';
                    
                    return (
                      <div
                        key={evt.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 shadow-2xs border ${
                          isFinal
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                            : isConfig
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                        }`}
                        title={`Visit #${visit.visitNumber}: ${visit.inspectorName} (${evt.building.name})`}
                      >
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">
                          {timeLabel} • {techFirstName}
                        </span>
                      </div>
                    );
                  })}

                  {/* Extra events count indicator */}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] font-mono font-bold text-muted-foreground block text-center truncate bg-muted/40 rounded px-1">
                      +{dayEvents.length - 3} agenda lagi
                    </span>
                  )}
                </div>

                {/* Bottom hint / Quick indicator */}
                <div className="text-[9px] text-muted-foreground/60 text-right font-mono">
                  {dayEvents.length > 0 ? (
                    <span className="text-blue-500 font-bold">{dayEvents.length} agenda</span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">+ Catat</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POP-OUT INFO DETAIL MODAL */}
      {isPopoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            
            {/* Pop-out Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-sm sm:text-base">
                      {selectedDayDateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>
                    {selectedDayKey === '2026-10-19' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-600 text-white font-mono">
                        HARI INI
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedDayEvents.length === 0 
                      ? 'Tidak ada agenda terdaftar pada tanggal ini' 
                      : `${selectedDayEvents.length} Agenda Terdaftar (Live Date & Visit QC)`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPopoutOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Tutup pop-out"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pop-out Body: Scrollable Details */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              
              {/* SECTION 1: TARGET GO-LIVE GEDUNG */}
              {selectedDayEvents.filter(e => e.type === 'LIVE_DATE').length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    <span>🎯 Target Go-Live Gedung Pada Tanggal Ini</span>
                  </div>

                  <div className="space-y-2">
                    {selectedDayEvents.filter(e => e.type === 'LIVE_DATE').map(evt => {
                      const b = evt.building;
                      const allR = b.floors.flatMap(f => f.rooms);
                      const allF = b.floors.flatMap(f => f.facilities);
                      const passedR = allR.filter(r => r.wifiStatus === 'PASS').length;
                      const pct = Math.round((passedR / (allR.length || 1)) * 100);

                      return (
                        <div
                          key={evt.id}
                          className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] space-y-2.5 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-foreground text-sm">{b.name}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  HARI GO-LIVE RESMI
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{b.address}</span>
                              </p>
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                              <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                                {pct}% Kesiapan
                              </span>
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                {b.floors.length} Lantai • {allR.length} Kamar
                              </span>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-background border border-border text-[11px] flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono">ISP: <strong className="text-foreground">{b.ispProvider}</strong></span>
                            <span className="font-mono">SSID: <strong className="text-blue-600 dark:text-blue-400">{b.wifiStandardProfile?.guestSsid || 'Standard Rukita'}</strong></span>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-500/20">
                            <button
                              onClick={() => {
                                onSelectBuilding(b);
                                onNavigateTab('evaluation', b.id);
                                setIsPopoutOpen(false);
                              }}
                              className="px-2.5 py-1 rounded bg-background border border-border hover:bg-muted text-foreground font-semibold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                              <span>Buka Penilaian QC</span>
                            </button>
                            <button
                              onClick={() => {
                                onSelectBuilding(b);
                                onNavigateTab('readiness', b.id);
                                setIsPopoutOpen(false);
                              }}
                              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Buka Laporan Kesiapan Live</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: TARGET PRE-SALE OPENING GEDUNG */}
              {selectedDayEvents.filter(e => e.type === 'PRE_SALE').length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    <span>🏷️ Target Pre-Sale Opening Pada Tanggal Ini</span>
                  </div>

                  <div className="space-y-2">
                    {selectedDayEvents.filter(e => e.type === 'PRE_SALE').map(evt => {
                      const b = evt.building;
                      const allR = b.floors.flatMap(f => f.rooms);
                      const passedR = allR.filter(r => r.wifiStatus === 'PASS').length;
                      const pct = Math.round((passedR / (allR.length || 1)) * 100);

                      return (
                        <div
                          key={evt.id}
                          className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] space-y-2.5 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-foreground text-sm">{b.name}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  PRE-SALE OPENING
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{b.address}</span>
                              </p>
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                              <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                                {pct}% Kesiapan
                              </span>
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                Live Resmi: {b.openingDate}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-background border border-border text-[11px] flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-amber-700 dark:text-amber-300 font-medium">
                              🏷️ Properti memiliki fase Pre-Sale. Deadline kesiapan IT Ops dimajukan ke H-3 sebelum tanggal ini.
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                            <button
                              onClick={() => {
                                onSelectBuilding(b);
                                onNavigateTab('evaluation', b.id);
                                setIsPopoutOpen(false);
                              }}
                              className="px-2.5 py-1 rounded bg-background border border-border hover:bg-muted text-foreground font-semibold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                              <span>Buka Penilaian QC</span>
                            </button>
                            <button
                              onClick={() => {
                                onSelectBuilding(b);
                                onNavigateTab('readiness', b.id);
                                setIsPopoutOpen(false);
                              }}
                              className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Buka Laporan Kesiapan Live</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: BATAS AKHIR KESIAPAN IT OPS (H-3) */}
              {selectedDayEvents.filter(e => e.type === 'DUE_DATE_IT').length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                    <span>⏳ Batas Akhir Kesiapan IT Ops (Due Date H-3)</span>
                  </div>

                  <div className="space-y-2">
                    {selectedDayEvents.filter(e => e.type === 'DUE_DATE_IT').map(evt => {
                      const dueEvt = evt as CalendarDueDateEvent;
                      const b = dueEvt.building;
                      const allR = b.floors.flatMap(f => f.rooms);
                      const passedR = allR.filter(r => r.wifiStatus === 'PASS').length;
                      const pct = Math.round((passedR / (allR.length || 1)) * 100);

                      return (
                        <div
                          key={evt.id}
                          className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] space-y-2.5 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-foreground text-sm">{b.name}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                  DUE DATE IT OPS
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{b.address}</span>
                              </p>
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                              <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400">
                                {pct}% Selesai
                              </span>
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                {dueEvt.benchmarkType === 'PRE_SALE' ? `H-3 Menuju Pre-Sale (${dueEvt.benchmarkDateStr})` : `H-3 Menuju Live (${dueEvt.benchmarkDateStr})`}
                              </span>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-background border border-border text-[11px] space-y-1">
                            <div className="flex items-center justify-between font-mono">
                              <span className="text-muted-foreground">Benchmark Acuan:</span>
                              <span className="font-bold text-foreground">
                                {dueEvt.benchmarkType === 'PRE_SALE' ? `Pre-Sale Date (${dueEvt.benchmarkDateStr})` : `Live Date (${dueEvt.benchmarkDateStr})`}
                              </span>
                            </div>
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                              ⚠️ Seluruh 4 pilar IT (Wi-Fi 50+ Mbps & SSID Live, CCTV 30 hari retention, Smartlock Master/Guest & Battery, TV Channel/Casting) wajib berstatus PASS sebelum tanggal ini berakhir.
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-500/20">
                            <button
                              onClick={() => {
                                onSelectBuilding(b);
                                onNavigateTab('evaluation', b.id);
                                setIsPopoutOpen(false);
                              }}
                              className="px-2.5 py-1 rounded bg-background border border-border hover:bg-muted text-foreground font-semibold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                              <span>Buka Penilaian QC</span>
                            </button>
                            <button
                              onClick={() => {
                                onSelectBuilding(b);
                                onNavigateTab('readiness', b.id);
                                setIsPopoutOpen(false);
                              }}
                              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Buka Laporan Kesiapan Live</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: JADWAL & RIWAYAT VISIT QC LAPANGAN */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    <span>👷 Kunjungan / Penilaian QC Lapangan ({selectedDayEvents.filter(e => e.type === 'QC_VISIT').length})</span>
                  </div>

                  {!isSchedulingVisit && (
                    <button
                      type="button"
                      onClick={() => setIsSchedulingVisit(true)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Jadwalkan Visit Baru di Tanggal Ini</span>
                    </button>
                  )}
                </div>

                {selectedDayEvents.filter(e => e.type === 'QC_VISIT').length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 text-center text-muted-foreground text-xs">
                    Belum ada riwayat kunjungan QC pada tanggal ini. Klik <strong>"+ Jadwalkan Visit Baru"</strong> untuk mencatat agenda kunjungan teknisi.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDayEvents.filter(e => e.type === 'QC_VISIT').map(evt => {
                      const v = (evt as CalendarVisitEvent).visit;
                      const b = evt.building;
                      const isGoLive = v.statusRecommendation === 'GO_LIVE';

                      return (
                        <div
                          key={evt.id}
                          className="p-3.5 rounded-xl border border-border bg-muted/15 space-y-2 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold px-2 py-0.5 rounded bg-background border border-border text-foreground text-xs">
                                  Visit #{v.visitNumber}
                                </span>
                                <span className="font-bold text-foreground text-xs sm:text-sm">
                                  {b.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                  {v.visitType.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-1 flex-wrap font-medium">
                                <span className="flex items-center gap-1 text-foreground">
                                  <Clock className="w-3 h-3 text-blue-500" />
                                  {v.visitTime || 'Waktu Kunjungan Lapangan'}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-emerald-500" />
                                  Teknisi: <strong className="text-foreground">{v.inspectorName}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] font-mono ${
                                isGoLive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}>
                                {v.statusRecommendation.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-foreground">
                                Skor: {v.readinessScoreSnapshot}%
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-foreground font-medium p-2 rounded-lg bg-background/80 border border-border/60">
                            {v.summaryNote}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                            <span>{v.blockersFound ? `⚠️ ${v.blockersFound} Isu / Kendala Ditemukan` : '✓ Tidak ada blocker'}</span>
                            
                            <button
                              onClick={() => {
                                onSelectBuilding(b);
                                onNavigateTab('evaluation', b.id);
                                setIsPopoutOpen(false);
                              }}
                              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                            >
                              <span>Buka Evaluasi Gedung</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 3: FORM CEPAT JADWALKAN VISIT BARU */}
              {isSchedulingVisit && (
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.03] space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-500" />
                      Catat / Jadwalkan Kunjungan Baru pada Tanggal Ini
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSchedulingVisit(false)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Batal
                    </button>
                  </div>

                  <form onSubmit={handleSaveScheduledVisit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-muted-foreground block mb-1 font-medium">Pilih Gedung *</label>
                        <select
                          value={schedBuildingId}
                          onChange={(e) => setSchedBuildingId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-blue-500"
                        >
                          {buildings.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-muted-foreground block mb-1 font-medium">Jam / Waktu Kunjungan *</label>
                        <input
                          type="text"
                          value={schedTime}
                          onChange={(e) => setSchedTime(e.target.value)}
                          placeholder="Contoh: 14:00 WIB"
                          required
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1 font-medium">Nama Teknisi / Inspektor *</label>
                      <input
                        type="text"
                        value={schedInspector}
                        onChange={(e) => setSchedInspector(e.target.value)}
                        placeholder="Contoh: Budi Pratama / Rian Saputra"
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">Pilih cepat:</span>
                        {['Budi Pratama (IT Lead)', 'Rian Saputra (Field Tech)', 'Dimas Setiawan (QC Tech)', 'Vendor Salto', 'Teknisi CCTV'].map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setSchedInspector(name);
                              setSchedRole(name.includes('Lead') ? 'IT Lead' : 'Field Engineer');
                            }}
                            className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] text-foreground font-medium"
                          >
                            {name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-muted-foreground block mb-1 font-medium">Jenis Kunjungan *</label>
                        <select
                          value={schedType}
                          onChange={(e) => setSchedType(e.target.value as VisitType)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                        >
                          <option value="QC_PROGRESS">QC Progress (Pengecekan Berkala)</option>
                          <option value="INSTALASI_CONFIG">Instalasi & Konfigurasi</option>
                          <option value="RE_INSPECT">Re-Inspect (Tindak Lanjut Isu)</option>
                          <option value="FINAL_AUDIT_SIGN_OFF">Final Audit Sign-Off</option>
                          <option value="SURVEY_AWAL">Survey Awal Onboarding</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-muted-foreground block mb-1 font-medium">Agenda / Catatan Visit</label>
                        <input
                          type="text"
                          value={schedNotes}
                          onChange={(e) => setSchedNotes(e.target.value)}
                          placeholder="Contoh: Pemeriksaan sinyal Wi-Fi kamar & display TV"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/80">
                      <button
                        type="button"
                        onClick={() => setIsSchedulingVisit(false)}
                        className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Jadwal Visit</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>

            {/* Pop-out Footer */}
            <div className="p-3 sm:p-4 border-t border-border bg-muted/20 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-muted-foreground font-mono">
                Siaga IT Opening Calendar • Rukita Coliving Standards
              </span>

              <button
                type="button"
                onClick={() => setIsPopoutOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-background border border-border hover:bg-muted text-foreground font-semibold text-xs shadow-xs"
              >
                Tutup Pop-out
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
