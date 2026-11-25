import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { api, errorMessage } from '../../lib/api';
import { fmtNumber, fmtTime, fmtWeekdayDate } from '../../lib/format';
import { useCurrentEvent } from '../../state/useCurrentEvent';
import { toast } from '../../state/useToast';
import type { EventT } from '../../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Meter } from '../components/ui/Stat';
import { Modal } from '../components/ui/Modal';
import { EmptyState, Loading, PageHeader } from '../components/ui/Misc';
import { PhaseBadge } from '../components/EventBits';
import { EventForm, toFormValues, toPayload } from '../components/EventForm';
import type { EventFormValues } from '../components/EventForm';
import { IconCalendar, IconPin, IconPlus } from '../components/Icons';

export function EventsPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState<EventT[] | null>(null);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setEvents(await api.events());
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
      setEvents([]);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (v: EventFormValues) => {
    setSaving(true);
    try {
      const created: EventT = await api.createEvent({ ...toPayload(v), default_ticket_type: t('event.defaultType') });
      toast(t('events.created'), 'ok');
      useCurrentEvent.getState().load(true);
      navigate(`/events/${created.id}?tab=print`);
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('nav.events')}
        subtitle={t('events.subtitle')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <IconPlus size={18} /> {t('events.create')}
          </Button>
        }
      />

      {events === null ? (
        <Loading />
      ) : events.length === 0 ? (
        <EmptyState title={t('dash.noEvents')} action={<Button onClick={() => setCreating(true)}>{t('events.create')}</Button>}>
          {t('dash.noEventsManager')}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <Link key={e.id} to={`/events/${e.id}`} className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-accent">
              <div className="mb-3 flex flex-wrap gap-2">
                <PhaseBadge startsAt={e.starts_at} endsAt={e.ends_at} />
                {e.is_public && <Badge tone="accent">{t('event.publicPage')}</Badge>}
              </div>
              <h2 className="text-xl font-bold group-hover:text-accent">{e.name}</h2>
              <div className="mt-2 space-y-1 text-sm text-soft">
                <div className="flex items-center gap-1.5">
                  <IconCalendar size={15} />
                  {e.starts_at ? `${fmtWeekdayDate(e.starts_at)}, ${fmtTime(e.starts_at)}` : t('event.noDate')}
                </div>
                {e.venue && (
                  <div className="flex items-center gap-1.5">
                    <IconPin size={15} /> {e.venue}
                  </div>
                )}
              </div>
              <div className="mt-auto pt-5">
                <div className="mb-1.5 flex justify-between text-xs font-semibold text-soft">
                  <span>
                    {t('stat.assigned')}: <span className="text-ink">{fmtNumber(e.tickets_sold ?? 0)}</span>
                    {e.capacity ? ` / ${fmtNumber(e.capacity)}` : ''}
                  </span>
                  <span>
                    {t('stat.checkedIn')}: <span className="text-ink">{fmtNumber(e.tickets_checked_in ?? 0)}</span>
                  </span>
                </div>
                <Meter value={e.tickets_sold ?? 0} max={e.capacity || Math.max(1, e.tickets_generated ?? 0)} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={creating}
        wide
        title={t('events.create')}
        onClose={() => {
          setCreating(false);
          if (params.get('new')) setParams({});
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>{t('common.cancel')}</Button>
            <Button type="submit" form="create-event" loading={saving}>{t('events.createSubmit')}</Button>
          </>
        }
      >
        <EventForm formId="create-event" initial={toFormValues()} onSubmit={create} />
      </Modal>
    </div>
  );
}
