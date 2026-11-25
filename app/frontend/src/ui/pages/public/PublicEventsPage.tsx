import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n';
import { api } from '../../../lib/api';
import { eventPhase, fmtTime, fmtWeekdayDate } from '../../../lib/format';
import { EmptyState, Loading } from '../../components/ui/Misc';
import type { PublicEvent } from './PublicEventPage';

export function PublicEventsPage() {
  const t = useT();
  const [events, setEvents] = useState<PublicEvent[] | null>(null);

  useEffect(() => {
    document.title = `${t('public.eventsTitle')} · Atelier Săcelean`;
    api.publicEvents().then(setEvents).catch(() => setEvents([]));
  }, [t]);

  if (!events) return <Loading />;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t('public.eventsTitle')}</h1>
      {events.length === 0 ? (
        <EmptyState title={t('public.noEvents')} />
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.slug}>
              <Link to={`/e/${e.slug}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-accent">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-accent">{t(`public.phase.${eventPhase(e.starts_at, e.ends_at)}` as const)}</div>
                  <div className="font-display text-xl font-bold">{e.name}</div>
                  <div className="text-sm text-soft">
                    {e.starts_at ? `${fmtWeekdayDate(e.starts_at)}, ${fmtTime(e.starts_at)}` : ''}
                    {e.venue ? ` · ${e.venue}` : ''}
                  </div>
                </div>
                <span className="text-sm font-semibold text-accent">{t('public.details')} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
