import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import clsx from 'clsx';
import { useT } from '../../i18n';
import { api, errorMessage } from '../../lib/api';
import { normalizeTicketCode } from '../../lib/ticketCode';
import { fmtNumber, fmtTime } from '../../lib/format';
import { categoryKey } from '../../lib/constants';
import { useCurrentEvent } from '../../state/useCurrentEvent';
import { toast } from '../../state/useToast';
import type { TicketInfo, TicketRow } from '../../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState, Loading, PageHeader } from '../components/ui/Misc';
import { EventPicker } from '../components/EventPicker';
import { CategoryChips } from '../components/EventBits';
import { CameraScanner } from '../components/CameraScanner';
import { IconCamera, IconSearch, IconUserPlus } from '../components/Icons';

type Tone = 'ok' | 'warn' | 'bad';
type Outcome = { tone: Tone; title: string; detail?: string; code: string; ticket?: TicketInfo | null; at: number; canCheckIn?: boolean };

const AUTO_KEY = 'ts_auto_checkin';

export function feedback(tone: Tone) {
  try {
    navigator.vibrate?.(tone === 'ok' ? 120 : [80, 60, 80, 60, 200]);
  } catch {
    /* unsupported */
  }
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = tone === 'ok' ? 880 : tone === 'warn' ? 440 : 220;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (tone === 'ok' ? 0.12 : 0.4));
    osc.onended = () => ctx.close();
  } catch {
    /* audio blocked */
  }
}

