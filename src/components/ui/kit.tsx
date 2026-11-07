import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import type { CheckStatus } from '../../types/hotel';

/**
 * Komponen UI minimal untuk Siaga IT.
 * Sengaja tanpa ikon dekoratif / efek glow: teknisi memakai ini sambil berdiri
 * di koridor gedung, jadi target sentuh besar + label teks jelas lebih penting.
 */

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('rounded-xl border border-border bg-card', className)}>{children}</div>
);

export const Section: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, children, className }) => (
  <Card className={cn('overflow-hidden', className)}>
    <div className="flex items-start justify-between gap-3 px-3.5 py-3 border-b border-border">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className="p-3.5">{children}</div>
  </Card>
);

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'blue';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  red: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({
  tone = 'neutral',
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
      TONE_CLASS[tone],
      className,
    )}
  >
    {children}
  </span>
);

export const Bar: React.FC<{ value: number; tone?: 'green' | 'amber' | 'red' | 'blue' }> = ({ value, tone = 'blue' }) => {
  const color =
    tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'red' ? 'bg-rose-500' : 'bg-blue-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full transition-all duration-200', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
};

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BTN_CLASS: Record<BtnVariant, string> = {
  primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
  secondary: 'bg-background text-foreground border-border hover:bg-muted',
  ghost: 'bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground',
  danger: 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700',
};

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; block?: boolean }
> = ({ variant = 'secondary', block, className, type = 'button', ...props }) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none min-h-[38px] touch-manipulation',
      BTN_CLASS[variant],
      block && 'w-full',
      className,
    )}
    {...props}
  />
);

export const Empty: React.FC<{ text: string; hint?: string }> = ({ text, hint }) => (
  <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
    <p className="text-xs font-medium text-foreground">{text}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-lg border border-border bg-background/60 px-2.5 py-2">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
    <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
    {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
  </div>
);

export const inputClass =
  'w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[38px]';

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className,
}) => (
  <label className={cn('block', className)}>
    <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[10px] text-muted-foreground leading-snug">{hint}</span>}
  </label>
);

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input className={cn(inputClass, className)} {...props} />
);

export const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => (
  <select className={cn(inputClass, 'appearance-none', className)} {...props}>
    {children}
  </select>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, rows = 2, ...props }) => (
  <textarea rows={rows} className={cn(inputClass, 'min-h-[56px] resize-y', className)} {...props} />
);

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  tone?: Tone;
}

/**
 * Pilihan cepat 1-tap status QC (OK / Need Improvement / Rusak / Belum Tersedia).
 * Dipakai teknisi sambil berjalan, jadi tiap opsi minimal 36px tinggi.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-lg border border-border">
      {options.map((option, index) => {
        const active = option.value === value;
        const tone: Tone = option.tone || 'blue';
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 border-border font-semibold transition-colors touch-manipulation',
              index > 0 && 'border-l',
              size === 'sm' ? 'px-1.5 py-1.5 text-[10px]' : 'px-2 py-2 text-[11px]',
              active
                ? cn(TONE_CLASS[tone], 'border-transparent')
                : 'bg-background text-muted-foreground hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const STATUS_OPTIONS: SegmentedOption<CheckStatus>[] = [
  { value: 'OK', label: 'OK', tone: 'green' },
  { value: 'NEED_IMPROVE', label: 'Need Improvement', tone: 'amber' },
  { value: 'RUSAK', label: 'Rusak', tone: 'red' },
  { value: 'BELUM_TERSEDIA', label: 'Belum Tersedia', tone: 'neutral' },
];

export const Sheet: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  preventClose?: boolean;
}> = ({ open, title, subtitle, onClose, children, footer, preventClose = false }) => {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !preventClose) onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, preventClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 print:hidden">
      <div className="absolute inset-0" onClick={preventClose ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{subtitle}</p>}
          </div>
          {!preventClose && (
            <Btn variant="ghost" onClick={onClose} className="min-h-[32px] px-2">
              Tutup
            </Btn>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">{children}</div>
        {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
};
