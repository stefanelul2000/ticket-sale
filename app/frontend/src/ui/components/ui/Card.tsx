import type { ReactNode } from 'react';
import clsx from 'clsx';

type Props = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function Card({ title, subtitle, actions, children, className, bodyClassName }: Props) {
  return (
    <section className={clsx('rounded-xl border border-line bg-surface shadow-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-soft">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
