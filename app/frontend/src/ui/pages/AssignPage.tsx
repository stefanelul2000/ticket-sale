import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useT } from '../../i18n';
import { api, errorMessage } from '../../lib/api';
import { normalizeTicketCode } from '../../lib/ticketCode';
import { categoryKey } from '../../lib/constants';
import { fmtNumber, fmtTime } from '../../lib/format';
import { useCurrentEvent } from '../../state/useCurrentEvent';
import { EMAIL_RE, useSendTicketEmail } from '../../lib/useSendTicketEmail';
import { toast } from '../../state/useToast';
import type { TicketInfo } from '../../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState, PageHeader } from '../components/ui/Misc';
import { EventPicker } from '../components/EventPicker';
import { CategoryChips } from '../components/EventBits';
import { CameraScanner } from '../components/CameraScanner';
import { IconCamera } from '../components/Icons';
import { feedback } from './DoorPage';

export function AssignPage() {
  const t = useT();
  const { eventId, events, load } = useCurrentEvent();
  const event = events.find((e) => e.id === eventId) ?? null;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [camera, setCamera] = useState(false);
  const [recent, setRecent] = useState<TicketInfo[]>([]);
  const [editing, setEditing] = useState<TicketInfo | null>(null);
  const [counts, setCounts] = useState<{ total: number; sold: number; mail_configured?: boolean } | null>(null);
  const sendEmail = useSendTicketEmail();
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    try {
      setCounts(await api.stats(eventId));
    } catch {
      /* ignore */
    }
  }, [eventId]);

  useEffect(() => {
    setCounts(null);
    refresh();
  }, [refresh]);

  const takeCode = (raw: string) => {
    setCode(normalizeTicketCode(raw.replace(/[\r\n]+/g, '')));
    setTimeout(() => nameRef.current?.focus(), 30);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const ticketCode = normalizeTicketCode(code);
    if (!ticketCode) {
      codeRef.current?.focus();
      return;
    }
    if (!name.trim()) {
      toast(t('assign.nameRequired'), 'warn');
      nameRef.current?.focus();
      return;
    }
    const mail = email.trim();
    if (mail && !EMAIL_RE.test(mail)) {
      toast(t('assign.emailInvalid'), 'warn');
      return;
    }
    setSaving(true);
    try {
      const tk: TicketInfo = await api.sell(ticketCode, { name: name.trim(), guest_category: category, email: mail || null, event_id: eventId });
      setRecent((r) => [tk, ...r].slice(0, 20));
      toast(t('assign.done', { name: tk.name ?? '', code: tk.ticket_code }), 'ok');
      feedback('ok');
      setCode('');
      setName('');
      setCategory(null);
      setEmail('');
      refresh();
      setTimeout(() => codeRef.current?.focus(), 30);
      if (tk.email) {
        if (counts?.mail_configured) {
          const sent = await sendEmail(eventId, tk);
          if (sent) setRecent((list) => list.map((x) => (x.id === sent.id ? sent : x)));
        } else {
          toast(t('assign.emailNoMail'), 'warn');
        }
      }
    } catch (err) {
      feedback('bad');
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (!events.length) {
    return (
      <div>
        <PageHeader title={t('nav.assign')} />
        <EmptyState title={t('dash.noEvents')}>{t('dash.noEventsStaff')}</EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('nav.assign')} subtitle={t('assign.subtitle')} actions={<EventPicker className="w-72 max-w-full" />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={event?.name} subtitle={counts ? t('assign.counts', { assigned: fmtNumber(counts.sold), free: fmtNumber(Math.max(0, counts.total - counts.sold)) }) : undefined}>
            <form onSubmit={submit} className="space-y-5">
              <div className="flex flex-wrap items-end gap-3">
                <Input
                  ref={codeRef}
                  wrapperClassName="min-w-[200px] flex-1"
                  label={t('field.ticketCode')}
                  value={code}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="K7M3P-9QXR2"
                  className="h-12 font-mono text-lg tracking-wider"
                  onChange={(e) => (/[\r\n]/.test(e.target.value) ? takeCode(e.target.value) : setCode(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      takeCode(code);
                    }
                  }}
                />
                <Button variant={camera ? 'primary' : 'secondary'} size="lg" onClick={() => setCamera((v) => !v)}>
                  <IconCamera size={18} /> {camera ? t('door.cameraHide') : t('door.camera')}
                </Button>
              </div>
              {camera && (
                <CameraScanner
                  onDetected={(c) => {
                    takeCode(c);
                    setCamera(false);
                    feedback('ok');
                  }}
                  onClose={() => setCamera(false)}
                />
              )}
              <Input ref={nameRef} label={t('field.guestName')} value={name} maxLength={255} onChange={(e) => setName(e.target.value)} className="h-12 text-lg" />
              <Input
                label={t('field.emailOptional')}
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@exemplu.ro"
                className="h-12 text-lg"
                hint={counts && counts.mail_configured === false ? t('assign.emailHintNoMail') : t('assign.emailHint')}
              />
              <div>
                <div className="mb-1.5 text-sm font-semibold">{t('field.categoryOptional')}</div>
                <CategoryChips value={category} onChange={setCategory} />
                <p className="mt-1.5 text-xs text-soft">{t('assign.categoryHint')}</p>
              </div>
              <Button type="submit" size="lg" loading={saving} className="w-full sm:w-auto">
                {t('assign.submit')}
              </Button>
            </form>
          </Card>
        </div>
        <Card title={t('assign.recent')} bodyClassName="p-0">
          {recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-soft">{t('assign.recentEmpty')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="truncate text-xs text-soft">
                      <span className="font-mono">{r.ticket_code}</span>
                      {r.guest_category ? ` · ${t(categoryKey(r.guest_category))}` : ''} · {fmtTime(r.sold_at)}
                    </div>
                    {r.email && (
                      <div className={`truncate text-xs ${r.emailed_at ? 'text-ok' : 'text-soft'}`}>
                        {r.emailed_at ? '✓ ' : ''}{r.email}
                      </div>
                    )}
                  </div>
                  <button type="button" className="text-sm font-semibold text-accent hover:underline" onClick={() => setEditing(r)}>
                    {t('common.edit')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {editing && (
        <EditGuestModal
          ticket={editing}
          eventId={eventId}
          mailConfigured={!!counts?.mail_configured}
          onClose={() => setEditing(null)}
          onSaved={(tk) => setRecent((list) => list.map((x) => (x.id === tk.id ? tk : x)))}
        />
      )}
    </div>
  );
}

export function EditGuestModal({
  ticket,
  eventId,
  mailConfigured = false,
  onClose,
  onSaved,
}: {
  ticket: { ticket_code: string; name?: string | null; guest_category?: string | null; email?: string | null; emailed_at?: string | null };
  eventId?: number | null;
  mailConfigured?: boolean;
  onClose: () => void;
  onSaved: (t: TicketInfo) => void;
}) {
  const t = useT();
  const [name, setName] = useState(ticket.name ?? '');
  const [category, setCategory] = useState<string | null>(ticket.guest_category ?? null);
  const [email, setEmail] = useState(ticket.email ?? '');
  const [sendNow, setSendNow] = useState(!ticket.emailed_at);
  const [saving, setSaving] = useState(false);
  const sendEmail = useSendTicketEmail();
  const mail = email.trim().toLowerCase();
  const mailChanged = mail !== (ticket.email ?? '');
  const canSend = mailConfigured && !!mail && EMAIL_RE.test(mail);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    if (mail && !EMAIL_RE.test(mail)) {
      toast(t('assign.emailInvalid'), 'warn');
      return;
    }
    setSaving(true);
    try {
      let tk: TicketInfo = await api.updateTicket(ticket.ticket_code, { name: name.trim(), guest_category: category, email: mail || null });
      toast(t('common.saved'), 'ok');
      if (canSend && sendNow) {
        tk = (await sendEmail(eventId, tk)) ?? tk;
      }
      onSaved(tk);
      onClose();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={`${t('guest.edit')} · ${ticket.ticket_code}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save()} loading={saving} disabled={!name.trim()}>{t('common.save')}</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <Input label={t('field.guestName')} value={name} maxLength={255} onChange={(e) => setName(e.target.value)} />
        <Input
          label={t('field.emailOptional')}
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={255}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (e.target.value.trim().toLowerCase() !== (ticket.email ?? '')) setSendNow(true);
          }}
          hint={ticket.emailed_at && !mailChanged ? t('assign.emailedAt', { when: fmtTime(ticket.emailed_at) }) : undefined}
        />
        {canSend && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--a-accent)]" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} />
            {ticket.emailed_at && !mailChanged ? t('assign.emailResend') : t('assign.emailSendNow')}
          </label>
        )}
        <div>
          <div className="mb-1.5 text-sm font-semibold">{t('field.categoryOptional')}</div>
          <CategoryChips value={category} onChange={setCategory} />
        </div>
      </form>
    </Modal>
  );
}
