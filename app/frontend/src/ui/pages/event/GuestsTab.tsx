import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useT } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import type { Paginated } from '../../../lib/api';
import { categoryKey } from '../../../lib/constants';
import { fmtDateTime, fmtNumber } from '../../../lib/format';
import { csvBlob, downloadBlob, safeFileName } from '../../../lib/ticketPrint';
import { toast } from '../../../state/useToast';
import { useRoleId } from '../../../state/useAuth';
import type { EventT, TicketRow } from '../../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Misc';
import { CategorySelect } from '../../components/EventBits';
import { IconDownload, IconSearch } from '../../components/Icons';
import { EditGuestModal } from '../AssignPage';

type Status = '' | 'assigned' | 'unassigned' | 'checked_in' | 'not_checked_in' | 'walk_in' | 'eticket';
type Sort = 'number' | 'name' | 'assigned' | 'checked_in';
type Counts = { total: number; sold: number; unsold: number; checked_in: number; walk_ins: number; etickets?: number };

/** Every ticket of the event: who holds it, who handed it out (and when), who came in. */
export function GuestsTab({ event, onChanged }: { event: EventT; onChanged: () => void }) {
  const t = useT();
  const role = useRoleId();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>('number');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<TicketRow> | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [editing, setEditing] = useState<TicketRow | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const [list, stats] = await Promise.all([
        api.tickets({
          event_id: event.id,
          per_page: 100,
          page,
          sort,
          ...(query ? { search: query } : {}),
          ...(status ? { status } : {}),
          ...(category ? { category } : {}),
        }),
        api.stats(event.id),
      ]);
      setData(list);
      setCounts(stats);
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  }, [event.id, page, query, status, category, sort, t]);

  useEffect(() => {
    load();
  }, [load]);

  const release = async (row: TicketRow) => {
    if (!window.confirm(t('guest.releaseConfirm', { code: row.ticket_code, name: row.name ?? '—' }))) return;
    setBusy(row.id);
    try {
      await api.refund(row.ticket_code);
      toast(t('guest.released'), 'ok');
      load();
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.tickets({ event_id: event.id, per_page: 2000, sort });
      const rows: unknown[][] = [
        [t('field.number'), t('field.ticketCode'), t('field.guestName'), t('field.category'), t('field.ticketType'), t('field.status'), t('tickets.assignedBy'), t('tickets.assignedAt'), t('tickets.checkedInAt'), t('tickets.scannedBy')],
      ];
      for (const r of res.data as TicketRow[]) {
        rows.push([
          r.ticket_number,
          r.ticket_code,
          r.name ?? '',
          r.sold_at ? t(categoryKey(r.guest_category)) : '',
          r.ticket_type?.name ?? '',
          statusText(r),
          r.seller?.name ?? '',
          r.sold_at ? fmtDateTime(r.sold_at) : '',
          r.checked_in_at ? fmtDateTime(r.checked_in_at) : '',
          r.checked_in_by && typeof r.checked_in_by === 'object' ? r.checked_in_by.name : '',
        ]);
      }
      downloadBlob(csvBlob(rows), `${safeFileName(event.name)}-bilete.csv`);
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  };

  const statusText = (r: TicketRow) => (r.checkin ? (r.is_walk_in ? t('status.walkIn') : t('status.checkedIn')) : r.sold_at ? t('status.assigned') : t('status.unassigned'));

  const statusBadge = (r: TicketRow) =>
    r.checkin ? <Badge tone="ok">{statusText(r)}</Badge> : r.sold_at ? <Badge tone="accent">{statusText(r)}</Badge> : <Badge>{statusText(r)}</Badge>;

  const chips: { value: Status; label: string; n?: number }[] = [
    { value: '', label: t('filter.all'), n: counts?.total },
    { value: 'assigned', label: t('filter.assigned'), n: counts?.sold },
    { value: 'unassigned', label: t('filter.unassigned'), n: counts?.unsold },
    { value: 'checked_in', label: t('filter.checked_in'), n: counts?.checked_in },
    { value: 'not_checked_in', label: t('filter.not_checked_in'), n: counts ? Math.max(0, counts.sold - counts.checked_in) : undefined },
    { value: 'walk_in', label: t('filter.walk_in'), n: counts?.walk_ins },
    ...(counts?.etickets ? [{ value: 'eticket' as Status, label: t('filter.eticket'), n: counts.etickets }] : []),
  ];

  return (
    <Card
      title={t('tickets.title')}
      subtitle={t('tickets.subtitle')}
      actions={
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <IconDownload size={16} /> {t('guests.export')}
        </Button>
      }
      bodyClassName="p-0"
    >
      <div className="flex flex-wrap gap-2 border-b border-line px-4 pt-4">
        {chips.map((c) => (
          <button
            key={c.value || 'all'}
            type="button"
            onClick={() => {
              setStatus(c.value);
              setPage(1);
            }}
            aria-pressed={status === c.value}
            className={clsx(
              'mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              status === c.value ? 'border-accent bg-accent text-onaccent' : 'border-linestrong bg-surface text-soft hover:text-ink',
            )}
          >
            {c.label}
            {c.n !== undefined && <span className={clsx('tabular rounded-full px-1.5 text-xs', status === c.value ? 'bg-white/20' : 'bg-surface2')}>{fmtNumber(c.n)}</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_200px_200px]">
        <label className="relative">
          <span className="sr-only">{t('common.search')}</span>
          <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('guests.searchPlaceholder')}
            className="h-10 w-full rounded border border-linestrong bg-surface pl-10 pr-3 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <CategorySelect
          includeAll
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        />
        <select
          aria-label={t('tickets.sort')}
          className="select h-10 rounded border border-linestrong bg-surface px-3 text-sm focus:border-accent focus:outline-none"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as Sort);
            setPage(1);
          }}
        >
          <option value="number">{t('tickets.sort.number')}</option>
          <option value="name">{t('tickets.sort.name')}</option>
          <option value="assigned">{t('tickets.sort.assigned')}</option>
          <option value="checked_in">{t('tickets.sort.checkedIn')}</option>
        </select>
      </div>

      {data === null ? (
        <Loading />
      ) : data.data.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-soft">{t('common.noResults')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-soft">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">{t('tickets.holder')}</th>
                  <th className="px-4 py-2.5">{t('field.ticketCode')}</th>
                  <th className="px-4 py-2.5">{t('field.status')}</th>
                  <th className="px-4 py-2.5">{t('tickets.assigned')}</th>
                  <th className="px-4 py-2.5">{t('tickets.entry')}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => {
                  const scanner = r.checked_in_by && typeof r.checked_in_by === 'object' ? r.checked_in_by.name : null;
                  return (
                    <tr key={r.id} className="border-t border-line align-top">
                      <td className="tabular px-4 py-3 text-soft">{r.ticket_number}</td>
                      <td className="px-4 py-3">
                        <div className={clsx('font-semibold', !r.name && 'font-normal text-muted')}>
                          {r.name || '—'}
                          {r.request_id && <Badge tone="accent" className="ml-2 align-middle">{t('tickets.eticketBadge')}</Badge>}
                        </div>
                        <div className="text-xs text-soft">
                          {[r.sold_at && r.guest_category ? t(categoryKey(r.guest_category)) : null, r.ticket_type?.name].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.ticket_code}</td>
                      <td className="px-4 py-3">{statusBadge(r)}</td>
                      <td className="px-4 py-3 text-xs text-soft">
                        {r.sold_at ? (
                          <>
                            <div className="font-semibold text-ink">{r.seller?.name ?? '—'}</div>
                            <div>{fmtDateTime(r.sold_at)}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-soft">
                        {r.checked_in_at ? (
                          <>
                            <div className="font-semibold text-ink">{fmtDateTime(r.checked_in_at)}</div>
                            {scanner && <div>{t('tickets.by', { name: scanner })}</div>}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {r.sold_at && !r.checkin && role >= 3 && (
                          <button type="button" className="mr-3 text-sm font-semibold text-accent hover:underline" onClick={() => setEditing(r)}>
                            {t('common.edit')}
                          </button>
                        )}
                        {r.sold_at && !r.checkin && role >= 4 && (
                          <button type="button" disabled={busy === r.id} className="text-sm font-semibold text-danger hover:underline disabled:opacity-50" onClick={() => release(r)}>
                            {t('guest.release')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-soft">
            <span>{t('common.total', { n: data.total })}</span>
            {data.last_page > 1 && (
              <span className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
                {page} / {data.last_page}
                <Button size="sm" variant="secondary" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>›</Button>
              </span>
            )}
          </div>
        </>
      )}
      {editing && <EditGuestModal ticket={editing} onClose={() => setEditing(null)} onSaved={() => load()} />}
    </Card>
  );
}
