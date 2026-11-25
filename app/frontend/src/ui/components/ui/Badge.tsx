import type { ReactNode } from 'react';
import clsx from 'clsx';

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface2 text-soft border-line',
  accent: 'bg-accenttint text-accent border-transparent',
  ok: 'bg-okbg text-ok border-okline',
  warn: 'bg-warnbg text-warn border-transparent',
  danger: 'bg-dangerbg text-danger border-dangerline',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
