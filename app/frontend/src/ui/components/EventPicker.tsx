import { useEffect } from 'react';
import { useCurrentEvent } from '../../state/useCurrentEvent';
import { useT } from '../../i18n';
import { fmtDate } from '../../lib/format';

export function EventPicker({ className }: { className?: string }) {
  const t = useT();
  const { events, eventId, select, load } = useCurrentEvent();

  useEffect(() => {
    load();
  }, [load]);

  if (!events.length) return null;

  return (
    <label className={className}>
      <span className="sr-only">{t('event.pick')}</span>
      <select
        className="select h-10 w-full rounded border border-linestrong bg-surface px-3 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
        value={eventId ?? ''}
        onChange={(e) => select(Number(e.target.value))}
      >
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name}
            {ev.starts_at ? ` · ${fmtDate(ev.starts_at)}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
