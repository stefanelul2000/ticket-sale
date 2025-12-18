import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useAuth } from '../../state/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { api } from '../../lib/api';

type Ticket = {
  id: number;
  ticket_number: number;
  ticket_code?: string;
  code?: string;
  name?: string;
  sold_at?: string;
  checkin: boolean;
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
  action: 'verify' | 'checkin' | 'sell';
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

const MAX_HISTORY_ITEMS = 50;

export function DashboardPage() {
  const { user } = useAuth();
  const roleId = user?.role_id ?? 0;
  const canSell = roleId >= 3;
  const canCheckin = roleId >= 2 && roleId !== 3;
  const canSeeHistory = roleId >= 2;
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sellTicket, setSellTicket] = useState({ ticket: '', name: '' });
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verifyResult, setVerifyResult] = useState<Ticket | null>(null);
  const [autoCheckin, setAutoCheckin] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number | string | null>(null);
  const historyInitialLoadRef = useRef(false);
  const historyRef = useRef<HistoryItem[]>([]);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    if (!user) return;
    setLoadingStats(true);
    api
      .stats()
      .then((res) => setStats(res))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [user]);

  const updateStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.stats();
      setStats(res);
    } catch {
      /* ignore */
    }
  }, [user]);

  const loadHistory = useCallback(
    async (withSpinner = false) => {
      if (withSpinner) {
        setHistoryLoading(true);
      }
      try {
        const data: HistoryItem[] = await api.ticketActivity();
        const prevHistory = historyRef.current;
        if (!historyInitialLoadRef.current || prevHistory.length === 0) {
          historyInitialLoadRef.current = true;
          lastActivityRef.current = data[0]?.id ?? null;
          setHistory(data);
          return;
        }

        const currentTopId = prevHistory[0]?.id;
        const firstExistingIndex = data.findIndex((item) => item.id === currentTopId);
        const newEntries =
          firstExistingIndex === -1 ? data : data.slice(0, Math.max(0, firstExistingIndex));

        if (newEntries.length === 0) {
          return;
        }

        lastActivityRef.current = newEntries[0]?.id ?? lastActivityRef.current;
        setHistory((prev) => [...newEntries, ...prev].slice(0, MAX_HISTORY_ITEMS));

        if (newEntries.some((entry) => entry.action === 'sell' || entry.action === 'checkin')) {
          updateStats();
        }
      } catch {
        /* ignore */
      } finally {
        if (withSpinner) {
          setHistoryLoading(false);
        }
      }
    },
    [updateStats],
  );

  useEffect(() => {
    if (!canSeeHistory) {
      setHistory([]);
      historyRef.current = [];
      historyInitialLoadRef.current = false;
      lastActivityRef.current = null;
      setHistoryLoading(false);
      if (historyIntervalRef.current) {
        clearInterval(historyIntervalRef.current);
        historyIntervalRef.current = null;
      }
      return undefined;
    }

    loadHistory(true);
    historyIntervalRef.current = setInterval(() => {
      loadHistory();
    }, 5000);

    return () => {
      if (historyIntervalRef.current) {
        clearInterval(historyIntervalRef.current);
        historyIntervalRef.current = null;
      }
    };
  }, [canSeeHistory, loadHistory]);

  const clearHistory = async () => {
    if (!canSeeHistory) return;
    setClearingHistory(true);
    try {
      await api.clearTicketActivity();
      historyInitialLoadRef.current = false;
      lastActivityRef.current = null;
      historyRef.current = [];
      setHistory([]);
      await loadHistory(true);
    } catch {
      /* ignore */
    } finally {
      setClearingHistory(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((val) => (val === message ? null : val)), 4000);
  };

  const handleSell = async () => {
    if (!sellTicket.ticket || !user) return;
    try {
      await api.sell(sellTicket.ticket, { name: sellTicket.name });
      await updateStats();
      setSellTicket({ ticket: '', name: '' });
      showToast('Ticket sold.');
      loadHistory();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to sell ticket.';
      showToast(msg);
      loadHistory();
    }
  };

  const handleVerify = async (ticketCode?: string) => {
    const target = ticketCode ?? verifyNumber;
    if (!target || !user) return;
    if (!target.includes('_')) {
      showToast('Please scan/enter the full ticket code (e.g., 4_001).');
      return;
    }
    try {
      const res = await api.verify(target);
      setVerifyResult(res);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ticket not found.';
      showToast(msg);
    } finally {
      loadHistory();
    }
  };

  const handleCheckin = async (ticketNumber?: string | number) => {
    const target = ticketNumber !== undefined ? String(ticketNumber) : verifyNumber || null;
    if (!target || !user) return;
    if (!target.includes('_')) {
      showToast('Please scan/enter the full ticket code (e.g., 4_001).');
      if (autoCheckin) {
        setScanStatus('error');
        setVerifyNumber('');
        setTimeout(() => setScanStatus('idle'), 1000);
        inputRef.current?.focus();
      }
      return;
    }
    try {
      await api.checkin(target);
      if (verifyResult && (verifyResult.ticket_code === target || String(verifyResult.ticket_number) === target)) {
        setVerifyResult({ ...verifyResult, checkin: true });
      }
      await updateStats();
      showToast('Checked in.');
      if (autoCheckin) {
        setScanStatus('success');
        setVerifyNumber('');
        setTimeout(() => setScanStatus('idle'), 1000);
        inputRef.current?.focus();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to check in.';
      showToast(msg);
      if (autoCheckin) {
        setScanStatus('error');
        setVerifyNumber('');
        setTimeout(() => setScanStatus('idle'), 1000);
        inputRef.current?.focus();
      }
    } finally {
      loadHistory();
    }
  };

  const submitTicketCode = (code?: string) => {
    const value = (code ?? verifyNumber)?.trim();
    if (!value) return;

    if (autoCheckin) {
      handleCheckin(value);
    } else {
      handleVerify(value);
    }
    setVerifyNumber('');
  };

  // 1. Direct handler for Key Down events
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitTicketCode(verifyNumber);
    }
  };

  const handleTicketFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitTicketCode(verifyNumber);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">Ticket operations and at-a-glance metrics.</p>
        </div>
        {toast && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 shadow">
            {toast}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Total', 'Sold', 'Unsold', 'Checked In'].map((label, index) => {
          const key = ['total', 'sold', 'unsold', 'checked_in'][index] as keyof Stats;
          return (
            <Card key={label} className="bg-slate-900/80">
              <div className="text-sm uppercase tracking-wide text-slate-400">{label}</div>
              <div className="text-3xl font-bold text-white">
                {loadingStats ? <Spinner /> : stats ? stats[key] : '--'}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canSell && (
            <Card
              title="Sell Ticket"
              actions={
                <Button onClick={handleSell} disabled={!sellTicket.ticket}>
                  Sell
                </Button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Ticket #"
                  value={sellTicket.ticket}
                  onChange={(e) => setSellTicket((prev) => ({ ...prev, ticket: e.target.value }))}
                />
                <Input
                  label="Buyer name"
                  value={sellTicket.name}
                  onChange={(e) => setSellTicket((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </Card>
          )}

          {canCheckin && (
            <Card
              title="Verify / Check-in"
              actions={
                <Button variant={autoCheckin ? 'primary' : 'ghost'} onClick={() => setAutoCheckin((prev) => !prev)}>
                  Auto check-in {autoCheckin ? 'ON' : 'OFF'}
                </Button>
              }
            >
              <form className="space-y-4" onSubmit={handleTicketFormSubmit}>
                <Input
                  label="Ticket code"
                  value={verifyNumber}
                  name="ticket_code"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw.includes('\n') || raw.includes('\r')) {
                      const cleaned = raw.replace(/[\r\n]+/g, '');
                      setVerifyNumber(cleaned);
                      submitTicketCode(cleaned);
                      return;
                    }
                    setVerifyNumber(raw);
                  }}
                  onKeyDown={handleKeyDown} // Attached listener here
                  ref={inputRef}
                />
                
                {/* We keep this as a backup */}
                <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1}>
                  Submit
                </button>
                
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary" type="button" onClick={() => handleVerify()}>
                    Verify
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => handleCheckin()}>
                    Check-in
                  </Button>
                </div>
                {verifyResult && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                    <p className="font-semibold">{verifyResult.name || `Ticket ${verifyResult.ticket_number}`}</p>
                    <p>Status: {verifyResult.checkin ? 'Checked in' : 'Valid'}.</p>
                  </div>
                )}
                {autoCheckin && (
                  <div
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      scanStatus === 'success'
                        ? 'bg-green-500/10 text-green-200'
                        : scanStatus === 'error'
                          ? 'bg-red-500/10 text-red-200'
                          : 'bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    Auto mode: {scanStatus === 'idle' ? 'waiting for scan' : scanStatus}
                  </div>
                )}
              </form>
            </Card>
          )}
        </div>

        <Card
          title="Activity history"
          actions={
            <Button variant="ghost" onClick={clearHistory} disabled={!canSeeHistory || clearingHistory || history.length === 0}>
              {!canSeeHistory ? 'Insufficient role' : clearingHistory ? 'Clearing…' : 'Clear history'}
            </Button>
          }
        >
          <div className="activity-scroll space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {!canSeeHistory && <p className="text-sm text-slate-500">History is available to check-in roles.</p>}
            {canSeeHistory && historyLoading && history.length === 0 && <p className="text-sm text-slate-500">Loading history…</p>}
            {canSeeHistory && !historyLoading && history.length === 0 && <p className="text-sm text-slate-500">No recent actions yet.</p>}
            {canSeeHistory &&
              history.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                    <span>{item.action}</span>
                  </div>
                  <div className="text-base font-semibold text-white">{item.ticket_code ?? '—'}</div>
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
