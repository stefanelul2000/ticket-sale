import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useRoleId } from '../../state/useAuth';
import { useCurrentEvent } from '../../state/useCurrentEvent';
import type { EventSummary } from '../../state/useCurrentEvent';
import { useT } from '../../i18n';
import { api } from '../../lib/api';
import { eventPhase, fmtNumber, fmtPercent, fmtTime, fmtWeekdayDate } from '../../lib/format';
import type { ActivityItem } from '../../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Meter } from '../components/ui/Stat';
import { EmptyState, Loading, PageHeader } from '../components/ui/Misc';
import { EventPicker } from '../components/EventPicker';
import { PhaseBadge } from '../components/EventBits';
import { IconCalendar, IconChart, IconPin, IconScan, IconTicket } from '../components/Icons';

export function DashboardPage() {
  const t = useT();
  const { user } = useAuth();
  const role = useRoleId();
  const { events, eventId, loaded, load } = useCurrentEvent();
  const current = events.find((e) => e.id === eventId) ?? null;

  useEffect(() => {
    load(true);
    const id = setInterval(() => document.visibilityState === 'visible' && load(true), 20000);
    return () => clearInterval(id);
  }, [load]);

  const upcoming = events
    .filter((e) => e.id !== eventId && ['upcoming', 'today', 'undated'].includes(eventPhase(e.starts_at, e.ends_at)))
    .slice(0, 4);

  return (
    <div>
      <PageHeader
        title={t('dash.hello', { name: user?.name?.split(' ')[0] ?? '' })}
        subtitle={fmtWeekdayDate(new Date().toISOString())}
        actions={events.length > 1 ? <EventPicker className="w-72 max-w-full" /> : undefined}
      />

      {!loaded ? (
        <Loading />
      ) : !current ? (
        <EmptyState
          title={t('dash.noEvents')}
          action={role >= 4 ? <Link to="/events?new=1" className="inline-flex h-10 items-center rounded bg-accent px-4 text-sm font-semibold text-onaccent">{t('events.create')}</Link> : undefined}
        >
          {role >= 4 ? t('dash.noEventsManager') : t('dash.noEventsStaff')}
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <EventHero event={current} role={role} />
            {upcoming.length > 0 && (
              <Card title={t('dash.otherEvents')}>
                <ul className="divide-y divide-line">
                  {upcoming.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{e.name}</div>
                        <div className="text-sm text-soft">{e.starts_at ? fmtWeekdayDate(e.starts_at) : t('event.noDate')}</div>
                      </div>
                      <button type="button" className="text-sm font-semibold text-accent hover:underline" onClick={() => useCurrentEvent.getState().select(e.id)}>
                        {t('dash.makeCurrent')}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
          {role >= 2 && role !== 3 ? <ActivityFeed eventId={current.id} /> : <QuickReport />}
        </div>
      )}
    </div>
  );
}

function EventHero({ event, role }: { event: EventSummary; role: number }) {
  const t = useT();
  const assigned = event.tickets_sold ?? 0;
  const checkedIn = event.tickets_checked_in ?? 0;
  const generated = event.tickets_generated ?? 0;
  const walkIns = event.tickets_walk_in ?? 0;
  const capacity = event.capacity ?? null;
  const invitedAssigned = assigned - walkIns;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="h-1.5 bg-sky" />
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <PhaseBadge startsAt={event.starts_at} endsAt={event.ends_at} />
              {event.is_public && <Badge tone="accent">{t('event.publicPage')}</Badge>}
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl">{event.name}</h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-soft">
              <span className="inline-flex items-center gap-1.5">
                <IconCalendar size={16} />
                {event.starts_at ? `${fmtWeekdayDate(event.starts_at)}, ${fmtTime(event.starts_at)}` : t('event.noDate')}
              </span>
              {event.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <IconPin size={16} />
                  {event.venue}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure label={t('stat.assigned')} value={fmtNumber(assigned)} sub={capacity ? t('stat.ofCapacity', { n: fmtNumber(capacity) }) : t('stat.ofGenerated', { n: fmtNumber(generated) })} />
          <Figure label={t('stat.checkedIn')} value={fmtNumber(checkedIn)} sub={invitedAssigned > 0 ? t('stat.attendance', { p: fmtPercent((checkedIn - walkIns) / invitedAssigned) }) : undefined} />
          <Figure label={t('stat.walkIns')} value={fmtNumber(walkIns)} />
          <Figure label={t('stat.free')} value={fmtNumber(Math.max(0, generated - assigned))} sub={t('stat.freeHint')} />
        </div>

        {capacity ? (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-xs font-semibold text-soft">
              <span>{t('stat.fill')}</span>
              <span className="tabular">{fmtPercent(assigned / capacity)}</span>
            </div>
            <Meter value={assigned} max={capacity} label={t('stat.fill')} />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {role >= 2 && role !== 3 && (
            <Link to="/door" className="inline-flex h-11 items-center gap-2 rounded bg-accent px-4 text-sm font-semibold text-onaccent hover:bg-accentstrong">
              <IconScan size={18} /> {t('dash.openDoor')}
            </Link>
          )}
          {role >= 3 && (
            <Link to="/assign" className="inline-flex h-11 items-center gap-2 rounded border border-linestrong bg-surface px-4 text-sm font-semibold hover:bg-surface2">
              <IconTicket size={18} /> {t('dash.assign')}
            </Link>
          )}
          {role >= 4 && (
            <Link to={`/events/${event.id}`} className="inline-flex h-11 items-center gap-2 rounded border border-linestrong bg-surface px-4 text-sm font-semibold hover:bg-surface2">
              <IconCalendar size={18} /> {t('dash.manage')}
            </Link>
          )}
          <Link to={`/reports?event=${event.id}`} className="inline-flex h-11 items-center gap-2 rounded border border-linestrong bg-surface px-4 text-sm font-semibold hover:bg-surface2">
            <IconChart size={18} /> {t('nav.reports')}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-surface2 p-3">
      <div className="text-xs font-semibold text-soft">{label}</div>
      <div className="mt-0.5 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-soft">{sub}</div>}
    </div>
  );
}

export function ActivityFeed({ eventId, limit = 30 }: { eventId: number | null; limit?: number }) {
  const t = useT();
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.ticketActivity({ limit, event_id: eventId }));
    } catch {
      setItems((prev) => prev ?? []);
    }
  }, [eventId, limit]);

  useEffect(() => {
    setItems(null);
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 6000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <Card title={t('activity.title')} subtitle={t('activity.live')} bodyClassName="p-0">
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-soft">{t('activity.empty')}</p>
      ) : (
        <ul className="scroll-thin max-h-[560px] divide-y divide-line overflow-y-auto">
          {items.map((it) => (
            <li key={it.id} className="flex gap-3 px-5 py-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${it.success ? 'bg-ok' : 'bg-danger'}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{activityLabel(t, it)}</span>
                  <span className="tabular shrink-0 text-xs text-soft">{fmtTime(it.created_at)}</span>
                </div>
                <div className="truncate text-xs text-soft">
                  {it.name ? `${it.name} · ` : ''}
                  <span className="font-mono">{it.ticket_code ?? '—'}</span>
                  {it.user ? ` · ${it.user.name}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function activityLabel(t: ReturnType<typeof useT>, it: ActivityItem) {
  const s = it.status.toLowerCase();
  if (it.action === 'checkin') {
    if (it.success) return s.includes('walk') ? t('activity.walkIn') : t('activity.checkin');
    if (s.includes('already')) return t('activity.already');
    if (s.includes('wrong')) return t('activity.wrongEvent');
    if (s.includes('not sold')) return t('activity.notSold');
    return t('activity.notFound');
  }
  if (it.action === 'sell') return it.success ? t('activity.assigned') : s.includes('already') ? t('activity.alreadyAssigned') : s.includes('wrong') ? t('activity.wrongEvent') : t('activity.notFound');
  if (it.action === 'refund') return t('activity.released');
  return it.success ? t('activity.verifiedOk') : t('activity.verifiedBad');
}

function QuickReport() {
  const t = useT();
  return (
    <Card title={t('nav.reports')}>
      <p className="text-sm text-soft">{t('dash.viewerHint')}</p>
      <Link to="/reports" className="mt-4 inline-flex h-10 items-center rounded bg-accent px-4 text-sm font-semibold text-onaccent">
        {t('dash.openReports')}
      </Link>
    </Card>
  );
}
