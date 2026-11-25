import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useT } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import { fmtTime, fmtWeekdayDate } from '../../../lib/format';
import { toast } from '../../../state/useToast';
import { useCurrentEvent } from '../../../state/useCurrentEvent';
import type { EventT } from '../../../types';
import { Badge } from '../../components/ui/Badge';
import { Loading, PageHeader, Tabs } from '../../components/ui/Misc';
import { PhaseBadge } from '../../components/EventBits';
import { EventReportView } from '../../components/EventReportView';
import { IconExternal } from '../../components/Icons';
import { GuestsTab } from './GuestsTab';
import { PrintTab } from './PrintTab';
import { TypesTab } from './TypesTab';
import { SettingsTab } from './SettingsTab';

type Tab = 'overview' | 'guests' | 'print' | 'types' | 'settings';
const TABS: Tab[] = ['overview', 'guests', 'print', 'types', 'settings'];

export function EventDetailPage() {
  const t = useT();
  const { id } = useParams();
  const eventId = Number(id);
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'overview') as Tab;
  const [event, setEvent] = useState<EventT | null>(null);
  const [missing, setMissing] = useState(false);

  const reload = useCallback(async () => {
    try {
      setEvent(await api.event(eventId));
    } catch (err) {
      setMissing(true);
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  }, [eventId, t]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Working on an event makes it the current one for door/assign screens.
  useEffect(() => {
    if (event) {
      const store = useCurrentEvent.getState();
      store.load(true).then(() => store.select(event.id));
    }
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) return <PageHeader title={t('common.notFound')} back={{ to: '/events', label: t('nav.events') }} />;
  if (!event) return <Loading />;

  return (
    <div>
      <PageHeader
        back={{ to: '/events', label: t('nav.events') }}
        title={event.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <PhaseBadge startsAt={event.starts_at} endsAt={event.ends_at} />
            {event.is_public && <Badge tone="accent">{t('event.publicPage')}</Badge>}
            <span>{event.starts_at ? `${fmtWeekdayDate(event.starts_at)}, ${fmtTime(event.starts_at)}` : t('event.noDate')}</span>
            {event.venue && <span>· {event.venue}</span>}
          </span>
        }
        actions={
          event.public_link ? (
            <a href={event.public_link} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded border border-linestrong bg-surface px-4 text-sm font-semibold hover:bg-surface2">
              <IconExternal size={16} /> {t('event.viewPublic')}
            </a>
          ) : undefined
        }
      />
      <Tabs<Tab>
        value={tab}
        onChange={(v) => setParams(v === 'overview' ? {} : { tab: v }, { replace: true })}
        items={[
          { value: 'overview', label: t('tab.overview') },
          { value: 'guests', label: t('tab.guests'), count: event.tickets_sold },
          { value: 'print', label: t('tab.print'), count: event.tickets_generated },
          { value: 'types', label: t('tab.types'), count: event.ticket_types?.length },
          { value: 'settings', label: t('tab.settings') },
        ]}
      />
      {tab === 'overview' && <EventReportView eventId={event.id} />}
      {tab === 'guests' && <GuestsTab event={event} onChanged={reload} />}
      {tab === 'print' && <PrintTab event={event} onChanged={reload} />}
      {tab === 'types' && <TypesTab event={event} onChanged={reload} />}
      {tab === 'settings' && <SettingsTab event={event} onChanged={reload} />}
    </div>
  );
}
