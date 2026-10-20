// Operational reference date for Siaga IT
export const REFERENCE_DATE = new Date(2026, 9, 19); // 19 Oktober 2026

export const MONTH_MAP_ID: Record<string, number> = {
  'jan': 0, 'januari': 0,
  'feb': 1, 'februari': 1,
  'mar': 2, 'maret': 2,
  'apr': 3, 'april': 3,
  'mei': 4,
  'jun': 5, 'juni': 5,
  'jul': 6, 'juli': 6,
  'agu': 7, 'agustus': 7,
  'sep': 8, 'september': 8,
  'okt': 9, 'oktober': 9,
  'nov': 10, 'november': 10,
  'des': 11, 'desember': 11,
};

export const MONTH_NAMES_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export const MONTH_NAMES_FULL_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function parseIndonesianDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Pattern: "27 Okt 2026" or "01 Nov 2026" or "19 Oktober 2026"
  const parts = trimmed.split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const year = parseInt(parts[2], 10);
    const month = MONTH_MAP_ID[mStr];
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  // Fallback ISO or standard string parse
  const iso = new Date(trimmed);
  return isNaN(iso.getTime()) ? null : iso;
}

export function formatIndonesianDate(date: Date, fullMonth: boolean = false): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = fullMonth ? MONTH_NAMES_FULL_ID[date.getMonth()] : MONTH_NAMES_SHORT_ID[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

export function getDaysRemaining(targetDate: Date, fromDate: Date = REFERENCE_DATE): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const fromUtc = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  return Math.round((targetUtc - fromUtc) / msPerDay);
}

export interface ITDueDateInfo {
  hasPresale: boolean;
  presaleDateStr?: string;
  presaleDateObj: Date | null;
  openingDateStr: string;
  liveDateObj: Date;
  
  benchmarkType: 'PRE_SALE' | 'LIVE_DATE';
  benchmarkLabel: string; // "Pre-Sale" | "Go-Live"
  benchmarkDateStr: string;
  benchmarkDateObj: Date;
  
  itDueDateStr: string; // e.g. "24 Okt 2026"
  itDueDateObj: Date;
  
  daysUntilDueDate: number; // e.g. 5, 0, or -2
  daysUntilLive: number;
  daysUntilPresale: number | null;
  
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // within 3 days
  
  dueBadgeText: string;
  countdownBadgeText: string;
}

/**
 * Calculates IT Readiness Due Date:
 * If presaleDate is provided, Due Date is H-3 from presaleDate.
 * If presaleDate is NOT provided, Due Date is H-3 from openingDate (Live Date).
 */
export function getBuildingDueDateInfo(
  building: { openingDate: string; presaleDate?: string },
  referenceDate: Date = REFERENCE_DATE
): ITDueDateInfo {
  const liveDateObj = parseIndonesianDate(building.openingDate) || new Date(2026, 10, 1);
  const presaleDateObj = building.presaleDate ? parseIndonesianDate(building.presaleDate) : null;
  const hasPresale = !!(presaleDateObj && building.presaleDate && building.presaleDate.trim() !== '');

  const benchmarkType: 'PRE_SALE' | 'LIVE_DATE' = hasPresale ? 'PRE_SALE' : 'LIVE_DATE';
  const benchmarkLabel = hasPresale ? 'Pre-Sale' : 'Go-Live';
  const benchmarkDateObj = hasPresale && presaleDateObj ? presaleDateObj : liveDateObj;
  const benchmarkDateStr = hasPresale && building.presaleDate ? building.presaleDate : building.openingDate;

  // Due Date is H-3 (3 days before benchmark)
  const itDueDateObj = new Date(benchmarkDateObj.getTime() - 3 * 24 * 60 * 60 * 1000);
  const itDueDateStr = formatIndonesianDate(itDueDateObj);

  const daysUntilDueDate = getDaysRemaining(itDueDateObj, referenceDate);
  const daysUntilLive = getDaysRemaining(liveDateObj, referenceDate);
  const daysUntilPresale = presaleDateObj ? getDaysRemaining(presaleDateObj, referenceDate) : null;

  const isOverdue = daysUntilDueDate < 0;
  const isDueToday = daysUntilDueDate === 0;
  const isDueSoon = daysUntilDueDate > 0 && daysUntilDueDate <= 3;

  const dueBadgeText = hasPresale
    ? `Due Date IT: H-3 Pre-Sale (${itDueDateStr})`
    : `Due Date IT: H-3 Live (${itDueDateStr})`;

  let countdownBadgeText = '';
  if (isOverdue) {
    countdownBadgeText = `Terlambat ${Math.abs(daysUntilDueDate)} Hari dari Due Date`;
  } else if (isDueToday) {
    countdownBadgeText = `HARI H DUE DATE IT`;
  } else {
    countdownBadgeText = `Due T-${daysUntilDueDate} Hari`;
  }

  return {
    hasPresale,
    presaleDateStr: building.presaleDate,
    presaleDateObj,
    openingDateStr: building.openingDate,
    liveDateObj,
    benchmarkType,
    benchmarkLabel,
    benchmarkDateStr,
    benchmarkDateObj,
    itDueDateStr,
    itDueDateObj,
    daysUntilDueDate,
    daysUntilLive,
    daysUntilPresale,
    isOverdue,
    isDueToday,
    isDueSoon,
    dueBadgeText,
    countdownBadgeText,
  };
}
