import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Penanda fasilitas untuk chip kamar DAN area bersama.
 *
 * Sengaja memakai huruf (bukan ikon) supaya terbaca di layar kecil, tetap jelas
 * saat dicetak, dan tidak menambah ikon dekoratif:
 *   W = Wi-Fi · T = TV · L = Smartlock / akses pintu · – = tidak ada
 *
 * Warna hanya pendukung; hurufnya tetap terbaca tanpa warna.
 */
export interface FacilityFlags {
  wifi?: boolean;
  tv?: boolean;
  lock?: boolean;
}

const MARKS: Array<{ key: keyof FacilityFlags; letter: string; label: string; tone: string }> = [
  { key: 'wifi', letter: 'W', label: 'Wi-Fi', tone: 'text-sky-600 dark:text-sky-400' },
  { key: 'tv', letter: 'T', label: 'TV', tone: 'text-blue-600 dark:text-blue-400' },
  { key: 'lock', letter: 'L', label: 'Smartlock / akses', tone: 'text-emerald-600 dark:text-emerald-400' },
];

const markClass = (tone: string) =>
  cn('rounded border border-border bg-muted/70 px-1 text-[9px] font-bold leading-[14px]', tone);

export const FacilityMarks: React.FC<{ flags: FacilityFlags; className?: string }> = ({ flags, className }) => {
  const active = MARKS.filter((mark) => flags[mark.key]);

  if (active.length === 0) {
    return (
      <span className={cn('ml-1.5 align-middle', className)} title="Tanpa fasilitas khusus">
        <span className={markClass('text-muted-foreground')}>–</span>
      </span>
    );
  }

  return (
    <span className={cn('ml-1.5 inline-flex items-center gap-1 align-middle', className)}>
      {active.map((mark) => (
        <span key={mark.key} className={markClass(mark.tone)} title={mark.label} aria-label={mark.label}>
          {mark.letter}
        </span>
      ))}
    </span>
  );
};

export const FacilityLegend: React.FC<{ className?: string }> = ({ className }) => (
  <div
    data-testid="facility-legend"
    className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground', className)}
  >
    <span className="font-semibold text-foreground">Keterangan</span>
    {MARKS.map((mark) => (
      <span key={mark.key} className="inline-flex items-center gap-1">
        <span className={markClass(mark.tone)}>{mark.letter}</span>
        {mark.label}
      </span>
    ))}
    <span className="inline-flex items-center gap-1">
      <span className={markClass('text-muted-foreground')}>–</span>
      tidak ada
    </span>
  </div>
);
