import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useTheme } from '../../../state/useTheme';
import { withAlpha } from '../../utils/colors';

type CardProps = {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Card({ title, actions, children, footer, className }: CardProps) {
  const { background } = useTheme();
  return (
    <div
      className={clsx('w-full rounded-2xl border p-6 shadow-xl', className)}
      style={{
        backgroundColor: withAlpha(background, 0.85),
        borderColor: withAlpha('#ffffff', 0.08),
      }}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <div className="text-lg font-semibold text-white">{title}</div>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="space-y-4 text-slate-200">{children}</div>
      {footer && <div className="mt-6 border-t border-slate-800 pt-4 text-sm text-slate-400">{footer}</div>}
    </div>
  );
}
