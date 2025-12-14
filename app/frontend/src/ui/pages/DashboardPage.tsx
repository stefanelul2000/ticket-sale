import { useEffect, useRef, useState } from 'react';
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

type HistoryItem = { time: string; code: string; action: 'verify' | 'checkin' | 'sell'; status: string; success: boolean; name?: string };

export function DashboardPage() {
  const { user } = useAuth();
  const roleId = user?.role_id ?? 0;
  const canSell = roleId >= 3;
  const canCheckin = roleId >= 2 && roleId !== 3;
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sellTicket, setSellTicket] = useState({ ticket: '', name: '' });
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verifyResult, setVerifyResult] = useState<Ticket | null>(null);
  const [autoCheckin, setAutoCheckin] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingStats(true);
    api
      .stats()
      .then((res) => setStats(res))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [user]);

  const updateStats = async () => {
    if (!user) return;
    try {
      const res = await api.stats();
      setStats(res);
    } catch {
      /* ignore */
    }
  };

  const pushHistory = (entry: HistoryItem) => {
    setHistory((prev) => [entry, ...prev].slice(0, 20));
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((val) => (val === message ? null : val)), 4000);
  };

  const handleSell = async () => {
    if (!sellTicket.ticket || !user) return;
    const actionTime = new Date().toLocaleTimeString();
    try {
      await api.sell(sellTicket.ticket, { name: sellTicket.name });
      await updateStats();
      pushHistory({
        time: actionTime,
        code: sellTicket.ticket,
        action: 'sell',
        status: 'Sold',
        success: true,
        name: sellTicket.name,
      });
      setSellTicket({ ticket: '', name: '' });
      showToast('Ticket sold.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to sell ticket.';
      pushHistory({
        time: actionTime,
        code: sellTicket.ticket,
        action: 'sell',
        status: msg,
        success: false,
        name: sellTicket.name,
      });
      showToast(msg);
    }
  };

  const handleVerify = async () => {
    if (!verifyNumber || !user) return;
    if (!verifyNumber.includes('_')) {
      showToast('Please scan/enter the full ticket code (e.g., 4_001).');
      return;
    }
    const actionTime = new Date().toLocaleTimeString();
    try {
      const res = await api.verify(verifyNumber);
      setVerifyResult(res);
      pushHistory({
        time: actionTime,
        code: verifyNumber,
        action: 'verify',
        status: res.checkin ? 'Already checked-in' : 'Valid',
        success: true,
        name: res.name,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ticket not found.';
      pushHistory({
        time: actionTime,
        code: verifyNumber,
        action: 'verify',
        status: msg,
        success: false,
      });
      showToast(msg);
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
    const actionTime = new Date().toLocaleTimeString();
    try {
      await api.checkin(target);
      if (verifyResult && (verifyResult.ticket_code === target || String(verifyResult.ticket_number) === target)) {
        setVerifyResult({ ...verifyResult, checkin: true });
      }
      await updateStats();
      pushHistory({
        time: actionTime,
        code: target,
        action: 'checkin',
        status: 'Checked in',
        success: true,
        name: verifyResult?.name,
      });
      showToast('Checked in.');
      if (autoCheckin) {
        setScanStatus('success');
        setVerifyNumber('');
        setTimeout(() => setScanStatus('idle'), 1000);
        inputRef.current?.focus();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to check in.';
      pushHistory({
        time: actionTime,
        code: target,
        action: 'checkin',
        status: msg,
        success: false,
        name: verifyResult?.name,
      });
      showToast(msg);
      if (autoCheckin) {
        setScanStatus('error');
        setVerifyNumber('');
        setTimeout(() => setScanStatus('idle'), 1000);
        inputRef.current?.focus();
      }
    }
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
              <div className="space-y-4">
                <Input
                  label="Ticket code"
                  value={verifyNumber}
                  onChange={(e) => setVerifyNumber(e.target.value)}
                  ref={inputRef}
                />
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary" onClick={handleVerify}>
                    Verify
                  </Button>
                  <Button variant="ghost" onClick={() => handleCheckin()}>
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
              </div>
            </Card>
          )}
        </div>

        <Card title="Activity history">
          <div className="space-y-3">
            {history.length === 0 && <p className="text-sm text-slate-500">No recent actions yet.</p>}
            {history.map((item) => (
              <div
                key={`${item.time}-${item.code}-${item.action}`}
                className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 text-sm"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{item.time}</span>
                  <span>{item.action}</span>
                </div>
                <div className="text-base font-semibold text-white">{item.code}</div>
                <div className={item.success ? 'text-emerald-300' : 'text-red-300'}>{item.status}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

