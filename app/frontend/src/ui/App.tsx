import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import JsBarcode from 'jsbarcode';
import JSZip from 'jszip';
import { useAuth } from '../state/useAuth';
import { useTheme } from '../state/useTheme';
import { Layout } from './components/Layout';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { ThemeControls } from './components/ThemeControls';

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

type RoleWithPerms = {
  id: number;
  name: string;
  permissions: { id: number; key: string; name: string }[];
};

type Permission = { id: number; key: string; name: string };
type EventType = {
  id: number;
  name: string;
  capacity?: number | null;
  tickets_generated?: number;
  tickets_sold?: number;
};
type TicketTypeModel = { id: number; name: string; kind: string; price: number; event_id: number };
type UserModel = { id: number; name: string; email: string; username: string; role_id: number; active?: boolean; role?: { id: number; name: string } };
type GeneratedBundle = { eventId: number; eventName: string; ticketTypeName: string; codes: string[]; count: number };
type HistoryItem = { time: string; code: string; action: 'verify' | 'checkin' | 'sell'; status: string; success: boolean; name?: string };

export function App() {
  const { user, login, logout, fetchMe, loading, error } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const isImpersonating = Boolean((user as any)?.impersonating);
  const roleId = user?.role_id ?? (user as any)?.role?.id ?? 0;
  const isAdmin = roleId >= 5; // admin or site owner
  const canManageEvents = roleId >= 4; // event manager or above
  const canSell = roleId >= 3;
  const canCheckin = roleId >= 2 && roleId !== 3; // seller (3) should not check-in
  const { setTheme, logoUrl } = useTheme();
  const [form, setForm] = useState({ username: '', password: '', remember: true });
  const [stats, setStats] = useState<Stats | null>(null);
  const [sellTicket, setSellTicket] = useState({ ticket: '', name: '' });
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verifyResult, setVerifyResult] = useState<Ticket | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'setup' | 'app' | 'admin' | 'events'>('login');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkedSetup, setCheckedSetup] = useState<boolean>(() => Boolean(sessionStorage.getItem('setupChecked')));
  const [setupForm, setSetupForm] = useState({
    db_host: '',
    db_name: '',
    db_user: '',
    db_password: '',
    name: '',
    email: '',
    username: '',
    password: '',
    password_confirmation: '',
    mail_mailer: '',
    mail_host: '',
    mail_port: '',
    mail_username: '',
    mail_password: '',
    mail_from_address: '',
    mail_from_name: '',
  });
  const [setupError, setSetupError] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState('');
  const [setupStep, setSetupStep] = useState(0);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [rolesPerms, setRolesPerms] = useState<RoleWithPerms[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeModel[]>([]);
  const [newEvent, setNewEvent] = useState({ name: '', capacity: '' });
  const [newTicketType, setNewTicketType] = useState({ event_id: '', name: '', price: '', kind: 'paid' });
  const [ticketGenerateByEvent, setTicketGenerateByEvent] = useState<Record<number, { ticket_type_id: string; count: string; open: boolean }>>({});
  const [eventEdits, setEventEdits] = useState<Record<number, { editing: boolean; name: string; capacity: string }>>({});
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [invite, setInvite] = useState({ name: '', email: '', username: '', password: '', role_id: '3' });
  const [adminSection, setAdminSection] = useState<'branding' | 'users' | 'roles' | 'impersonate'>('branding');
  const [eventSection, setEventSection] = useState<'events' | 'tickets'>('events');
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', username: '', password: '', password_confirmation: '' });
  const [registerError, setRegisterError] = useState('');
  const registerEmailInvalid = registerForm.email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(registerForm.email);
  const registerPasswordChecks = [
    { label: 'Min 12 characters', ok: registerForm.password.length >= 12 },
    { label: 'Upper & lower case', ok: /[a-z]/.test(registerForm.password) && /[A-Z]/.test(registerForm.password) },
    { label: 'Number', ok: /\d/.test(registerForm.password) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(registerForm.password) },
  ];
  const registerConfirmOk = registerForm.password.length > 0 && registerForm.password === registerForm.password_confirmation;
  const [registerNotice, setRegisterNotice] = useState<string>('');
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [modal, setModal] = useState<{
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [generatedBundle, setGeneratedBundle] = useState<GeneratedBundle | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  // remove stale reference; all gating uses the computed isAdmin above

  const emailInvalid =
    setupForm.email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(setupForm.email);

  const passwordChecks = [
    { label: 'Min 12 characters', ok: setupForm.password.length >= 12 },
    { label: 'Upper & lower case', ok: /[a-z]/.test(setupForm.password) && /[A-Z]/.test(setupForm.password) },
    { label: 'Number', ok: /\d/.test(setupForm.password) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(setupForm.password) },
    { label: 'Matches confirmation', ok: setupForm.password === setupForm.password_confirmation && setupForm.password.length > 0 },
  ];

  const mailHint = 'Optional: leave blank to log emails; fill to use SMTP.';

  const isLoading = (key: string) => Boolean(loadingKeys[key]);

  const withLoading = async (key: string, fn: () => Promise<void>) => {
    setLoadingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      await fn();
    } finally {
      setLoadingKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ id, message });
    setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, 4000);
  };

  const ToastPortal = toast ? (
    <div
      style={{
        position: 'fixed',
        bottom: 18,
        right: 18,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'rgba(15, 22, 36, 0.9)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        zIndex: 2000,
        maxWidth: 320,
      }}
    >
      {toast.message}
    </div>
  ) : null;

  const ModalPortal = modal ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2100,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'rgba(15, 22, 36, 0.96)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '18px 20px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
          color: 'var(--text)',
        }}
      >
        {modal.title && <div style={{ fontWeight: 700, marginBottom: 8 }}>{modal.title}</div>}
        <div style={{ marginBottom: 14, color: 'var(--muted)' }}>{modal.message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={() => setModal(null)}>
            {modal.cancelLabel || 'Cancel'}
          </Button>
          <Button
            onClick={async () => {
              await modal.onConfirm();
            }}
          >
            {modal.confirmLabel || 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const createBarcodeDataUrl = (code: string) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width: 3,
      height: 90,
      margin: 12,
      background: '#ffffff',
      lineColor: '#000000',
      displayValue: true,
      fontSize: 16,
    });
    return canvas.toDataURL('image/png');
  };

  const dataUrlToUint8 = (url: string) => {
    const base64 = url.split(',')[1];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const downloadCsv = (bundle: GeneratedBundle) => {
    const rows = ['ticket_code,event_id,ticket_type,count'];
    bundle.codes.forEach((code) => rows.push(`${code},${bundle.eventId},"${bundle.ticketTypeName}",1`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bundle.eventName}-tickets.csv`;
    link.click();
  };

  const downloadBarcodesPng = (bundle: GeneratedBundle) => {
    const max = 300;
    const subset = bundle.codes.slice(0, max);
    if (!subset.length) {
      showToast('No codes to download.');
      return;
    }
    const lineHeight = 110;
    const width = 560;
    const height = subset.length * lineHeight + 40;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    subset.forEach((code, idx) => {
      const temp = document.createElement('canvas');
      JsBarcode(temp, code, { format: 'CODE128', width: 3, height: 90, margin: 12, background: '#ffffff', lineColor: '#000000', displayValue: true, fontSize: 16 });
      ctx.drawImage(temp, 20, 10 + idx * lineHeight);
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${bundle.eventName}-barcodes.png`;
    link.click();
    if (bundle.codes.length > max) {
      showToast(`Downloaded first ${max} barcodes. Use CSV for full list.`);
    }
  };

  const downloadBarcodesZip = async (bundle: GeneratedBundle) => {
    const max = 500;
    const subset = bundle.codes.slice(0, max);
    if (!subset.length) {
      showToast('No codes to download.');
      return;
    }
    await withLoading('zip-barcodes', async () => {
      const zip = new JSZip();
      subset.forEach((code) => {
        const dataUrl = createBarcodeDataUrl(code);
        const bytes = dataUrlToUint8(dataUrl);
        zip.file(`${code}.png`, bytes, { binary: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${bundle.eventName}-barcodes.zip`;
      link.click();
      if (bundle.codes.length > max) {
        showToast(`Zipped first ${max} barcodes. Use CSV for full list.`);
      }
    });
  };

  const loadBundleForEvent = async (ev: EventType) => {
    const key = `download-event-${ev.id}`;
    await withLoading(key, async () => {
      try {
        const res = await api.eventTickets(ev.id);
        const codes: string[] = res?.codes || [];
        const count = res?.count ?? codes.length;
        if (!codes.length) {
          showToast('No tickets to download for this event.');
          return;
        }
        setGeneratedBundle({
          eventId: ev.id,
          eventName: ev.name,
          ticketTypeName: 'All ticket types',
          codes,
          count,
        });
        showToast(`Loaded ${count} tickets for download.`);
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Failed to load tickets.';
        showToast(msg);
      }
    });
  };

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (checkedSetup) return;
    api
      .setupStatus()
      .then((res) => {
        setNeedsSetup(res.needsSetup);
        if (res.needsSetup) setView('setup');
        setCheckedSetup(true);
        sessionStorage.setItem('setupChecked', '1');
      })
      .catch(() => {
        // Setup hard-deny (404) or other error -> assume setup done
        setNeedsSetup(false);
        setCheckedSetup(true);
        sessionStorage.setItem('setupChecked', '1');
        if (!user) setView('login');
      });
  }, [checkedSetup, user]);

  useEffect(() => {
    if (user) {
      setView((v) => (v === 'login' ? 'app' : v));
      loadStats();
      if (canManageEvents || isAdmin) {
        loadAdminData();
      }
    } else {
      // clear data to avoid stale draws and stop further calls
      setView('login');
      setStats(null);
      setUsers([]);
    }
  }, [user]);

  useEffect(() => {
    if ((view === 'admin' && isAdmin) || (view === 'events' && canManageEvents)) {
      loadAdminData();
    }
  }, [view, isAdmin, canManageEvents]);

  const loadAdminData = async () => {
    if (!user) return;
    try {
      const [r, p, ev, tt] = await Promise.all([
        api.rolesWithPermissions(),
        api.permissions(),
        api.events(),
        api.ticketTypes(),
      ]);
      setRolesPerms(r);
      setPermissions(p);
      setEvents(ev);
      setTicketTypes(tt);
      const usersRes = await api.users();
      setUsers(usersRes.data || usersRes);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Admin data load failed', err);
      }
    }
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const res = await api.stats();
      setStats(res);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Stats load failed', err);
      }
    }
  };

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
    const actionTime = new Date().toLocaleTimeString();
    try {
      await api.checkin(target);
      if (verifyResult && (verifyResult.ticket_code === target || String(verifyResult.ticket_number) === target)) {
        setVerifyResult({ ...verifyResult, checkin: true });
      }
      await loadStats();
      setHistory((prev) => [{ time: actionTime, code: target, action: 'checkin' as const, status: 'Checked in', success: true, name: verifyResult?.name }, ...prev].slice(0, 20));
      showToast('Checked in.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to check in.';
      setHistory((prev) => [{ time: actionTime, code: target, action: 'checkin' as const, status: msg, success: false, name: verifyResult?.name }, ...prev].slice(0, 20));
      showToast(msg);
    }
  };

  const handleDelete = async (type: string, id: number, successLabel?: string) => {
    if (!user) return;
    const key = `delete-${type}-${id}`;
    await withLoading(key, async () => {
      try {
        switch (type) {
          case 'event':
            await api.deleteEvent(id);
            setEvents((prev) => prev.filter((e) => e.id !== id));
            break;
          case 'ticket':
            await api.deleteTicketType(id);
            setTicketTypes((prev) => prev.filter((e) => e.id !== id));
            break;
          case 'user':
            await api.deleteUser(id);
            setUsers((prev) => prev.filter((e) => e.id !== id));
            break;
        }
        showToast(successLabel || 'Deleted successfully.');
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Delete failed.';
        showToast(msg);
      }
    });
  };

  const publicNav = needsSetup ? (
    <div style={{ display: 'flex', gap: 10 }}>
      <Button variant={view === 'setup' ? 'solid' : 'ghost'} onClick={() => setView('setup')}>
        Setup
      </Button>
    </div>
  ) : null;

  const navButtonStyle = (active: boolean): React.CSSProperties => ({
    width: '100%',
    justifyContent: 'flex-start',
    border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.18)',
    background: active
      ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
      : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
    color: active ? '#0b101a' : '#d7e2fb',
    boxShadow: active ? '0 14px 32px rgba(0,0,0,0.32)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
    fontWeight: 700,
    borderRadius: 14,
    padding: '14px 16px',
    fontSize: 15,
  });

  const sidebarNav = user ? (
    <div style={{ display: 'grid', gap: 10 }}>
      <Button style={navButtonStyle(view === 'app')} variant="ghost" onClick={() => setView('app')}>
        Dashboard
      </Button>
      {canManageEvents && (
        <Button
          style={navButtonStyle(view === 'events')}
          variant="ghost"
          onClick={() => {
            setView('events');
            setEventSection('events');
          }}
        >
          Events
        </Button>
      )}
      {isAdmin && (
        <Button style={navButtonStyle(view === 'admin')} variant="ghost" onClick={() => setView('admin')}>
          Admin
        </Button>
      )}
    </div>
  ) : null;

  const topbar = user ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {isImpersonating && (
        <>
          <span style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,123,109,0.18)', color: '#ffb0a5', fontWeight: 700 }}>
            Impersonating
          </span>
          <Button
            variant="ghost"
            onClick={async () => {
              await api.stopImpersonate();
              await fetchMe();
            }}
          >
            Stop
          </Button>
        </>
      )}
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>
        Hi, {user.name || (user as any)?.username || 'User'}
      </div>
      <Button variant="ghost" onClick={logout}>
        Logout
      </Button>
    </div>
  ) : null;

  if (!user && view === 'login') {
    return (
      <>
      <Layout header={publicNav}>
        <div style={{ display: 'grid', gap: 16, maxWidth: 420, margin: '80px auto 0', textAlign: 'center' }}>
          {(setupSuccess || registerNotice) && (
            <Card>
              {setupSuccess && <div style={{ color: '#43d9ad', fontWeight: 600 }}>Setup completed successfully. Please log in.</div>}
              {registerNotice && <div style={{ color: '#ffb86c', fontWeight: 600 }}>{registerNotice}</div>}
            </Card>
          )}
          <Card title="Login" titleAlign="center">
            <form
              style={{ display: 'grid', gap: 12 }}
              onSubmit={(e) => {
                e.preventDefault();
                setLoginError(null);
                if (!form.username && !form.password) {
                  setLoginError('No login data supplied.');
                  return;
                }
                if (!form.username) {
                  setLoginError('The username field is required.');
                  return;
                }
                if (!form.password) {
                  setLoginError('The password field is required.');
                  return;
                }
                login(form.username, form.password, form.remember).catch(() => {
                  setLoginError('Invalid credentials.');
                });
              }}
            >
              <input
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#d7e2fb',
                  fontSize: 14,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.35)',
                    background: '#0f1624',
                    accentColor: '#43d9ad',
                  }}
                />
                Remember me on this device
              </label>
              {(loginError || error) && <div style={{ color: '#ff8c8c' }}>{loginError || 'Invalid credentials.'}</div>}
              <Button disabled={loading} type="submit">
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setView('register')}>
                Create account
              </Button>
            </form>
          </Card>
        </div>
      </Layout>
      {ToastPortal}
      {ModalPortal}
      </>
    );
  }

  if (!user && view === 'register') {
    return (
      <>
      <Layout header={publicNav}>
        <div style={{ display: 'grid', gap: 16, maxWidth: 460, margin: '0 auto' }}>
          <Card title="Register">
            <form
              style={{ display: 'grid', gap: 12 }}
              onSubmit={async (e) => {
                e.preventDefault();
                setRegisterError('');
                setRegisterNotice('');
                if (!registerForm.name || !registerForm.email || !registerForm.username || !registerForm.password || !registerForm.password_confirmation) {
                  setRegisterError('Please fill out all fields.');
                  return;
                }
                if (registerEmailInvalid) {
                  setRegisterError('Please enter a valid email.');
                  return;
                }
                if (!registerPasswordChecks.every((rule) => rule.ok)) {
                  setRegisterError('Password does not meet requirements.');
                  return;
                }
                if (!registerConfirmOk) {
                  setRegisterError('Passwords must match.');
                  return;
                }
                try {
                  await api.register(registerForm);
                  setRegisterNotice('Account submitted for approval. An admin must activate your access before you can log in.');
                  setView('login');
                } catch (err: any) {
                  setRegisterError(err?.response?.data?.message || 'Registration failed. Please try again.');
                }
              }}
            >
              <input
                placeholder="Full name"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                style={inputStyle}
              />
              {registerEmailInvalid && <div style={{ color: '#ff8c8c', fontSize: 13 }}>Please enter a valid email.</div>}
              <input
                placeholder="Username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                style={inputStyle}
              />
              {registerForm.password.length > 0 && (
                <div style={{ display: 'grid', gap: 4, textAlign: 'left' }}>
                  {registerPasswordChecks.map((rule) => (
                    <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: rule.ok ? '#43d9ad' : '#ff8c8c', fontSize: 13 }}>
                      <span>{rule.ok ? '✓' : '•'}</span>
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="password"
                placeholder="Confirm password"
                value={registerForm.password_confirmation}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password_confirmation: e.target.value })
                }
                style={inputStyle}
              />
              {registerForm.password_confirmation.length > 0 && (
                <div style={{ textAlign: 'left', color: registerConfirmOk ? '#43d9ad' : '#ff8c8c', fontSize: 13 }}>
                  {registerConfirmOk ? 'Matches password' : 'Must match password'}
                </div>
              )}
              {registerError && <div style={{ color: '#ff8c8c', fontSize: 13, textAlign: 'left' }}>{registerError}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <Button variant="ghost" type="button" onClick={() => setView('login')}>
                  Back to login
                </Button>
                <Button type="submit">Create account</Button>
              </div>
            </form>
          </Card>
        </div>
      </Layout>
      {ToastPortal}
      {ModalPortal}
      </>
    );
  }

  if (view === 'setup') {
    if (!needsSetup && !isAdmin) {
      setView('app');
      return null;
    }
    const handleSetup = async () => {
      setSetupError(null);
      try {
        await api.setup(setupForm);
        setNeedsSetup(false);
        setSetupSuccess(true);
        sessionStorage.setItem('setupChecked', '1');
        setView('login');
      } catch (err: any) {
        setSetupError(err.response?.data?.message || 'Setup failed');
      }
    };

    const handleLogoUpload = async (file: File) => {
      setSetupError(null);
      const formData = new FormData();
      formData.append('logo', file);
      try {
        const res = await api.uploadLogo(formData);
        setTheme({ logoUrl: res.url });
        setLogoFileName(file.name);
      } catch (err: any) {
        setSetupError(err.response?.data?.message || 'Logo upload failed');
      }
    };

    const steps = [
      {
        title: 'Database',
        content: (
          <div style={{ display: 'grid', gap: 10 }}>
            {['db_host', 'db_name', 'db_user', 'db_password'].map((field) => (
              <input
                key={field}
                type={field === 'db_password' ? 'password' : 'text'}
                placeholder={field.replace('db_', 'DB ').toUpperCase()}
                value={(setupForm as any)[field]}
                onChange={(e) => setSetupForm({ ...setupForm, [field]: e.target.value })}
                style={inputStyle}
              />
            ))}
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              Example (Docker dev): host <code>db</code>, database <code>ticket_sale</code>, user
              <code>ticket_user</code>, password <code>ticket_pass</code>.
            </p>
          </div>
        ),
      },
      {
        title: 'Admin user',
        content: (
          <div style={{ display: 'grid', gap: 12 }}>
            <input
              placeholder="Name"
              value={setupForm.name}
              onChange={(e) => setSetupForm({ ...setupForm, name: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Email"
              value={setupForm.email}
              onChange={(e) => setSetupForm({ ...setupForm, email: e.target.value })}
              style={inputStyle}
            />
            {emailInvalid && <div style={{ color: '#ff8c8c', fontSize: 13 }}>Please enter a valid email.</div>}
            <input
              placeholder="Username"
              value={setupForm.username}
              onChange={(e) => setSetupForm({ ...setupForm, username: e.target.value })}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password (min 12 chars, mixed case, number, symbol)"
              value={setupForm.password}
              onChange={(e) => setSetupForm({ ...setupForm, password: e.target.value })}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={setupForm.password_confirmation}
              onChange={(e) => setSetupForm({ ...setupForm, password_confirmation: e.target.value })}
              style={inputStyle}
            />
            <div style={{ display: 'grid', gap: 4 }}>
              {passwordChecks.map((rule) => (
                <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: rule.ok ? '#43d9ad' : '#ff8c8c', fontSize: 13 }}>
                  <span>{rule.ok ? '✓' : '•'}</span>
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        title: 'Mail (optional)',
        content: (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{mailHint}</div>
            <input
              placeholder="MAIL_MAILER (smtp/log)"
              value={(setupForm as any).mail_mailer || ''}
              onChange={(e) => setSetupForm({ ...setupForm, mail_mailer: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="MAIL_HOST"
              value={(setupForm as any).mail_host || ''}
              onChange={(e) => setSetupForm({ ...setupForm, mail_host: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="MAIL_PORT"
              value={(setupForm as any).mail_port || ''}
              onChange={(e) => setSetupForm({ ...setupForm, mail_port: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="MAIL_USERNAME"
              value={(setupForm as any).mail_username || ''}
              onChange={(e) => setSetupForm({ ...setupForm, mail_username: e.target.value })}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="MAIL_PASSWORD"
              value={(setupForm as any).mail_password || ''}
              onChange={(e) => setSetupForm({ ...setupForm, mail_password: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="MAIL_FROM_ADDRESS"
              value={(setupForm as any).mail_from_address || ''}
              onChange={(e) => setSetupForm({ ...setupForm, mail_from_address: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="MAIL_FROM_NAME"
              value={(setupForm as any).mail_from_name || setupForm.name}
              onChange={(e) => setSetupForm({ ...setupForm, mail_from_name: e.target.value })}
              style={inputStyle}
            />
          </div>
        ),
      },
      {
        title: 'Branding (optional)',
        content: (
          <div style={{ display: 'grid', gap: 12 }}>
            <ThemeControls allowed />
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ color: 'var(--muted)' }}>Logo URL</label>
              <input
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setTheme({ logoUrl: e.target.value })}
                style={inputStyle}
              />
              <label style={{ color: 'var(--muted)' }}>Or upload a logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label
                  htmlFor="logo-upload"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Upload
                </label>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                  {logoFileName || 'No file chosen'}
                </span>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files && handleLogoUpload(e.target.files[0])}
                />
              </div>
            </div>
          </div>
        ),
      },
    ];

    return (
      <>
      <Layout header={user ? topbar : publicNav}>
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {steps.map((step, idx) => (
              <div
                key={step.title}
                onClick={() => setSetupStep(idx)}
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: idx === setupStep ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  color: 'var(--text)',
                  fontWeight: 600,
                }}
              >
                {idx + 1}. {step.title}
              </div>
            ))}
          </div>

          <Card title={steps[setupStep].title}>{steps[setupStep].content}</Card>

          {setupError && <div style={{ color: '#ff8c8c' }}>{setupError}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="ghost" disabled={setupStep === 0} onClick={() => setSetupStep((s) => Math.max(0, s - 1))}>
              Back
            </Button>
            {setupStep < steps.length - 1 ? (
              <Button onClick={() => setSetupStep((s) => Math.min(steps.length - 1, s + 1))}>Next</Button>
            ) : (
              <Button onClick={handleSetup}>Complete Setup</Button>
            )}
          </div>
        </div>
      </Layout>
      {ToastPortal}
      {ModalPortal}
      </>
    );
  }

  if (view === 'events' && user && canManageEvents) {
    const eventTabs: { key: typeof eventSection; label: string }[] = [
      { key: 'events', label: 'Events' },
      { key: 'tickets', label: 'Ticket Types' },
    ];

    const renderEventSection = () => {
      switch (eventSection) {
        case 'events':
          return (
            <Card
              title="Events"
              action={
                <Button
                  variant={showAddEvent ? 'solid' : 'ghost'}
                  onClick={() => setShowAddEvent((v) => !v)}
                >
                  {showAddEvent ? 'Cancel' : 'Add event'}
                </Button>
              }
            >
              <div style={{ height: 4 }} />

              {showAddEvent && (
                <div className="event-add-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input
                    placeholder="Event name"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    placeholder="Capacity"
                    value={newEvent.capacity}
                    onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                    style={inputStyle}
                  />
                  <Button
                    onClick={async () => {
                      if (!newEvent.name) {
                        showToast('Event name is required.');
                        return;
                      }
                      let capNum: number | null = null;
                      if (newEvent.capacity.trim() !== '') {
                        const parsed = Number(newEvent.capacity);
                        if (!Number.isFinite(parsed) || parsed < 0) {
                          showToast('Capacity must be a non-negative number.');
                          return;
                        }
                        capNum = parsed;
                      }
                      const created = await api.createEvent({
                        name: newEvent.name,
                        capacity: capNum,
                      });
                      setEvents((prev) => [...prev, created]);
                      setNewEvent({ name: '', capacity: '' });
                      setShowAddEvent(false);
                      showToast(`Event "${created.name}" created.`);
                    }}
                  >
                    Create
                  </Button>
                </div>
              )}

              <div style={{ display: 'grid', gap: 8 }}>
                {events.map((ev) => {
                  const saving = isLoading(`save-event-${ev.id}`);
                  const deleting = isLoading(`delete-event-${ev.id}`);
                  const generating = isLoading(`generate-event-${ev.id}`);
                  return (
                  <div key={ev.id} style={{ display: 'grid', gap: 10, border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {eventEdits[ev.id]?.editing ? (
                          <>
                            <label style={{ color: 'var(--muted)', fontSize: 13 }}>Event name</label>
                            <input
                              value={eventEdits[ev.id]?.name ?? ev.name}
                              onChange={(e) =>
                                setEventEdits((prev) => ({
                                  ...prev,
                                  [ev.id]: {
                                    ...(prev[ev.id] || { editing: true, name: ev.name, capacity: ev.capacity?.toString() || '' }),
                                    name: e.target.value,
                                  },
                                }))
                              }
                              style={inputStyle}
                            />
                            <label style={{ color: 'var(--muted)', fontSize: 13 }}>Capacity</label>
                            <input
                              value={eventEdits[ev.id]?.capacity ?? (ev.capacity?.toString() || '')}
                              placeholder="Capacity"
                              onChange={(e) =>
                                setEventEdits((prev) => ({
                                  ...prev,
                                  [ev.id]: {
                                    ...(prev[ev.id] || { editing: true, name: ev.name, capacity: ev.capacity?.toString() || '' }),
                                    capacity: e.target.value,
                                  },
                                }))
                              }
                              style={inputStyle}
                            />
                          </>
                        ) : (
                          <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                            {ev.name}
                          </div>
                        )}
                      <div style={{ display: 'flex', gap: 14, color: 'var(--muted)', fontSize: 13, flexWrap: 'wrap' }}>
                        <span>Capacity: <strong style={{ color: 'var(--text)' }}>{ev.capacity ?? '—'}</strong></span>
                        <span>Generated: <strong style={{ color: 'var(--text)' }}>{ev.tickets_generated ?? 0}</strong></span>
                        <span>Sold: <strong style={{ color: 'var(--text)' }}>{ev.tickets_sold ?? 0}</strong></span>
                        {ev.capacity ? (
                            <span>
                              Remaining capacity:{' '}
                              <strong style={{ color: 'var(--text)' }}>
                                {Math.max(0, ev.capacity - (ev.tickets_generated || 0))}
                              </strong>
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="event-row-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <Button
                          variant="ghost"
                          disabled={saving}
                          onClick={async () => {
                            const current = eventEdits[ev.id];
                            if (!current?.editing) {
                              setEventEdits((prev) => ({
                                ...prev,
                                [ev.id]: { editing: true, name: ev.name, capacity: ev.capacity?.toString() || '' },
                              }));
                              return;
                            }
                            if (!current.name.trim()) {
                              showToast('Event name is required.');
                              return;
                            }
                            const capStr = current.capacity ?? '';
                            let payloadCapacity: number | null = null;
                            if (capStr.trim() !== '') {
                              const capNum = Number(capStr);
                              if (!Number.isFinite(capNum) || capNum < 0) {
                                showToast('Capacity must be a non-negative number.');
                                return;
                              }
                              if (ev.tickets_generated && capNum < ev.tickets_generated) {
                                showToast(`Capacity cannot be less than tickets already generated (${ev.tickets_generated}).`);
                                return;
                              }
                              payloadCapacity = capNum;
                            } else {
                              showToast('Capacity is required.');
                              return;
                            }
                            await withLoading(`save-event-${ev.id}`, async () => {
                              try {
                                const updated = await api.updateEvent(ev.id, {
                                  name: current.name.trim(),
                                  capacity: payloadCapacity,
                                });
                                setEvents((prev) => prev.map((e) => (e.id === ev.id ? updated : e)));
                                setEventEdits((prev) => ({ ...prev, [ev.id]: { editing: false, name: updated.name, capacity: updated.capacity?.toString() || '' } }));
                                showToast(`Saved event "${updated.name}".`);
                              } catch (err: any) {
                                const msg = err?.response?.data?.message || 'Failed to save event.';
                                showToast(msg);
                                setEventEdits((prev) => ({ ...prev, [ev.id]: { editing: true, name: current.name, capacity: current.capacity ?? '' } }));
                              }
                            });
                          }}
                        >
                          {eventEdits[ev.id]?.editing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={deleting}
                          onClick={() =>
                            setModal({
                              title: 'Delete event',
                              message: `Are you sure you want to delete "${ev.name}"? This will remove its ticket types and tickets.`,
                              confirmLabel: deleting ? 'Deleting...' : 'Delete',
                              onConfirm: async () => {
                                await handleDelete('event', ev.id, `Deleted event "${ev.name}".`);
                                setModal(null);
                              },
                            })
                          }
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>

                    <div className="event-generate-row" style={{ display: 'grid', gap: 10, border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                          variant={ticketGenerateByEvent[ev.id]?.open ? 'solid' : 'ghost'}
                          onClick={() =>
                            setTicketGenerateByEvent((prev) => ({
                              ...prev,
                              [ev.id]: { ticket_type_id: '', count: '', open: !prev[ev.id]?.open },
                            }))
                          }
                        >
                          Generate tickets
                        </Button>
                        {ev.tickets_generated ? (
                          <Button
                            variant="ghost"
                            disabled={isLoading(`download-event-${ev.id}`)}
                            onClick={() => loadBundleForEvent(ev)}
                          >
                            {isLoading(`download-event-${ev.id}`) ? 'Loading…' : 'Download tickets'}
                          </Button>
                        ) : null}
                      </div>

                      {ticketGenerateByEvent[ev.id]?.open && (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <select
                              style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)', width: 220 }}
                              value={ticketGenerateByEvent[ev.id]?.ticket_type_id || ''}
                              onChange={(e) =>
                                setTicketGenerateByEvent((prev) => ({
                                  ...prev,
                                  [ev.id]: { ...(prev[ev.id] || { count: '', open: true }), ticket_type_id: e.target.value },
                                }))
                              }
                            >
                              <option value="">Select ticket type</option>
                              {ticketTypes
                                .filter((tt) => tt.event_id === ev.id)
                                .map((tt) => (
                                  <option key={tt.id} value={tt.id}>
                                    {tt.name} ({tt.kind}) - ${tt.price}
                                  </option>
                                ))}
                            </select>
                            <input
                              placeholder="Ticket count"
                              style={{ ...inputStyle, width: 160 }}
                              value={ticketGenerateByEvent[ev.id]?.count || ''}
                              onChange={(e) =>
                                setTicketGenerateByEvent((prev) => ({
                                  ...prev,
                                  [ev.id]: { ...(prev[ev.id] || { ticket_type_id: '', open: true }), count: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Button
                              disabled={generating}
                              onClick={() => {
                                const entry = ticketGenerateByEvent[ev.id];
                                if (!entry?.ticket_type_id || !entry?.count) {
                                  showToast('Select a ticket type and enter a count to generate tickets.');
                                  return;
                                }
                                const count = Number(entry.count);
                                if (!Number.isFinite(count) || count <= 0) {
                                  showToast('Ticket count must be a positive number.');
                                  return;
                                }
                                const capacityValue =
                                  ev.capacity === null || ev.capacity === undefined ? null : Number(ev.capacity);
                                const remaining =
                                  capacityValue === null || Number.isNaN(capacityValue)
                                    ? null
                                    : Math.max(0, capacityValue - (ev.tickets_generated || 0));
                                if (remaining !== null && count > remaining) {
                                  showToast(`Cannot generate ${count} tickets; only ${remaining} remaining for "${ev.name}".`);
                                  return;
                                }
                                const tt = ticketTypes.find((t) => t.id === Number(entry.ticket_type_id));
                                setModal({
                                  title: 'Generate tickets',
                                  message: `Generate ${count} tickets for "${ev.name}"${tt ? ` (${tt.name})` : ''}?`,
                                  confirmLabel: generating ? 'Working...' : 'Generate',
                                  onConfirm: async () => {
                                    await withLoading(`generate-event-${ev.id}`, async () => {
                                      try {
                                        const res = await api.generate({
                                          event_id: ev.id,
                                          ticket_type_id: Number(entry.ticket_type_id),
                                          count,
                                        });
                                        setGeneratedBundle({
                                          eventId: ev.id,
                                          eventName: ev.name,
                                          ticketTypeName: tt?.name || 'Ticket',
                                          codes: res?.codes || [],
                                          count,
                                        });
                                        setEvents((prev) =>
                                          prev.map((x) =>
                                            x.id === ev.id ? { ...x, tickets_generated: (x.tickets_generated || 0) + count } : x
                                          )
                                        );
                                        setTicketGenerateByEvent((prev) => ({
                                          ...prev,
                                          [ev.id]: { ticket_type_id: '', count: '', open: false },
                                        }));
                                        await loadStats();
                                        const formatStart = (data: any, fallback: string) =>
                                          data?.start_code ??
                                          data?.start ??
                                          data?.first_code ??
                                          (Array.isArray(data?.codes) ? data.codes[0] : undefined) ??
                                          fallback;
                                        const formatEnd = (data: any, fallback: string) =>
                                          data?.end_code ??
                                          data?.end ??
                                          (Array.isArray(data?.codes) && data.codes.length ? data.codes[data.codes.length - 1] : undefined) ??
                                          fallback;
                                        const start = formatStart(res, '—');
                                        const end = formatEnd(res, '—');
                                        const range = start !== '—' && end !== '—' ? ` (tickets ${start}–${end})` : '';
                                        showToast(`Generated ${count} tickets for "${ev.name}"${range || '.'}`);
                                      } catch (err: any) {
                                        const msg = err?.response?.data?.message || 'Failed to generate tickets.';
                                        showToast(msg);
                                      }
                                    });
                                    setModal(null);
                                  },
                                });
                              }}
                            >
                              {generating ? 'Working...' : 'Confirm'}
                            </Button>
                          </div>
                        </div>
                      )}
                      {generatedBundle?.eventId === ev.id && (
                        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <button
                          aria-label="Close download panel"
                          onClick={() => setGeneratedBundle(null)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          ×
                        </button>
                        <div style={{ color: 'var(--muted)' }}>
                          Generated {generatedBundle.count} tickets for "{generatedBundle.eventName}" ({generatedBundle.ticketTypeName})
                        </div>
                        <Button variant="ghost" onClick={() => downloadCsv(generatedBundle)}>
                          Download CSV
                        </Button>
                        <Button variant="ghost" onClick={() => downloadBarcodesPng(generatedBundle)}>
                          Download barcodes (PNG)
                        </Button>
                        <Button variant="ghost" onClick={() => downloadBarcodesZip(generatedBundle)}>
                          Download barcodes (ZIP)
                        </Button>
                      </div>
                    )}
                    </div>
                  </div>
                )})}
              </div>
            </Card>
          );
        case 'tickets':
          return (
            <Card title="Ticket Types">
              <div style={{ display: 'grid', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 100px', gap: 8 }}>
                  <select
                    value={newTicketType.event_id}
                    onChange={(e) => setNewTicketType({ ...newTicketType, event_id: e.target.value })}
                    style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)' }}
                  >
                    <option value="">Event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Name"
                    value={newTicketType.name}
                    onChange={(e) => setNewTicketType({ ...newTicketType, name: e.target.value })}
                    style={inputStyle}
                  />
                  <select
                    value={newTicketType.kind}
                    onChange={(e) => setNewTicketType({ ...newTicketType, kind: e.target.value })}
                    style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)' }}
                  >
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                    <option value="donation">Donation</option>
                    <option value="tiered">Tiered</option>
                  </select>
                  <input
                    placeholder="Price"
                    value={newTicketType.price}
                    onChange={(e) => setNewTicketType({ ...newTicketType, price: e.target.value })}
                    style={inputStyle}
                  />
                  <Button
                    onClick={async () => {
                      if (!newTicketType.event_id || !newTicketType.name) return;
                      const created = await api.createTicketType({
                        ...newTicketType,
                        price: Number(newTicketType.price) || 0,
                        event_id: Number(newTicketType.event_id),
                      });
                      setTicketTypes((prev) => [...prev, created]);
                      setNewTicketType({ event_id: '', name: '', price: '', kind: 'paid' });
                      const evName = events.find((e) => String(e.id) === String(created.event_id))?.name || 'event';
                      showToast(`Ticket type "${created.name}" added to "${evName}".`);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {ticketTypes.map((tt) => {
                  const saving = isLoading(`save-ticket-${tt.id}`);
                  const deleting = isLoading(`delete-ticket-${tt.id}`);
                  return (
                  <div key={tt.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px auto', gap: 8, alignItems: 'center' }}>
                    <input
                      value={tt.name}
                      onChange={(e) => setTicketTypes((prev) => prev.map((x) => (x.id === tt.id ? { ...x, name: e.target.value } : x)))}
                      style={inputStyle}
                    />
                    <div style={{ color: 'var(--muted)' }}>{tt.kind}</div>
                    <input
                      value={tt.price}
                      onChange={(e) => setTicketTypes((prev) => prev.map((x) => (x.id === tt.id ? { ...x, price: Number(e.target.value) || 0 } : x)))}
                      style={inputStyle}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        variant="ghost"
                        disabled={saving}
                        onClick={async () => {
                          await withLoading(`save-ticket-${tt.id}`, async () => {
                            const updated = await api.updateTicketType(tt.id, { name: tt.name, price: tt.price });
                            setTicketTypes((prev) => prev.map((x) => (x.id === tt.id ? updated : x)));
                            showToast(`Saved ticket type "${updated.name}".`);
                          });
                        }}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={deleting}
                        onClick={() =>
                          setModal({
                            title: 'Delete ticket type',
                            message: `Delete "${tt.name}"?`,
                            confirmLabel: deleting ? 'Deleting...' : 'Delete',
                            onConfirm: async () => {
                              await handleDelete('ticket', tt.id, `Deleted ticket type "${tt.name}".`);
                              setModal(null);
                            },
                          })
                        }
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )})}
              </div>
            </Card>
          );
        default:
          return null;
      }
    };

    return (
      <>
      <Layout header={topbar} sidebar={sidebarNav}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>Event management</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {eventTabs.map((tab) => (
                <Button
                  key={tab.key}
                  variant={eventSection === tab.key ? 'solid' : 'ghost'}
                  onClick={() => setEventSection(tab.key as typeof eventSection)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    border: eventSection === tab.key ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                    background:
                      eventSection === tab.key
                        ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                        : 'rgba(255,255,255,0.06)',
                    boxShadow: eventSection === tab.key ? '0 12px 30px rgba(0,0,0,0.25)' : 'none',
                    color: eventSection === tab.key ? '#0b101a' : 'var(--text)',
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {renderEventSection()}
        </div>
      </Layout>
      {ToastPortal}
      {ModalPortal}
      </>
    );
  }

  if (view === 'admin' && user && isAdmin) {
    const adminTabs: { key: typeof adminSection; label: string }[] = [
      { key: 'branding', label: 'Branding' },
      { key: 'users', label: 'Users' },
      { key: 'roles', label: 'Roles' },
      { key: 'impersonate', label: 'Impersonate' },
    ];

    const renderSection = () => {
      switch (adminSection) {
        case 'branding':
          return (
            <Card title="Branding">
              <ThemeControls allowed />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: 'var(--muted)' }}>
                <div>Logo preview:</div>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ height: 32 }} />
                ) : (
                  <div style={{ height: 32, width: 32, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', borderRadius: 8 }} />
                )}
              </div>
            </Card>
          );
        case 'roles': {
          const labelMap: Record<number, string> = {
            1: 'Viewer (Reports)',
            2: 'Check-in (Verify/Stats)',
            3: 'Seller (Sell/Stats)',
            4: 'Event Manager',
            5: 'Admin (Full access)',
            6: 'Site Owner (Immutable)',
          };
          const descMap: Record<number, string> = {
            1: 'Can only view reports.',
            2: 'Can verify/check-in tickets and view stats.',
            3: 'Can sell tickets and view stats.',
            4: 'Manage events and ticket types.',
            5: 'Full access; role management and impersonation.',
            6: 'Full access; cannot be altered.',
          };
          const orderedRoles = rolesPerms.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
          return (
            <Card title="Roles & Permissions">
              <div style={{ display: 'grid', gap: 12 }}>
                {orderedRoles.map((role) => {
                  const isLocked = role.id === 5 || role.id === 6;
                  return (
                  <div key={role.id} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{labelMap[role.id] || role.name}</div>
          {descMap[role.id] && (
            <div style={{ color: 'var(--muted)', marginBottom: 8, fontSize: 13 }}>{descMap[role.id]}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 600, color: 'var(--muted)' }}>Manage</div>
              {permissions
                .filter((p) => p.key.startsWith('manage.'))
                .map((perm) => {
                  const has = role.permissions?.some((p) => p.id === perm.id);
                  return (
                    <label
                      key={perm.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '6px 10px',
                        background: has ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'rgba(255,255,255,0.04)',
                        color: has ? '#0b101a' : 'var(--text)',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={has}
                        onChange={
                          isLocked
                            ? undefined
                            : async () => {
                                const next = has
                                  ? role.permissions.filter((p) => p.id !== perm.id).map((p) => p.id)
                                  : [...(role.permissions || []).map((p) => p.id), perm.id];
                                const updated = await api.updateRolePermissions(role.id, next);
                                setRolesPerms((prev) => prev.map((r) => (r.id === role.id ? updated : r)));
                              }
                        }
                        style={{ display: 'none' }}
                      />
                      {perm.name}
                    </label>
                  );
                })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 600, color: 'var(--muted)' }}>View</div>
              {permissions
                .filter((p) => p.key.startsWith('view.'))
                .map((perm) => {
                  const has = role.permissions?.some((p) => p.id === perm.id);
                  return (
                    <label
                      key={perm.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '6px 10px',
                        background: has ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'rgba(255,255,255,0.04)',
                        color: has ? '#0b101a' : 'var(--text)',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={has}
                        onChange={
                          isLocked
                            ? undefined
                            : async () => {
                                const next = has
                                  ? role.permissions.filter((p) => p.id !== perm.id).map((p) => p.id)
                                  : [...(role.permissions || []).map((p) => p.id), perm.id];
                                const updated = await api.updateRolePermissions(role.id, next);
                                setRolesPerms((prev) => prev.map((r) => (r.id === role.id ? updated : r)));
                              }
                        }
                        style={{ display: 'none' }}
                      />
                      {perm.name}
                    </label>
                  );
                })}
            </div>
          </div>
                  </div>
                  );
                })}
              </div>
            </Card>
          );
        }
        case 'users':
          return (
            <Card title="Users">
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 140px auto', gap: 12, marginBottom: 14, alignItems: 'center' }}>
                <input
                  placeholder="Name"
                  value={invite.name}
                  onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                  style={inputStyle}
                />
                <input
                  placeholder="Email (optional)"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                  style={inputStyle}
                />
                <input
                  placeholder="Username"
                  value={invite.username}
                  onChange={(e) => setInvite({ ...invite, username: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="password"
                  placeholder="Temp password"
                  value={invite.password}
                  onChange={(e) => setInvite({ ...invite, password: e.target.value })}
                  style={inputStyle}
                />
                <select
                  value={invite.role_id}
                  onChange={(e) => setInvite({ ...invite, role_id: e.target.value })}
                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)' }}
                >
                  {rolesPerms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={async () => {
                      if (!invite.username || !invite.password || !invite.name) return;
                      await api.createUser({ ...invite, role_id: Number(invite.role_id) });
                      const usersRes = await api.users();
                      setUsers(usersRes.data || usersRes);
                      setInvite({ name: '', email: '', username: '', password: '', role_id: '3' });
                    }}
                  >
                    Invite user
                  </Button>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                {users.map((u) => {
                  const statusLoading = isLoading(`status-user-${u.id}`);
                  const roleLoading = isLoading(`role-user-${u.id}`);
                  const deletingUser = isLoading(`delete-user-${u.id}`);
                  return (
                  <div
                    key={u.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 1fr 150px auto',
                      alignItems: 'center',
                      gap: 12,
                      border: '1px solid var(--border)',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ color: 'var(--muted)' }}>{u.email || '—'}</div>
                    <div style={{ color: 'var(--muted)' }}>@{u.username}</div>
                    <select
                      value={u.role_id}
                      disabled={roleLoading}
                      onChange={async (e) => {
                        const role_id = Number(e.target.value);
                        await withLoading(`role-user-${u.id}`, async () => {
                          await api.updateUserRole(u.id, role_id);
                          setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role_id } : x)));
                          showToast(`Updated role for ${u.name}.`);
                        });
                      }}
                      style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)' }}
                      >
                        {rolesPerms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '6px 10px',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          color: u.active ? '#43d9ad' : '#ff8c8c',
                          minWidth: 72,
                          textAlign: 'center',
                        }}
                      >
                        {u.active ? 'Active' : 'Pending'}
                      </span>
                      <Button
                        variant="ghost"
                        disabled={statusLoading}
                        onClick={async () => {
                          await withLoading(`status-user-${u.id}`, async () => {
                            await api.updateUserStatus(u.id, !u.active);
                            setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
                            showToast(`${u.active ? 'Deactivated' : 'Activated'} ${u.name}.`);
                          });
                        }}
                      >
                        {statusLoading ? 'Working...' : u.active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={deletingUser}
                        onClick={() =>
                          setModal({
                            title: 'Delete user',
                            message: `Delete user "${u.name}"?`,
                            confirmLabel: deletingUser ? 'Deleting...' : 'Delete',
                            onConfirm: async () => {
                              await handleDelete('user', u.id, `Deleted user "${u.name}".`);
                              setModal(null);
                            },
                          })
                        }
                      >
                        {deletingUser ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )})}
              </div>
            </Card>
          );
        case 'impersonate':
          return (
            <Card title="Impersonate a role (admin only)">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <select
                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)', maxWidth: 200 }}
                  onChange={async (e) => {
                    const roleId = Number(e.target.value);
                    if (!roleId) return;
                    await api.impersonate(roleId);
                    await fetchMe();
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select role
                  </option>
                  {rolesPerms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await api.stopImpersonate();
                    await fetchMe();
                  }}
                >
                  Stop impersonating
                </Button>
              </div>
              <div style={{ color: 'var(--muted)' }}>
                This temporarily overrides your role for testing; it does not change your stored role.
              </div>
            </Card>
          );
        default:
          return null;
      }
    };

    return (
      <>
      <Layout header={topbar} sidebar={sidebarNav}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>Admin</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {adminTabs.map((tab) => (
                <Button
                  key={tab.key}
                  variant={adminSection === tab.key ? 'solid' : 'ghost'}
                  onClick={() => setAdminSection(tab.key)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    border: adminSection === tab.key ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                    background:
                      adminSection === tab.key
                        ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                        : 'rgba(255,255,255,0.06)',
                    boxShadow: adminSection === tab.key ? '0 12px 30px rgba(0,0,0,0.25)' : 'none',
                    color: adminSection === tab.key ? '#0b101a' : 'var(--text)',
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {renderSection()}
        </div>
      </Layout>
      {ToastPortal}
      {ModalPortal}
      </>
    );
  }

  return (
    <>
    <Layout header={topbar} sidebar={sidebarNav}>
      <div className="two-col" style={{ display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {canSell && (
            <Card title="Sell Ticket">
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
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
            <Card title="Verify / Check-in">
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    placeholder="Scan or enter ticket # / barcode"
                    value={verifyNumber}
                    inputMode="numeric"
                    onChange={(e) => setVerifyNumber(e.target.value)}
                    style={{ ...inputStyle, minWidth: 220, flex: '1 1 200px' }}
                  />
                  <Button variant="ghost" onClick={handleVerify}>
                    Verify
                  </Button>
                  <Button onClick={() => handleCheckin()} disabled={!verifyNumber}>
                    Check-in
                  </Button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={showHistory}
                      onChange={(e) => setShowHistory(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    Show scan history
                  </label>
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
                    <div>{verifyResult.name || 'Unnamed'}</div>
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
    {ToastPortal}
    {ModalPortal}
    </>
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'rgba(255,255,255,0.03)',
  color: 'var(--text)',
};
