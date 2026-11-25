import clsx from 'clsx';
import { useToast } from '../../state/useToast';

const tones = {
  info: 'border-line bg-surface text-ink',
  ok: 'border-okline bg-okbg text-ok',
  warn: 'border-transparent bg-warnbg text-warn',
  danger: 'border-dangerline bg-dangerbg text-danger',
};

export function Toasts() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:items-end" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={clsx('pointer-events-auto max-w-sm rounded-lg border px-4 py-3 text-left text-sm font-semibold shadow-pop', tones[t.tone])}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
