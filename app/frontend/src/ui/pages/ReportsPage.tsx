import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { api } from '../../lib/api';
import { categoryKey } from '../../lib/constants';
import { fmtDate, fmtNumber, fmtPercent } from '../../lib/format';
import { csvBlob, downloadBlob } from '../../lib/ticketPrint';
import { useRoleId } from '../../state/useAuth';
import { useCurrentEvent } from '../../state/useCurrentEvent';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Meter, Stat } from '../components/ui/Stat';
import { EmptyState, Loading, PageHeader, Tabs } from '../components/ui/Misc';
import { EventReportView } from '../components/EventReportView';
import { IconDownload } from '../components/Icons';

type Overview = {
  events: { id: number; name: string; starts_at?: string | null; capacity?: number | null; generated: number; assigned: number; checked_in: number; walk_ins: number; attendance_rate: number | null }[];
  totals: { events: number; assigned: number; checked_in: number; walk_ins: number };
};
type RepeatGuest = { name: string; category?: string | null; events_count: number; attended_count: number; events: { id: number; name: string; checked_in: number }[] };

export function ReportsPage() {
  const t = useT();
  const role = useRoleId();
  const [params, setParams] = useSearchParams();
  const { events, eventId: currentId, load } = useCurrentEvent();
  const selected = Number(params.get('event')) || currentId;
  const view = (params.get('view') as 'event' | 'all' | 'guests') || 'event';

  useEffect(() => {
    load();
  }, [load]);

  const setView = (v: string) => setParams((p) => {
    const next = new URLSearchParams(p);
    next.set('view', v);
    return next;
  });

  return (
    <div>
      <PageHeader title={t('nav.reports')} subtitle={t('reports.subtitle')} />
      <Tabs
        value={view}
        onChange={setView}
        items={[
          { value: 'event', label: t('reports.perEvent') },
          { value: 'all', label: t('reports.allEvents') },
          ...(role >= 4 ? [{ value: 'guests' as const, label: t('reports.repeatGuests') }] : []),
        ]}
      />
      {view === 'event' &&
        (events.length === 0 ? (
          <EmptyState title={t('dash.noEvents')} />
        ) : (
          <div className="space-y-6">
            <select
              className="select h-10 w-full max-w-md rounded border border-linestrong bg-surface px-3 text-sm font-semibold focus:border-accent focus:outline-none"
              value={selected ?? ''}
              onChange={(e) => setParams({ view: 'event', event: e.target.value })}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.starts_at ? ` · ${fmtDate(e.starts_at)}` : ''}
                </option>
              ))}
            </select>
            {selected ? <EventReportView eventId={selected} /> : null}
          </div>
        ))}
      {view === 'all' && <AllEvents />}
      {view === 'guests' && role >= 4 && <RepeatGuests />}
    </div>
  );
}

function AllEvents() {
  const t = useT();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api.reportOverview().then(setData).catch(() => setData({ events: [], totals: { events: 0, assigned: 0, checked_in: 0, walk_ins: 0 } }));
  }, []);

  if (!data) return <Loading />;

  const exportCsv = () =>
    downloadBlob(
      csvBlob([
        [t('field.eventName'), t('field.startsAt'), t('stat.capacity'), t('stat.generated'), t('stat.assigned'), t('stat.checkedIn'), t('stat.walkIns'), t('stat.attendanceRate')],
        ...data.events.map((e) => [e.name, e.starts_at ? fmtDate(e.starts_at) : '', e.capacity ?? '', e.generated, e.assigned, e.checked_in, e.walk_ins, e.attendance_rate ?? '']),
      ]),
      'evenimente-raport.csv',
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t('reports.events')} value={fmtNumber(data.totals.events)} />
        <Stat label={t('stat.assigned')} value={fmtNumber(data.totals.assigned)} />
        <Stat label={t('stat.checkedIn')} value={fmtNumber(data.totals.checked_in)} />
        <Stat label={t('stat.walkIns')} value={fmtNumber(data.totals.walk_ins)} />
      </div>
      <Card
        title={t('reports.allEvents')}
        actions={
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            <IconDownload size={16} /> CSV
          </Button>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-soft">
              <tr>
                <th className="px-5 py-2.5">{t('field.eventName')}</th>
                <th className="px-5 py-2.5">{t('field.startsAt')}</th>
                <th className="px-5 py-2.5 text-right">{t('stat.assigned')}</th>
                <th className="px-5 py-2.5 text-right">{t('stat.checkedIn')}</th>
                <th className="px-5 py-2.5 text-right">{t('stat.walkIns')}</th>
                <th className="w-48 px-5 py-2.5">{t('stat.attendanceRate')}</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {data.events.map((e) => (
                <tr key={e.id} className="border-t border-line">
                  <td className="px-5 py-3 font-semibold">{e.name}</td>
                  <td className="px-5 py-3 text-soft">{e.starts_at ? fmtDate(e.starts_at) : '—'}</td>
                  <td className="px-5 py-3 text-right">{fmtNumber(e.assigned)}</td>
                  <td className="px-5 py-3 text-right">{fmtNumber(e.checked_in)}</td>
                  <td className="px-5 py-3 text-right">{fmtNumber(e.walk_ins)}</td>
                  <td className="px-5 py-3">
                    {e.attendance_rate === null ? (
                      <span className="text-soft">—</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Meter value={e.attendance_rate} max={1} className="flex-1" label={t('stat.attendanceRate')} />
                        <span className="w-10 text-right font-semibold">{fmtPercent(e.attendance_rate)}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RepeatGuests() {
  const t = useT();
  const [rows, setRows] = useState<RepeatGuest[] | null>(null);

  useEffect(() => {
    api.repeatGuests().then(setRows).catch(() => setRows([]));
  }, []);

  if (!rows) return <Loading />;
  if (!rows.length) return <EmptyState title={t('reports.noRepeat')}>{t('reports.repeatHint')}</EmptyState>;

  return (
    <Card title={t('reports.repeatGuests')} subtitle={t('reports.repeatHint')} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-soft">
            <tr>
              <th className="px-5 py-2.5">{t('field.guestName')}</th>
              <th className="px-5 py-2.5">{t('field.category')}</th>
              <th className="px-5 py-2.5 text-right">{t('reports.invitedTo')}</th>
              <th className="px-5 py-2.5 text-right">{t('reports.attended')}</th>
              <th className="px-5 py-2.5">{t('nav.events')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.name} className="border-t border-line align-top">
                <td className="px-5 py-3 font-semibold">{g.name}</td>
                <td className="px-5 py-3 text-soft">{g.category ? t(categoryKey(g.category)) : '—'}</td>
                <td className="tabular px-5 py-3 text-right">{g.events_count}</td>
                <td className="tabular px-5 py-3 text-right">{g.attended_count}</td>
                <td className="px-5 py-3 text-xs text-soft">{g.events.map((e) => e.name).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