export function DoorPage() {
  const t = useT();
  const { eventId, events, load } = useCurrentEvent();
  const event = events.find((e) => e.id === eventId) ?? null;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [history, setHistory] = useState<Outcome[]>([]);
  const [auto, setAuto] = useState(() => localStorage.getItem(AUTO_KEY) !== '0');
  const [camera, setCamera] = useState(false);
  const [counts, setCounts] = useState<{ sold: number; checked_in: number; walk_ins: number } | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => localStorage.setItem(AUTO_KEY, auto ? '1' : '0'), [auto]);

  const refreshCounts = useCallback(async () => {
    if (!eventId) return;
    try {
      setCounts(await api.stats(eventId));
    } catch {
      /* ignore */
    }
  }, [eventId]);

  useEffect(() => {
    setCounts(null);
    refreshCounts();
    const id = setInterval(() => document.visibilityState === 'visible' && refreshCounts(), 8000);
    return () => clearInterval(id);
  }, [refreshCounts]);

  const refocus = () => {
    if (!walkInOpen && !searchOpen) setTimeout(() => inputRef.current?.focus(), 60);
  };

  const describe = (tk?: TicketInfo | null) =>
    tk ? [tk.name || t('door.noName'), tk.guest_category ? t(categoryKey(tk.guest_category)) : null, tk.ticket_type?.name, `#${tk.ticket_number}`].filter(Boolean).join(' · ') : undefined;

  const show = (o: Omit<Outcome, 'at'>) => {
    const full = { ...o, at: Date.now() };
    setOutcome(full);
    setHistory((h) => [full, ...h].slice(0, 12));
    feedback(o.tone);
  };

  const run = async (raw: string, mode: 'verify' | 'checkin') => {
    const normalized = normalizeTicketCode(raw);
    if (!normalized || busyRef.current || !eventId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (mode === 'checkin') {
        const res = await api.checkin(normalized, eventId);
        show({ tone: 'ok', title: t('door.ok'), detail: describe(res.ticket), code: normalized, ticket: res.ticket });
        refreshCounts();
      } else {
        const tk: TicketInfo = await api.verify(normalized, eventId);
        if (!tk.sold) show({ tone: 'bad', title: t('door.notAssigned'), detail: t('door.notAssignedHint'), code: normalized, ticket: tk });
        else if (tk.checkin) show({ tone: 'warn', title: t('door.already'), detail: describe(tk), code: normalized, ticket: tk });
        else show({ tone: 'ok', title: t('door.valid'), detail: describe(tk), code: normalized, ticket: tk, canCheckIn: true });
      }
    } catch (err) {
      const data = (err as { response?: { status?: number; data?: { result?: string; ticket?: TicketInfo } } })?.response;
      const result = data?.data?.result;
      const tk = data?.data?.ticket;
      if (result === 'already_checked_in') show({ tone: 'warn', title: t('door.already'), detail: describe(tk), code: normalized, ticket: tk });
      else if (result === 'not_sold') show({ tone: 'bad', title: t('door.notAssigned'), detail: t('door.notAssignedHint'), code: normalized, ticket: tk });
      else if (result === 'wrong_event') show({ tone: 'bad', title: t('door.wrongEvent'), detail: t('door.wrongEventHint', { event: tk?.event?.name ?? '?' }), code: normalized, ticket: tk });
      else if (data?.status === 404) show({ tone: 'bad', title: t('door.unknown'), detail: t('door.unknownHint'), code: normalized });
      else show({ tone: 'bad', title: t('door.error'), detail: errorMessage(err, t('common.error')), code: normalized });
    } finally {
      busyRef.current = false;
      setBusy(false);
      refocus();
    }
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const value = code.trim();
    setCode('');
    if (value) run(value, auto ? 'checkin' : 'verify');
  };

  if (!events.length) {
    return (
      <div>
        <PageHeader title={t('nav.door')} />
        <EmptyState title={t('dash.noEvents')}>{t('dash.noEventsStaff')}</EmptyState>
      </div>
    );
  }

  const tones: Record<Tone, string> = {
    ok: 'border-okline bg-okbg text-ok',
    warn: 'border-warn bg-warnbg text-warn',
    bad: 'border-dangerline bg-dangerbg text-danger',
  };

  return (
    <div>
      <PageHeader title={t('nav.door')} subtitle={t('door.subtitle')} actions={<EventPicker className="w-72 max-w-full" />} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card bodyClassName="p-5 sm:p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="door-code" className="mb-1.5 block text-sm font-semibold">
                    {auto ? t('door.scanAuto') : t('door.scanVerify')}
                  </label>
                  <input
                    id="door-code"
                    ref={inputRef}
                    value={code}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                    placeholder="K7M3P-9QXR2"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (/[\r\n]/.test(raw)) {
                        setCode('');
                        run(raw.replace(/[\r\n]+/g, ''), auto ? 'checkin' : 'verify');
                        return;
                      }
                      setCode(raw);
                    }}
                    className="h-14 w-full rounded border-2 border-linestrong bg-surface px-4 font-mono text-xl tracking-wider text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>
                <Button type="submit" size="lg" loading={busy} disabled={!code.trim()}>
                  {auto ? t('door.checkin') : t('door.verify')}
                </Button>
              </div>
          {outcome ? (
            <div className={clsx('rounded-2xl border-2 p-5 sm:p-8', tones[outcome.tone])} role="status" aria-live="assertive">
              <div className="font-display text-3xl font-bold sm:text-5xl">{outcome.title}</div>
              {outcome.detail && <div className="mt-3 text-lg font-semibold text-ink">{outcome.detail}</div>}
              <div className="mt-2 font-mono text-sm opacity-80">{outcome.code}</div>
              {outcome.ticket?.checked_in_at && outcome.tone === 'warn' && (
                <div className="mt-1 text-sm text-ink">
                  {t('door.checkedAt', { time: fmtTime(outcome.ticket.checked_in_at) })}
                  {outcome.ticket.checked_in_by ? ` · ${outcome.ticket.checked_in_by}` : ''}
                </div>
              )}
              {outcome.canCheckIn && (
                <Button className="mt-4" size="lg" variant="success" onClick={() => run(outcome.code, 'checkin')} loading={busy}>
                  {t('door.checkinNow')}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-linestrong p-5 text-center text-soft sm:p-8">{t('door.waiting')}</div>
          )}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={auto ? 'primary' : 'secondary'} size="sm" onClick={() => setAuto((v) => !v)}>
                  {t('door.auto')}: {auto ? t('common.on') : t('common.off')}
                </Button>
                <Button variant={camera ? 'primary' : 'secondary'} size="sm" onClick={() => setCamera((v) => !v)}>
                  <IconCamera size={16} /> {camera ? t('door.cameraHide') : t('door.camera')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setSearchOpen(true)}>
                  <IconSearch size={16} /> {t('door.findByName')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setWalkInOpen(true)}>
                  <IconUserPlus size={16} /> {t('door.walkIn')}
                </Button>
              </div>
              {camera && <CameraScanner onDetected={(c) => run(c, auto ? 'checkin' : 'verify')} onClose={() => setCamera(false)} paused={busy} />}
            </form>
          </Card>

        </div>

        <div className="space-y-6">
          <Card title={event?.name} subtitle={t('door.liveCount')}>
            {counts ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface2 p-3">
                  <div className="text-xs font-semibold text-soft">{t('stat.checkedIn')}</div>
                  <div className="text-3xl font-bold">{fmtNumber(counts.checked_in)}</div>
                </div>
                <div className="rounded-lg bg-surface2 p-3">
                  <div className="text-xs font-semibold text-soft">{t('stat.expected')}</div>
                  <div className="text-3xl font-bold">{fmtNumber(Math.max(0, counts.sold - counts.checked_in))}</div>
                </div>
                <div className="col-span-2 text-xs text-soft">
                  {t('door.countLine', { assigned: fmtNumber(counts.sold), walkins: fmtNumber(counts.walk_ins) })}
                </div>
              </div>
            ) : (
              <Loading />
            )}
          </Card>
          <Card title={t('door.recent')} bodyClassName="p-0">
            {history.length === 0 ? (
              <p className="px-5 py-6 text-sm text-soft">{t('door.recentEmpty')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {history.map((h) => (
                  <li key={h.at} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', h.tone === 'ok' ? 'bg-ok' : h.tone === 'warn' ? 'bg-warn' : 'bg-danger')} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{h.title}</div>
                      <div className="truncate text-xs text-soft">{h.ticket?.name || h.code}</div>
                    </div>
                    <span className="tabular text-xs text-soft">{fmtTime(new Date(h.at).toISOString())}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {walkInOpen && eventId && (
        <WalkInModal
          eventId={eventId}
          onClose={() => {
            setWalkInOpen(false);
            setTimeout(() => inputRef.current?.focus(), 60);
          }}
          onDone={(tk) => {
            show({ tone: 'ok', title: t('door.walkInOk'), detail: describe(tk), code: tk.ticket_code, ticket: tk });
            refreshCounts();
          }}
        />
      )}
      {searchOpen && eventId && (
        <NameSearchModal
          eventId={eventId}
          onClose={() => {
            setSearchOpen(false);
            setTimeout(() => inputRef.current?.focus(), 60);
          }}
          onCheckIn={(c) => run(c, 'checkin')}
        />
      )}
    </div>
  );
}

function WalkInModal({ eventId, onClose, onDone }: { eventId: number; onClose: () => void; onDone: (t: TicketInfo) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await api.walkIn(eventId, { name: name.trim() || undefined, guest_category: category });
      onDone(res.ticket);
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
      title={t('door.walkIn')}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save()} loading={saving}>{t('door.walkInSave')}</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-soft">{t('door.walkInHint')}</p>
        <Input label={t('field.guestNameOptional')} value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
        <div>
          <div className="mb-1.5 text-sm font-semibold">{t('field.categoryOptional')}</div>
          <CategoryChips value={category} onChange={setCategory} />
        </div>
      </form>
    </Modal>
  );
}

function NameSearchModal({ eventId, onClose, onCheckIn }: { eventId: number; onClose: () => void; onCheckIn: (code: string) => void }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<TicketRow[] | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRows(null);
      return undefined;
    }
    const id = setTimeout(async () => {
      try {
        const res = await api.tickets({ event_id: eventId, search: term, per_page: 30 });
        setRows(res.data);
      } catch {
        setRows([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q, eventId]);

  return (
    <Modal open wide title={t('door.findByName')} onClose={onClose}>
      <Input placeholder={t('door.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4">
        {rows === null ? (
          <p className="text-sm text-soft">{t('door.searchHint')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-soft">{t('common.noResults')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold">{r.name || t('door.noName')}</div>
                  <div className="text-xs text-soft">
                    <span className="font-mono">{r.ticket_code}</span> · #{r.ticket_number}
                    {r.guest_category ? ` · ${t(categoryKey(r.guest_category))}` : ''}
                  </div>
                </div>
                {r.checkin ? (
                  <span className="text-sm font-semibold text-ok">{t('door.alreadyShort', { time: fmtTime(r.checked_in_at) })}</span>
                ) : !r.sold_at ? (
                  <span className="text-sm font-semibold text-danger">{t('status.unassigned')}</span>
                ) : (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => {
                      onCheckIn(r.ticket_code);
                      onClose();
                    }}
                  >
                    {t('door.checkin')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
