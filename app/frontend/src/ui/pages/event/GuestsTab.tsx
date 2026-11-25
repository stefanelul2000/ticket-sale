import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useT } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import type { Paginated } from '../../../lib/api';
import { categoryKey } from '../../../lib/constants';
import { fmtDateTime, fmtTime } from '../../../lib/format';
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

const STATUSES = ['', 'assigned', 'checked_in', 'not_checked_in', 'unassigned', 'walk_in'] as const;

export function GuestsTab({ event, onChanged }: { event: EventT; onChanged: () => void }) {
  const t = useT();
  const role = useRoleId();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('assigned');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<TicketRow> | null>(null);
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
      setData(
        await api.tickets({
          event_id: event.id,
          per_page: 100,
          page,
          ...(query ? { search: query } : {}),
          ...(status ? { status } : {}),
          ...(category ? { category } : {}),
        }),
      );
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  }, [event.id, page, query, status, category, t]);

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
      const res = await api.eventTickets(event.id);
      const rows: unknown[][] = [[t('field.number'), t('field.ticketCode'), t('field.guestName'), t('field.category'), t('field.ticketType'), t('status.assigned'), t('stat.checkedIn'), t('guest.walkIn')]];
      for (const tk of res.tickets) {
        rows.push([tk.ticket_number, tk.ticket_code, tk.name ?? '', tk.guest_category ? t(categoryKey(tk.guest_category)) : '', tk.ticket_type ?? '', tk.sold_at ? fmtDateTime(tk.sold_at) : '', tk.checked_in_at ? fmtDateTime(tk.checked_in_at) : '', tk.is_walk_in ? '✓' : '']);
      }
      downloadBlob(csvBlob(rows), `${safeFileName(event.name)}-invitati.csv`);
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  };

  const statusBadge = (r: TicketRow) =>
    r.checkin ? (
      <Badge tone="ok">{r.is_walk_in ? t('status.walkIn') : t('status.checkedIn')} {fmtTime(r.checked_in_at)}</Badge>
    ) : r.sold_at ? (
      <Badge tone="accent">{t('status.assigned')}</Badge>
    ) : (
      <Badge>{t('status.unassigned')}</Badge>
    );

  return (
    <Card
      title={t('tab.guests')}
      subtitle={t('guests.subtitle')}
      actions={
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <IconDownload size={16} /> {t('guests.export')}
        </Button>
      }
      bodyClassName="p-0"
    >
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
        <select
          className="select h-10 rounded border border-linestrong bg-surface px-3 text-sm focus:border-accent focus:outline-none"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as (typeof STATUSES)[number]);
            setPage(1);
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? t(`filter.${s}` as const) : t('filter.all')}
            </option>
          ))}
        </select>
        <CategorySelect
          includeAll
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        />
      </div>

      {data === null ? (
        <Loading />
      ) : data.data.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-soft">{t('common.noResults')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-soft">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">{t('field.guestName')}</th>
                  <th className="px-4 py-2.5">{t('field.category')}</th>
                  <th className="px-4 py-2.5">{t('field.ticketCode')}</th>
                  <th className="px-4 py-2.5">{t('field.status')}</th>
                  <th className="px-4 py-2.5">{t('guests.by')}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="tabular px-4 py-2.5 text-soft">{r.ticket_number}</td>
                    <td className={clsx('px-4 py-2.5 font-semibold', !r.name && 'font-normal text-muted')}>{r.name || '—'}</td>
                    <td className="px-4 py-2.5 text-soft">{r.sold_at ? t(categoryKey(r.guest_category)) : ''}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.ticket_code}</td>
                    <td className="px-4 py-2.5">{statusBadge(r)}</td>
                    <td className="px-4 py-2.5 text-xs text-soft">{r.seller?.name ?? ''}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
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
                ))}
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
      {editing && (
        <EditGuestModal
          ticket={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            load();
          }}
        />
      )}
    </Card>
  );
}
