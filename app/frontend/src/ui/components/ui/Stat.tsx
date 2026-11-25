import type { ReactNode } from 'react';
import clsx from 'clsx';

/** Stat tile: label · value · optional sub-line. Value uses proportional figures. */
export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-line bg-surface p-4 shadow-card', className)}>
      <div className="text-sm font-semibold text-soft">{label}</div>
      <div className="mt-1 text-3xl font-bold text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-soft">{sub}</div>}
    </div>
  );
}

/** Meter: filled part = value, track = lighter step of the same hue. */
export function Meter({ value, max, label, className }: { value: number; max: number; label?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full', className)} style={{ background: 'var(--chart-track)' }} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--chart-mark)' }} />
    </div>
  );
}
