import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useAuth } from '../../state/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { CameraScanner } from '../components/CameraScanner';
import { api } from '../../lib/api';
import { normalizeTicketCode } from '../../lib/ticketCode';

type TicketInfo = {
  id: number;
  ticket_number: number;
  ticket_code: string;
  name?: string | null;
  sold: boolean;
  checkin: boolean;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  event?: { id: number; name: string } | null;
  ticket_type?: { id: number; name: string; kind: string } | null;
};

type Stats = {
  total: number;
  sold: number;
  unsold: number;
  checked_in: number;
};

type HistoryItem = {
  id: number | string;
  ticket_code?: string | null;
  action: 'verify' | 'checkin' | 'sell' | 'refund';
  status: string;
  success: boolean;
  name?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    username: string;
  } | null;
};

type ScanOutcome = {
  tone: 'ok' | 'warn' | 'bad';
  title: string;
  detail?: string;
  code: string;
  ticket?: TicketInfo | null;
};

const MAX_HISTORY_ITEMS = 50;
const AUTO_KEY = 'ts_auto_checkin';
const EVENT_KEY = 'ts_dashboard_event';

type EventSummary = { id: number; name: string; starts_at?: string | null };

function feedback(tone: ScanOutcome['tone']) {
  try {
    navigator.vibrate?.(tone === 'ok' ? 120 : [80, 60, 80, 60, 200]);
  } catch {
    /* not supported */
  }
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = tone === 'ok' ? 880 : 220;
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

function describeTicket(t?: TicketInfo | null) {
  if (!t) return undefined;
  const parts = [t.name || 'No name', t.ticket_type?.name, t.event?.name, `#${t.ticket_number}`].filter(Boolean);
  return parts.join(' · ');
}

export function DashboardPage() {
  const { user } = useAuth();
  const roleId = user?.role_id ?? 0;
  const canSell = roleId >= 3;
  const canCheckin = roleId >= 2 && roleId !== 3;
  const canSeeHistory = roleId >= 2;
  const canClearHistory = roleId >= 5;
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState<number | null>(() => Number(localStorage.getItem(EVENT_KEY)) || null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sellTicket, setSellTicket] = useState({ ticket: '', name: '' });
  const [selling, setSelling] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [autoCheckin, setAutoCheckin] = useState(() => localStorage.getItem(AUTO_KEY) !== '0');
  const [cameraFor, setCameraFor] = useState<'door' | 'sell' | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sellNameRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const historyRef = useRef<HistoryItem[]>([]);
  const historyInitialLoadRef = useRef(false);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    localStorage.setItem(AUTO_KEY, autoCheckin ? '1' : '0');
  }, [autoCheckin]);

  useEffect(() => {
    if (!user || roleId < 2) return;
    api
      .eventSummaries()
      .then((list: EventSummary[]) => {
        setEvents(list);
        // Default to the most recently created event (highest id) unless a valid choice is stored.
        setEventId((current) =>
          current && list.some((e) => e.id === current) ? current : list.length ? Math.max(...list.map((e) => e.id)) : null,
        );
      })
      .catch(() => {});
  }, [user, roleId]);

  useEffect(() => {
    if (eventId) localStorage.setItem(EVENT_KEY, String(eventId));
  }, [eventId]);

  const updateStats = useCallback(async () => {
    if (!user || roleId < 2 || !eventId) return;
    try {
      setStats(await api.stats(eventId));
    } catch {
      /* ignore */
    }
  }, [user, roleId, eventId]);

  useEffect(() => {
    if (!user || roleId < 2 || !eventId) return;
    setLoadingStats(true);
    updateStats().finally(() => setLoadingStats(false));
  }, [user, roleId, eventId, updateStats]);

  const loadHistory = useCallback(
    async (withSpinner = false) => {
      if (withSpinner) setHistoryLoading(true);
      try {
        const data: HistoryItem[] = await api.ticketActivity();
        const prevHistory = historyRef.current;
        if (!historyInitialLoadRef.current || prevHistory.length === 0) {
          historyInitialLoadRef.current = true;
          setHistory(data);
          return;
        }
        const currentTopId = prevHistory[0]?.id;
        const firstExistingIndex = data.findIndex((item) => item.id === currentTopId);
        const newEntries = firstExistingIndex === -1 ? data : data.slice(0, Math.max(0, firstExistingIndex));
        if (newEntries.length === 0) return;
        setHistory((prev) => [...newEntries, ...prev].slice(0, MAX_HISTORY_ITEMS));
        if (newEntries.some((entry) => entry.action !== 'verify')) {
          updateStats();
        }
      } catch {
        /* ignore */
      } finally {
        if (withSpinner) setHistoryLoading(false);
      }
    },
    [updateStats],
  );

  useEffect(() => {
    if (!canSeeHistory) {
      setHistory([]);
      historyRef.current = [];
      historyInitialLoadRef.current = false;
      return undefined;
    }
    loadHistory(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadHistory();
    }, 5000);
    return () => clearInterval(interval);
  }, [canSeeHistory, loadHistory]);

  const clearHistory = async () => {
    if (!canClearHistory) return;
    if (!window.confirm('Clear the whole activity history for everyone?')) return;
    setClearingHistory(true);
    try {
      await api.clearTicketActivity();
      historyInitialLoadRef.current = false;
      historyRef.current = [];
      setHistory([]);
      await loadHistory(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to clear history.');
    } finally {
      setClearingHistory(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((val) => (val === message ? null : val)), 4000);
  };

  const refocus = () => setTimeout(() => inputRef.current?.focus(), 50);

  const handleSell = async () => {
    const ticket = normalizeTicketCode(sellTicket.ticket);
    const name = sellTicket.name.trim();
    if (!ticket || !user) return;
    if (!name) {
      showToast('Enter the guest / buyer name.');
      sellNameRef.current?.focus();
      return;
    }
    setSelling(true);
    try {
      const sold: TicketInfo = await api.sell(ticket, { name });
      await updateStats();
      setSellTicket({ ticket: '', name: '' });
      showToast(`Sold ${sold.ticket_code} to ${sold.name}.`);
      feedback('ok');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to sell ticket.');
      feedback('bad');
    } finally {
      setSelling(false);
      if (canSeeHistory) loadHistory();
    }
  };

  const runDoorAction = async (raw: string, mode: 'verify' | 'checkin') => {
    const code = normalizeTicketCode(raw);
    if (!code || !user || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (mode === 'checkin') {
        const res = await api.checkin(code);
        setOutcome({ tone: 'ok', title: 'ENTRY OK', detail: describeTicket(res.ticket), code, ticket: res.ticket });
        feedback('ok');
        updateStats();
      } else {
        const t: TicketInfo = await api.verify(code);
        const tone: ScanOutcome['tone'] = !t.sold ? 'bad' : t.checkin ? 'warn' : 'ok';
        const title = !t.sold ? 'NOT SOLD' : t.checkin ? 'ALREADY CHECKED IN' : 'VALID';
        setOutcome({ tone, title, detail: describeTicket(t), code, ticket: t });
        feedback(tone);
      }
    } catch (err: any) {
      const data = err?.response?.data ?? {};
      const result = data.result as string | undefined;
      const title =
        result === 'already_checked_in'
          ? 'ALREADY CHECKED IN'
          : result === 'not_sold'
            ? 'NOT SOLD — REFUSE'
            : err?.response?.status === 404
              ? 'UNKNOWN TICKET'
              : 'ERROR';
      const tone: ScanOutcome['tone'] = result === 'already_checked_in' ? 'warn' : 'bad';
      const detail = [data.message || (err?.response ? undefined : 'Network error — check connection.'), describeTicket(data.ticket)]
        .filter(Boolean)
        .join(' — ');
      setOutcome({ tone, title, detail, code, ticket: data.ticket });
      feedback(tone);
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (canSeeHistory) loadHistory();
      refocus();
    }
  };

  const submitTicketCode = (raw?: string) => {
    const value = (raw ?? codeInput).trim();
    setCodeInput('');
    if (!value) return;
    runDoorAction(value, autoCheckin ? 'checkin' : 'verify');
  };

  const onCameraCode = (raw: string) => {
    if (cameraFor === 'sell') {
      setSellTicket((prev) => ({ ...prev, ticket: normalizeTicketCode(raw) }));
      setCameraFor(null);
      feedback('ok');
      setTimeout(() => sellNameRef.current?.focus(), 50);
      return;
    }
    submitTicketCode(raw);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitTicketCode(codeInput);
    }
  };

  const handleTicketFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitTicketCode(codeInput);
  };

  const outcomeClass =
    outcome?.tone === 'ok'
      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
      : outcome?.tone === 'warn'
        ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
        : 'border-red-400/60 bg-red-500/25 text-red-100';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">Ticket operations and at-a-glance metrics.</p>
        </div>
        {toast && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 shadow">{toast}</div>
        )}
      </div>

      {roleId >= 2 && events.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-400" htmlFor="dashboard-event">
            Counters for event
          </label>
          <select
            id="dashboard-event"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white"
            value={eventId ?? ''}
            onChange={(e) => setEventId(Number(e.target.value))}
          >
            {[...events]
              .sort((a, b) => b.id - a.id)
              .map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {roleId >= 2 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(
            [
              ['Total', 'total'],
              ['Sold', 'sold'],
              ['Unsold', 'unsold'],
              ['Checked in', 'checked_in'],
            ] as const
          ).map(([label, key]) => (
            <Card key={label} className="bg-slate-900/80">
              <div className="text-sm uppercase tracking-wide text-slate-400">{label}</div>
              <div className="text-3xl font-bold text-white">{loadingStats ? <Spinner /> : stats ? stats[key] : '--'}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canCheckin && (
            <Card
              title="Door check-in"
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button variant={autoCheckin ? 'primary' : 'ghost'} onClick={() => setAutoCheckin((prev) => !prev)}>
                    Auto check-in {autoCheckin ? 'ON' : 'OFF'}
                  </Button>
                  <Button variant="ghost" onClick={() => setCameraFor(cameraFor === 'door' ? null : 'door')}>
                    {cameraFor === 'door' ? 'Hide camera' : 'Camera'}
                  </Button>
                </div>
              }
            >
              <form className="space-y-4" onSubmit={handleTicketFormSubmit}>
                <Input
                  label={autoCheckin ? 'Scan ticket (checks in immediately)' : 'Scan ticket (verify only)'}
                  value={codeInput}
                  name="ticket_code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  placeholder="e.g. K7M3P-9QXR2"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw.includes('\n') || raw.includes('\r')) {
                      submitTicketCode(raw.replace(/[\r\n]+/g, ''));
                      return;
                    }
                    setCodeInput(raw);
                  }}
                  onKeyDown={handleKeyDown}
                  ref={inputRef}
                />
                <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1}>
                  Submit
                </button>

                {cameraFor === 'door' && <CameraScanner onDetected={onCameraCode} onClose={() => setCameraFor(null)} paused={busy} />}

                <div className="flex flex-wrap gap-3">
                  <Button variant="ghost" type="button" onClick={() => runDoorAction(codeInput, 'verify')} disabled={busy || !codeInput}>
                    Verify only
                  </Button>
                  <Button variant="primary" type="button" onClick={() => runDoorAction(codeInput, 'checkin')} disabled={busy || !codeInput}>
                    Check in
                  </Button>
                  {outcome?.tone === 'ok' && outcome.title === 'VALID' && !autoCheckin && (
                    <Button variant="primary" type="button" onClick={() => runDoorAction(outcome.code, 'checkin')} disabled={busy}>
                      Check in {outcome.code}
                    </Button>
                  )}
                </div>

                {busy && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Spinner /> Checking…
                  </div>
                )}

                {outcome && !busy && (
                  <div className={`rounded-2xl border-2 p-5 ${outcomeClass}`} role="status" aria-live="assertive">
                    <div className="text-3xl font-black tracking-wide">{outcome.title}</div>
                    <div className="mt-1 font-mono text-lg">{outcome.code}</div>
                    {outcome.detail && <div className="mt-2 text-base">{outcome.detail}</div>}
                    {outcome.ticket?.checked_in_at && outcome.tone !== 'ok' && (
                      <div className="mt-1 text-sm opacity-80">
                        Checked in {new Date(outcome.ticket.checked_in_at).toLocaleTimeString()}
                        {outcome.ticket.checked_in_by ? ` by ${outcome.ticket.checked_in_by}` : ''}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </Card>
          )}

          {canSell && (
            <Card
              title="Sell / assign ticket"
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => setCameraFor(cameraFor === 'sell' ? null : 'sell')}>
                    {cameraFor === 'sell' ? 'Hide camera' : 'Camera'}
                  </Button>
                  <Button onClick={handleSell} disabled={!sellTicket.ticket || selling}>
                    {selling ? 'Selling…' : 'Sell'}
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Ticket code"
                  value={sellTicket.ticket}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="Scan or type"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw.includes('\n') || raw.includes('\r')) {
                      setSellTicket((prev) => ({ ...prev, ticket: normalizeTicketCode(raw.replace(/[\r\n]+/g, '')) }));
                      sellNameRef.current?.focus();
                      return;
                    }
                    setSellTicket((prev) => ({ ...prev, ticket: raw }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sellNameRef.current?.focus();
                    }
                  }}
                />
                <Input
                  label="Guest / buyer name"
                  value={sellTicket.name}
                  ref={sellNameRef}
                  onChange={(e) => setSellTicket((prev) => ({ ...prev, name: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSell();
                    }
                  }}
                />
              </div>
              {cameraFor === 'sell' && (
                <div className="mt-4">
                  <CameraScanner onDetected={onCameraCode} onClose={() => setCameraFor(null)} />
                </div>
              )}
            </Card>
          )}
        </div>

        <Card
          title="Activity history"
          actions={
            canClearHistory ? (
              <Button variant="ghost" onClick={clearHistory} disabled={clearingHistory || history.length === 0}>
                {clearingHistory ? 'Clearing…' : 'Clear history'}
              </Button>
            ) : undefined
          }
        >
          <div className="activity-scroll max-h-[480px] space-y-3 overflow-y-auto pr-1">
            {!canSeeHistory && <p className="text-sm text-slate-500">History is available to check-in roles.</p>}
            {canSeeHistory && historyLoading && history.length === 0 && <p className="text-sm text-slate-500">Loading history…</p>}
            {canSeeHistory && !historyLoading && history.length === 0 && <p className="text-sm text-slate-500">No recent actions yet.</p>}
            {canSeeHistory &&
              history.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                    <span className="uppercase">{item.action}</span>
                  </div>
                  <div className="font-mono text-base font-semibold text-white">{item.ticket_code ?? '—'}</div>
                  <div className={item.success ? 'text-emerald-300' : 'text-red-300'}>{item.status}</div>
                  {item.name && <div className="text-xs text-slate-400">Guest: {item.name}</div>}
                  {item.user && (
                    <div className="text-xs text-slate-500">
                      by {item.user.name} ({item.user.username})
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
