import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            <span aria-hidden>←</span> {back.label}
          </Link>
        )}
        <h1 className="text-3xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-linestrong bg-surface px-6 py-12 text-center">
      <img src="/brand/as-mark-192.png" alt="" className="logo-badge mb-4 h-12 w-12 opacity-80" />
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-soft">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[] }) {
  return (
    <div className="scroll-thin -mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1" role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
            value === it.value ? 'border-accent text-accent' : 'border-transparent text-soft hover:text-ink',
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="ml-1.5 rounded-full bg-surface2 px-1.5 text-xs text-soft">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Logo({ size = 40, full = false, className }: { size?: number; full?: boolean; className?: string }) {
  return (
    <img
      src={full ? '/brand/as-logo.webp' : '/brand/as-mark-192.png'}
      width={size}
      height={size}
      alt="Atelier Săcelean"
      className={clsx('logo-badge shrink-0 object-contain', className)}
    />
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-soft">
      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-linestrong border-t-accent" />
      {label}
    </div>
  );
}
