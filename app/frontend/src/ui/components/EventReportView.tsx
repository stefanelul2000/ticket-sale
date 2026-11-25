import { useEffect, useState } from 'react';
import { useT } from '../../i18n';
import { api } from '../../lib/api';
import { categoryKey } from '../../lib/constants';
import { fmtDate, fmtNumber, fmtPercent, fmtTime } from '../../lib/format';
import { csvBlob, downloadBlob, safeFileName } from '../../lib/ticketPrint';
import type { EventReport } from '../../types';
import { Card } from './ui/Card';
import { Stat } from './ui/Stat';
import { Loading } from './ui/Misc';
import { Button } from './ui/Button';
import { ColumnChart, ProgressRows } from './Charts';
import { IconDownload } from './Icons';

export function EventReportView({ eventId }: { eventId: number }) {
  const t = useT();
  const [report, setReport] = useState<EventReport | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setReport(null);
    setError(false);
    const load = () =>
      api
        .reportEvent(eventId)
        .then((r) => alive && setReport(r))
        .catch(() => alive && setError(true));
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [eventId]);

  if (error) return <p className="text-sm text-danger">{t('common.error')}</p>;
  if (!report) return <Loading />;

  const tt = report.totals;

  const exportCsv = () => {
    const rows: unknown[][] = [
      [t('report.metric'), t('report.value')],
      [t('stat.capacity'), tt.capacity ?? ''],
      [t('stat.generated'), tt.generated],
      [t('stat.assigned'), tt.assigned],
      [t('stat.checkedIn'), tt.checked_in],
      [t('stat.walkIns'), tt.walk_ins],
      [t('stat.notArrived'), tt.not_arrived],
      [t('stat.attendanceRate'), tt.attendance_rate ?? ''],
      [],
      [t('field.category'), t('stat.assigned'), t('stat.checkedIn')],
      ...report.by_category.map((c) => [t(categoryKey(c.category === 'none' ? null : c.category)), c.assigned, c.checked_in]),
      [],
      [t('report.volunteer'), t('stat.assigned'), t('report.scanned')],
      ...report.by_volunteer.map((v) => [v.name, v.assigned, v.checked_in]),
      [],
      [t('report.slot'), t('stat.checkedIn')],
      ...report.arrivals.map((a) => [a.slot, a.count]),
    ];
    downloadBlob(csvBlob(rows), `${safeFileName(report.event.name)}-raport.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t('stat.assigned')} value={fmtNumber(tt.assigned)} sub={tt.capacity ? t('stat.ofCapacity', { n: fmtNumber(tt.capacity) }) : t('stat.ofGenerated', { n: fmtNumber(tt.generated) })} />
        <Stat label={t('stat.checkedIn')} value={fmtNumber(tt.checked_in)} sub={t('stat.inclWalkIns', { n: fmtNumber(tt.walk_ins) })} />
        <Stat label={t('stat.attendanceRate')} value={fmtPercent(tt.attendance_rate)} sub={t('stat.attendanceHint')} />
        <Stat label={t('stat.notArrived')} value={fmtNumber(tt.not_arrived)} sub={tt.fill_rate !== null ? t('stat.fillLine', { p: fmtPercent(tt.fill_rate) }) : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('report.arrivals')} subtitle={t('report.arrivalsHint')}>
          <ColumnChart
            ariaLabel={t('report.arrivals')}
            tableHeaders={[t('report.slot'), t('stat.checkedIn')]}
            emptyText={t('report.noArrivals')}
            data={report.arrivals.map((a) => ({ key: a.slot, label: fmtTime(a.slot), value: a.count, tooltip: `${fmtTime(a.slot)}–${fmtTime(new Date(new Date(a.slot).getTime() + 15 * 60000).toISOString())}` }))}
          />
        </Card>
        <Card title={t('report.categories')} subtitle={t('report.categoriesHint')}>
          <ProgressRows
            legend={[t('stat.checkedIn'), t('stat.assigned')]}
            emptyText={t('report.noData')}
            rows={report.by_category.map((c) => ({ key: c.category, label: t(categoryKey(c.category === 'none' ? null : c.category)), value: c.checked_in, total: c.assigned }))}
          />
        </Card>
        <Card title={t('report.distribution')} subtitle={t('report.distributionHint')}>
          <ColumnChart
            ariaLabel={t('report.distribution')}
            tableHeaders={[t('report.day'), t('stat.assigned')]}
            emptyText={t('report.noData')}
            data={report.distribution.map((d) => ({ key: d.day, label: new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value: d.count, tooltip: fmtDate(`${d.day}T12:00:00`) }))}
          />
        </Card>
        <Card title={t('report.types')}>
          <ProgressRows
            legend={[t('stat.checkedIn'), t('stat.assigned')]}
            emptyText={t('report.noData')}
            rows={report.by_type.map((ty, i) => ({ key: `${ty.name}-${i}`, label: `${ty.name ?? '—'} · ${t('stat.generatedShort', { n: ty.generated })}`, value: ty.checked_in, total: ty.assigned }))}
          />
        </Card>
      </div>

      <Card
        title={t('report.volunteers')}
        subtitle={t('report.volunteersHint')}
        actions={
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <IconDownload size={16} /> CSV
          </Button>
        }
        bodyClassName="p-0"
      >
        {report.by_volunteer.length === 0 ? (
          <p className="px-5 py-6 text-sm text-soft">{t('report.noData')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-soft">
              <tr>
                <th className="px-5 py-2.5">{t('report.volunteer')}</th>
                <th className="px-5 py-2.5 text-right">{t('stat.assigned')}</th>
                <th className="px-5 py-2.5 text-right">{t('report.scanned')}</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {report.by_volunteer.map((v) => (
                <tr key={v.name} className="border-t border-line">
                  <td className="px-5 py-2.5 font-semibold">{v.name}</td>
                  <td className="px-5 py-2.5 text-right">{fmtNumber(v.assigned)}</td>
                  <td className="px-5 py-2.5 text-right">{fmtNumber(v.checked_in)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
