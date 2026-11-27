import { useEffect } from 'react';
import { useT } from '../../i18n';
import { useCurrentEvent } from '../../state/useCurrentEvent';
import { EmptyState, Loading, PageHeader } from '../components/ui/Misc';
import { EventPicker } from '../components/EventPicker';
import { GuestsTab } from './event/GuestsTab';
import type { EventT } from '../../types';

/** All tickets of the selected event: who holds them, who handed them out, who came in. */
export function TicketsPage() {
  const t = useT();
  const { events, eventId, loaded, load } = useCurrentEvent();
  const current = events.find((e) => e.id === eventId) ?? null;

  useEffect(() => {
    load(true);
  }, [load]);

  return (
    <div>
      <PageHeader title={t('nav.tickets')} subtitle={t('tickets.pageSubtitle')} actions={events.length > 1 ? <EventPicker className="w-72 max-w-full" /> : undefined} />
      {!loaded ? (
        <Loading />
      ) : !current ? (
        <EmptyState title={t('dash.noEvents')} />
      ) : (
        <GuestsTab key={current.id} event={current as unknown as EventT} onChanged={() => load(true)} />
      )}
    </div>
  );
}
