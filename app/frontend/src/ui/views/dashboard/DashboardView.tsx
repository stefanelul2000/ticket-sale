import React, { useState, useRef } from 'react';
import { api } from '../../../lib/api';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { inputStyle } from '../../styles';

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

type Props = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  logout: () => Promise<void> | void;
  canSell: boolean;
  canCheckin: boolean;
  user: any;
  loadStats: () => Promise<void>;
  stats: Stats | null;
  showToast: (message: string) => void;
};

export function DashboardView({ header, sidebar, logout, canSell, canCheckin, user, loadStats, stats, showToast }: Props) {
  const [sellTicket, setSellTicket] = useState({ ticket: '', name: '' });
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verifyResult, setVerifyResult] = useState<Ticket | null>(null);
  const [autoCheckin, setAutoCheckin] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSell = async () => {
    if (!sellTicket.ticket || !user) return;
    const actionTime = new Date().toLocaleTimeString();
    try {
      await api.sell(sellTicket.ticket, {
        name: sellTicket.name,
      });
      await loadStats();
      setSellTicket({ ticket: '', name: '' });
      setHistory((prev) => [{ time: actionTime, code: sellTicket.ticket, action: 'sell' as const, status: 'Sold', success: true, name: sellTicket.name }, ...prev].slice(0, 20));
      showToast('Ticket sold.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to sell ticket.';
      setHistory((prev) => [{ time: actionTime, code: sellTicket.ticket, action: 'sell' as const, status: msg, success: false, name: sellTicket.name }, ...prev].slice(0, 20));
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
      setHistory((prev) => [{ time: actionTime, code: verifyNumber, action: 'verify' as const, status: res.checkin ? 'Already checked-in' : 'Valid', success: true, name: res.name }, ...prev].slice(0, 20));
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ticket not found.';
      setHistory((prev) => [{ time: actionTime, code: verifyNumber, action: 'verify' as const, status: msg, success: false }, ...prev].slice(0, 20));
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
      await loadStats();
      setHistory((prev) => [{ time: actionTime, code: target, action: 'checkin' as const, status: 'Checked in', success: true, name: verifyResult?.name }, ...prev].slice(0, 20));
      showToast('Checked in.');
      
      if (autoCheckin) {
        setScanStatus('success');
        setVerifyNumber('');
        setTimeout(() => setScanStatus('idle'), 1000);
        inputRef.current?.focus();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to check in.';
      setHistory((prev) => [{ time: actionTime, code: target, action: 'checkin' as const, status: msg, success: false, name: verifyResult?.name }, ...prev].slice(0, 20));
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
    <Layout header={header} sidebar={sidebar} onLogout={logout}>
      <div className="two-col" style={{ display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {canSell && (
            <Card title="Sell Ticket">
              <div className="sell-ticket-form">
                <input
                  placeholder="Ticket #"
                  value={sellTicket.ticket}
                  onChange={(e) => setSellTicket({ ...sellTicket, ticket: e.target.value })}
                  style={inputStyle}
                />
                <input
                  placeholder="Name"
                  value={sellTicket.name}
                  onChange={(e) => setSellTicket({ ...sellTicket, name: e.target.value })}
                  style={inputStyle}
                />
                <Button onClick={handleSell}>Sell</Button>
              </div>
            </Card>
          )}

          {canCheckin && (
            <Card
              title="Verify / Check-in"
              action={
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    onClick={() => {
                      const next = !autoCheckin;
                      setAutoCheckin(next);
                      if (next) setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      minWidth: 140,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      lineHeight: 1.1,
                      letterSpacing: 0.1,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: autoCheckin ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: autoCheckin ? 'rgba(67,217,173,0.1)' : 'transparent',
                      color: autoCheckin ? 'var(--accent)' : 'var(--muted)',
                      transition: '0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        border: autoCheckin ? 'none' : '2px solid var(--muted)',
                        background: autoCheckin ? 'var(--accent)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {autoCheckin && (
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#0b101a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    Auto Check-in
                  </div>
                  <div
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      minWidth: 100,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      lineHeight: 1.1,
                      letterSpacing: 0.1,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: showHistory ? '1px solid var(--text)' : '1px solid var(--border)',
                      background: showHistory ? 'rgba(255,255,255,0.06)' : 'transparent',
                      color: showHistory ? 'var(--text)' : 'var(--muted)',
                      transition: '0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        border: showHistory ? 'none' : '2px solid var(--muted)',
                        background: showHistory ? 'var(--text)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {showHistory && (
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#0b101a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    History
                  </div>
                </div>
              }
            >
              <div style={{ display: 'grid', gap: 10 }}>
                {autoCheckin && <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Rapid Scan Active: Scans will check-in immediately.</div>}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    ref={inputRef}
                    placeholder={autoCheckin ? "Scan to check-in..." : "Scan or enter ticket # / barcode"}
                    value={verifyNumber}
                    inputMode="numeric"
                    onChange={(e) => setVerifyNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && autoCheckin) {
                        handleCheckin(verifyNumber);
                      }
                    }}
                    onBlur={() => {
                      if (autoCheckin) {
                        setTimeout(() => inputRef.current?.focus(), 200);
                      }
                    }}
                    style={{
                      ...inputStyle,
                      minWidth: 220,
                      flex: '1 1 200px',
                      borderColor:
                        scanStatus === 'success'
                          ? '#43d9ad'
                          : scanStatus === 'error'
                          ? '#ff8c8c'
                          : 'var(--border)',
                      boxShadow:
                        scanStatus === 'success'
                          ? '0 0 0 2px rgba(67, 217, 173, 0.2)'
                          : scanStatus === 'error'
                          ? '0 0 0 2px rgba(255, 140, 140, 0.2)'
                          : 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                  />
                  <Button variant="ghost" onClick={handleVerify}>
                    Verify
                  </Button>
                  <Button onClick={() => handleCheckin()} disabled={!verifyNumber}>
                    Check-in
                  </Button>
                </div>
                {verifyResult && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--muted)' }}>
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        background: verifyResult.checkin ? 'rgba(67,217,173,0.12)' : 'rgba(255,184,108,0.12)',
                        color: verifyResult.checkin ? '#43d9ad' : '#ffb86c',
                        fontWeight: 700,
                      }}
                    >
                      {verifyResult.checkin ? 'Checked in' : 'Valid'}
                    </div>
                    <div>{verifyResult.ticket_code || verifyResult.ticket_number}</div>
                    <div>
                      {verifyResult.sold_at
                        ? (verifyResult.name || 'Sold ticket')
                        : 'Valid, not sold'}
                    </div>
                  </div>
                )}
                {showHistory && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'grid', gap: 6 }}>
                    {history.length === 0 && <div style={{ color: 'var(--muted)' }}>No recent scans.</div>}
                    {history.map((h, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'center',
                          fontSize: 13,
                          color: 'var(--muted)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '8px 10px',
                        }}
                      >
                        <span style={{ color: h.success ? '#43d9ad' : '#ff8c8c', fontWeight: 700 }}>{h.status}</span>
                        <span>{h.code}</span>
                        <span>{h.name || ''}</span>
                        <span style={{ marginLeft: 'auto' }}>{h.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

        </div>

        <div style={{ display: 'grid', gap: 16, alignSelf: 'start' }}>
          <div style={{ alignSelf: 'start' }}>
          <Card title="Stats">
            {stats ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <Metric label="Total" value={stats.total} />
                <Metric label="Sold" value={stats.sold} />
                <Metric label="Unsold" value={stats.unsold} />
                <Metric label="Checked in" value={stats.checked_in} />
              </div>
            ) : (
              <div style={{ color: 'var(--muted)' }}>No stats yet.</div>
            )}
          </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
