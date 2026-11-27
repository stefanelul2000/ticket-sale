import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useT } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import { fmtDateTime, fmtNumber } from '../../../lib/format';
import { ticketUrl } from '../../../lib/ticketCode';
import { renderEticketDesign } from '../../../lib/eticketDesign';
import { useSettings } from '../../../state/useSettings';
import { toast } from '../../../state/useToast';
import type { EventT, TicketRequestT } from '../../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Loading } from '../../components/ui/Misc';
import { CategorySelect } from '../../components/EventBits';
import { IconCopy } from '../../components/Icons';

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';
type Data = {
  requests: TicketRequestT[];
  counts: Record<'pending' | 'approved' | 'rejected' | 'cancelled', number>;
  pool: { from: number | null; to: number | null; free: number; open: number };
  mail_configured: boolean;
};

/** Romanian mobile numbers (07…) become 407… for wa.me links. */
type Guest = { name: string; guest_category: string };
const guestsOf = (r: TicketRequestT): Guest[] =>
  r.attendees.map((a) => (typeof a === 'string' ? { name: a, guest_category: '' } : { name: a.name, guest_category: a.guest_category ?? '' }));

const waNumber = (phone?: string | null) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `40${digits.slice(1)}`;
  return digits;
};

export function RequestsTab({ event, onChanged }: { event: EventT; onChanged: () => void }) {
  const t = useT();
  const { settings } = useSettings();
  const [status, setStatus] = useState<Status>('pending');
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<TicketRequestT | null>(null);
  const [cancelling, setCancelling] = useState<TicketRequestT | null>(null);
  const [cancelNotify, setCancelNotify] = useState(true);

  const publicUrl = settings.public_url || window.location.origin;

  const load = useCallback(async () => {
    try {
      setData(await api.eventRequests(event.id, status));
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  }, [event.id, status, t]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  const linksText = (r: TicketRequestT) =>
    [t('reqs.shareIntro', { event: event.name }), ...(r.tickets ?? []).map((tk) => `${tk.name ?? ''}: ${ticketUrl(publicUrl, tk.ticket_code)}`)].join('\n');

  /** The event's designed e-ticket for each ticket (custom design, else the standard card). */
  const renderDesigns = async (r: TicketRequestT): Promise<Blob[]> => {
    const ctx = { publicUrl, orgName: settings.name, labels: { guest: t('print.guestLabel'), scanHint: t('print.scanHint') } };
    const out: Blob[] = [];
    for (const tk of r.tickets ?? []) out.push(await renderEticketDesign(event, tk, ctx));
    return out;
  };

  const send = async (r: TicketRequestT) => {
    setBusy(`send-${r.id}`);
    try {
      const designs = await renderDesigns(r).catch(() => [] as Blob[]);
      await api.sendRequest(r.id, designs);
      toast(t('reqs.sent', { email: r.email }), 'ok');
      await load();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
      await load();
    } finally {
      setBusy(null);
    }
  };

  const approve = async (r: TicketRequestT, guests: Guest[], andSend: boolean) => {
    setBusy(`approve-${r.id}`);
    try {
      const approved: TicketRequestT = await api.approveRequest(r.id, {
        attendees: guests.map((g) => ({ name: g.name.trim(), guest_category: g.guest_category || null })),
      });
      toast(t('reqs.approved', { n: approved.tickets?.length ?? guests.length }), 'ok');
      onChanged();
      if (andSend) await send(approved);
      else await load();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (r: TicketRequestT, withEmail: boolean) => {
    setBusy(`cancel-${r.id}`);
    try {
      const res = await api.cancelRequest(r.id, withEmail);
      toast(res.notified ? t('reqs.cancelledNotified', { n: res.released }) : t('reqs.cancelled', { n: res.released }), 'ok');
      setCancelling(null);
      onChanged();
      await load();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('common.copied'), 'ok');
    } catch {
      window.prompt(t('common.copy'), text);
    }
  };

  if (!event.requests_enabled) {
    return (
      <Card title={t('reqs.title')}>
        <p className="text-sm text-soft">{t('reqs.disabled')}</p>
      </Card>
    );
  }

  const chips: { value: Status; label: string; n?: number }[] = [
    { value: 'pending', label: t('reqs.status.pending'), n: data?.counts.pending },
    { value: 'approved', label: t('reqs.status.approved'), n: data?.counts.approved },
    { value: 'rejected', label: t('reqs.status.rejected'), n: data?.counts.rejected },
    { value: 'cancelled', label: t('reqs.status.cancelled'), n: data?.counts.cancelled },
    { value: 'all', label: t('filter.all') },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 text-sm">
            <div className="font-semibold">
              {data?.pool.from || data?.pool.to
                ? t('reqs.poolRange', { from: data?.pool.from ?? 1, to: data?.pool.to ?? '…' })
                : t('reqs.poolAny')}
            </div>
            {data && <div className="text-soft">{t('reqs.poolLine', { free: fmtNumber(data.pool.free), open: fmtNumber(data.pool.open) })}</div>}
          </div>
          {event.request_link && (
            <div className="flex items-center gap-2">
              <code className="max-w-[320px] truncate rounded bg-surface2 px-2 py-1.5 text-xs">{event.request_link}</code>
              <Button size="sm" variant="secondary" onClick={() => copy(event.request_link!)} aria-label={t('common.copy')}>
                <IconCopy size={16} />
              </Button>
            </div>
          )}
        </div>
        {data && !data.mail_configured && <p className="mt-4 rounded-lg bg-warnbg p-3 text-sm font-semibold text-warn">{t('reqs.noMail')}</p>}
      </Card>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setStatus(c.value)}
            aria-pressed={status === c.value}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              status === c.value ? 'border-accent bg-accent text-onaccent' : 'border-linestrong bg-surface text-soft hover:text-ink',
            )}
          >
            {c.label}
            {c.n !== undefined && <span className={clsx('tabular rounded-full px-1.5 text-xs', status === c.value ? 'bg-white/20' : 'bg-surface2')}>{c.n}</span>}
          </button>
        ))}
      </div>

      {data === null ? (
        <Loading />
      ) : data.requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-linestrong p-10 text-center text-sm text-soft">{t('reqs.empty')}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.requests.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              busy={busy}
              mailConfigured={data.mail_configured}
              publicUrl={publicUrl}
              onApprove={approve}
              onSend={send}
              onReject={() => setRejecting(r)}
              onCancel={(req) => {
                setCancelNotify(true);
                setCancelling(req);
              }}
              onCopy={() => copy(linksText(r))}
              waText={linksText(r)}
            />
          ))}
        </div>
      )}

      {cancelling && (
        <Modal
          open
          title={t('reqs.cancelTitle', { email: cancelling.email })}
          onClose={() => setCancelling(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setCancelling(null)}>{t('common.cancel')}</Button>
              <Button variant="danger" loading={busy === `cancel-${cancelling.id}`} onClick={() => cancel(cancelling, !!data?.mail_configured && cancelNotify)}>
                {t('reqs.cancel')}
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <p>{t('reqs.cancelConfirm')}</p>
            {data?.mail_configured && (
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={cancelNotify} onChange={(e) => setCancelNotify(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--a-accent)]" />
                <span>{t('reqs.cancelNotify', { email: cancelling.email })}</span>
              </label>
            )}
          </div>
        </Modal>
      )}
      {rejecting && (
        <RejectModal
          r={rejecting}
          mailConfigured={!!data?.mail_configured}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RequestCard({
  r,
  busy,
  mailConfigured,
  publicUrl,
  onApprove,
  onSend,
  onReject,
  onCancel,
  onCopy,
  waText,
}: {
  r: TicketRequestT;
  busy: string | null;
  mailConfigured: boolean;
  publicUrl: string;
  onApprove: (r: TicketRequestT, guests: Guest[], andSend: boolean) => void;
  onSend: (r: TicketRequestT) => void;
  onReject: () => void;
  onCancel: (r: TicketRequestT) => void;
  onCopy: () => void;
  waText: string;
}) {
  const t = useT();
  const [guests, setGuests] = useState<Guest[]>(guestsOf(r));
  const [include, setInclude] = useState<boolean[]>(r.attendees.map(() => true));
  const chosen = guests.filter((_, i) => include[i]);
  const invalid = !chosen.length || chosen.some((g) => !g.name.trim());
  const wa = waNumber(r.phone);
  const tone = r.status === 'pending' ? 'warn' : r.status === 'approved' ? 'ok' : 'neutral';

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <a href={`mailto:${r.email}`} className="block truncate font-semibold text-accent hover:underline">{r.email}</a>
          {r.phone && <a href={`tel:${r.phone}`} className="text-sm text-soft hover:underline">{r.phone}</a>}
        </div>
        <div className="text-right">
          <Badge tone={tone}>{t(`reqs.status.${r.status}` as const)}</Badge>
          <div className="mt-1 text-xs text-soft">{fmtDateTime(r.created_at)}</div>
        </div>
      </div>

      {r.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-surface2 p-3 text-sm">{r.message}</p>}

      {r.status === 'pending' ? (
        <div className="mt-4 space-y-3">
          <div className="text-sm font-semibold">{t('reqs.guests', { n: r.quantity })}</div>
          {guests.map((g, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input type="checkbox" checked={include[i]} onChange={(e) => setInclude((arr) => arr.map((x, j) => (j === i ? e.target.checked : x)))} className="h-4 w-4 accent-[var(--a-accent)]" aria-label={t('reqs.include')} />
              <input
                value={g.name}
                maxLength={120}
                onChange={(e) => setGuests((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                className={clsx('h-9 min-w-[160px] flex-1 rounded border border-linestrong bg-surface px-3 text-sm focus:border-accent focus:outline-none', !include[i] && 'text-muted line-through')}
              />
              <div className="w-44">
                <CategorySelect value={g.guest_category} onChange={(v) => setGuests((arr) => arr.map((x, j) => (j === i ? { ...x, guest_category: v } : x)))} />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {mailConfigured && (
              <Button onClick={() => onApprove(r, chosen, true)} loading={busy === `approve-${r.id}` || busy === `send-${r.id}`} disabled={invalid}>
                {t('reqs.approveSend', { n: chosen.length })}
              </Button>
            )}
            <Button variant={mailConfigured ? 'secondary' : 'primary'} onClick={() => onApprove(r, chosen, false)} loading={busy === `approve-${r.id}`} disabled={invalid}>
              {t('reqs.approveOnly', { n: chosen.length })}
            </Button>
            <Button variant="danger" onClick={onReject}>{t('reqs.reject')}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {(r.tickets?.length ?? 0) > 0 ? (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {r.tickets!.map((tk) => (
                <li key={tk.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold">{tk.name}</span>
                    <span className="ml-2 font-mono text-xs text-soft">#{tk.ticket_number} · {tk.ticket_code}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {tk.checkin && <Badge tone="ok">{t('status.checkedIn')}</Badge>}
                    <a href={ticketUrl(publicUrl, tk.ticket_code)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent hover:underline">{t('reqs.open')}</a>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-soft">{guestsOf(r).map((g) => g.name).join(', ')}</p>
          )}

          {r.status === 'approved' && (
            <>
              <p className={clsx('text-sm', r.send_error ? 'font-semibold text-danger' : 'text-soft')}>
                {r.send_error
                  ? t('reqs.sendError', { error: r.send_error })
                  : r.sent_at
                    ? t('reqs.sentAt', { when: fmtDateTime(r.sent_at), n: r.send_count })
                    : t('reqs.notSent')}
              </p>
              <div className="flex flex-wrap gap-2">
                {mailConfigured && (
                  <Button size="sm" onClick={() => onSend(r)} loading={busy === `send-${r.id}`}>
                    {r.sent_at ? t('reqs.resend') : t('reqs.send')}
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={onCopy}>
                  <IconCopy size={14} /> {t('reqs.copyLinks')}
                </Button>
                {wa && (
                  <a
                    href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center rounded border border-linestrong bg-surface px-3 text-sm font-semibold hover:bg-surface2"
                  >
                    WhatsApp
                  </a>
                )}
                <Button size="sm" variant="danger" onClick={() => onCancel(r)} loading={busy === `cancel-${r.id}`}>{t('reqs.cancel')}</Button>
              </div>
            </>
          )}
          {(r.status === 'rejected' || r.status === 'cancelled') && r.decision_note && (
            <p className="rounded-lg bg-surface2 p-3 text-sm">{r.decision_note}</p>
          )}
          {r.decider && <p className="text-xs text-soft">{t('reqs.decidedBy', { name: r.decider.name, when: fmtDateTime(r.decided_at) })}</p>}
        </div>
      )}
    </div>
  );
}

function RejectModal({ r, mailConfigured, onClose, onDone }: { r: TicketRequestT; mailConfigured: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(mailConfigured);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.rejectRequest(r.id, { note: note.trim() || null, notify });
      toast(res.notified ? t('reqs.rejectedNotified') : t('reqs.rejected'), 'ok');
      onDone();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={t('reqs.rejectTitle', { email: r.email })}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={save} loading={saving}>{t('reqs.reject')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold">{t('reqs.rejectNote')}</span>
          <textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className="min-h-[90px] w-full rounded border border-linestrong bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none" />
        </label>
        <label className={clsx('flex items-center gap-2 text-sm', !mailConfigured && 'opacity-50')}>
          <input type="checkbox" checked={notify} disabled={!mailConfigured} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[var(--a-accent)]" />
          {t('reqs.rejectNotify')}
        </label>
      </div>
    </Modal>
  );
}
