import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../state/useAuth';
import { useTheme, themeDefaults } from '../state/useTheme';
import { Layout } from './components/Layout';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { SetupView } from './views/setup/SetupView';
import { DashboardView } from './views/dashboard/DashboardView';
import { AdminView } from './views/admin/AdminView';
import { EventsView } from './views/events/EventsView';

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

export function App() {
  const { user, logout, fetchMe, loading: authLoading } = useAuth();
  const isImpersonating = Boolean((user as any)?.impersonating);
  const roleId = user?.role_id ?? (user as any)?.role?.id ?? 0;
  const isAdmin = roleId >= 5; // admin or site owner
  const canManageEvents = roleId >= 4; // event manager or above
  const canSell = roleId >= 3;
  const canCheckin = roleId >= 2 && roleId !== 3; // seller (3) should not check-in
  const { setTheme, logoUrl, primary, secondary, background } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  
  const [hasStartedSetup, setHasStartedSetup] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem('ts_setup_started') === '1';
  });
  const [view, setView] = useState<'welcome' | 'login' | 'register' | 'setup' | 'app' | 'admin' | 'events'>('welcome');
  const [needsSetup, setNeedsSetup] = useState(true);
  const [checkedSetup, setCheckedSetup] = useState<boolean>(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [rolesPerms, setRolesPerms] = useState<RoleWithPerms[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeModel[]>([]);
  
  const [users, setUsers] = useState<UserModel[]>([]);
  const [adminSection, setAdminSection] = useState<'branding' | 'users' | 'roles' | 'impersonate'>('branding');
  const [eventSection, setEventSection] = useState<'events' | 'tickets'>('events');
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

  const applyThemeVars = (p: string, s: string, b: string) => {
    document.documentElement.style.setProperty('--accent', p);
    document.documentElement.style.setProperty('--accent-2', s);
    document.documentElement.style.setProperty('--bg', b);
  };

  // Re-apply persisted theme variables on load and whenever they change
  useEffect(() => {
    applyThemeVars(primary, secondary, background);
  }, [primary, secondary, background]);

  // Fetch shared branding so all users see the same theme
  useEffect(() => {
    if (!checkedSetup || needsSetup) return;
    let cancelled = false;
    api.branding()
      .then((b) => {
        if (cancelled) return;
        if (b?.primary || b?.secondary || b?.background || b?.logoUrl !== undefined) {
          const nextPrimary = b.primary ?? primary;
          const nextSecondary = b.secondary ?? secondary;
          const nextBackground = b.background ?? background;
          setTheme({
            primary: nextPrimary,
            secondary: nextSecondary,
            background: nextBackground,
            logoUrl: b.logoUrl ?? logoUrl,
          });
          applyThemeVars(nextPrimary, nextSecondary, nextBackground);
        }
      })
      .catch(() => {
        // ignore fetch errors; fallback to stored theme
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedSetup, needsSetup]);

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

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);


  useEffect(() => {
    if (checkedSetup && needsSetup) {
      setTheme({
        primary: themeDefaults.primary,
        secondary: themeDefaults.secondary,
        background: themeDefaults.background,
        logoUrl: themeDefaults.logoUrl,
      });
    }
  }, [checkedSetup, needsSetup, setTheme]);

  useEffect(() => {
    if (checkedSetup) return;
    api
      .setupStatus()
      .then((res) => {
        setNeedsSetup(res.needsSetup);
        setView(res.needsSetup ? (hasStartedSetup ? 'setup' : 'welcome') : 'login');
        setCheckedSetup(true);
      })
      .catch(() => {
        // Any error: force setup to display so the user can configure DB/env.
        setNeedsSetup(true);
        setView(hasStartedSetup ? 'setup' : 'welcome');
        setCheckedSetup(true);
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
    if (needsSetup) {
      setView(hasStartedSetup ? 'setup' : 'welcome');
    }
  }, [needsSetup, hasStartedSetup]);

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

  const publicNav = needsSetup && view !== 'setup' ? (
    <div style={{ display: 'flex', gap: 10 }}>
      <Button variant="solid" onClick={() => setView('setup')}>
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

  if (!checkedSetup || authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        Loading...
      </div>
    );
  }

  const sidebarNav = user ? (
    <div style={{ display: 'grid', gap: 10 }}>
      <Button style={navButtonStyle(view === 'app')} variant="ghost" onClick={() => setView('app')}>
        Dashboard
      </Button>
      {canManageEvents && (
        <Button
          style={navButtonStyle(view === 'events')}
          variant="ghost"
          onClick={() => setView('events')}
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
    </div>
  ) : null;

  if (!user && view === 'login') {
    if (needsSetup) {
      setView('setup');
      return null;
    }
    return (
      <>
        <LoginView
          setView={setView as any}
          publicNav={publicNav}
          setupSuccess={setupSuccess}
          registerNotice={registerNotice}
        />
        {ToastPortal}
        {ModalPortal}
      </>
    );
  }

  if (!user && view === 'register') {
    return (
      <>
        <RegisterView
          setView={setView as any}
          publicNav={publicNav}
          setRegisterNotice={setRegisterNotice}
        />
        {ToastPortal}
        {ModalPortal}
      </>
    );
  }

  if (view === 'welcome' && needsSetup && !hasStartedSetup) {
    return (
      <Layout>
        <div
          style={{
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <Card title="Welcome to Ticket Sale" titleAlign="center">
            <div style={{ display: 'grid', gap: 16 }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                A guided wizard will help you connect the database, create the first admin, configure email, and set basic branding.
              </p>
              <Button
                onClick={() => {
                  setHasStartedSetup(true);
                  if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('ts_setup_started', '1');
                  }
                  setView('setup');
                }}
              >
                Start setup
              </Button>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  if (view === 'setup') {
    if (!needsSetup && !isAdmin) {
      setView('app');
      return null;
    }
    return (
      <>
        <SetupView
          setView={setView as any}
          topbar={topbar}
          publicNav={publicNav}
          user={user}
          logout={logout}
          setNeedsSetup={setNeedsSetup}
          setSetupSuccess={setSetupSuccess}
          setToast={setToast}
        />
        {ToastPortal}
        {ModalPortal}
      </>
    );
  }

  if (view === 'events' && user && canManageEvents) {
    return (
      <>
        <EventsView
          header={topbar}
          sidebar={sidebarNav}
          logout={logout}
          eventSection={eventSection}
          setEventSection={setEventSection}
          events={events}
          setEvents={setEvents}
          ticketTypes={ticketTypes}
          setTicketTypes={setTicketTypes}
          showToast={showToast}
          setModal={setModal}
          withLoading={withLoading}
          isLoading={isLoading}
        />
        {ToastPortal}
        {ModalPortal}
      </>
    );
  }

  if (view === 'admin' && user && isAdmin) {
    return (
      <>
        <AdminView
          header={topbar}
          sidebar={sidebarNav}
          logout={logout}
          adminSection={adminSection}
          setAdminSection={setAdminSection}
          rolesPerms={rolesPerms}
          setRolesPerms={setRolesPerms}
          permissions={permissions}
          users={users}
          setUsers={setUsers}
          fetchMe={fetchMe}
          showToast={showToast}
          setModal={setModal}
          withLoading={withLoading}
          isLoading={isLoading}
        />
        {ToastPortal}
        {ModalPortal}
      </>
    );
  }

  return (
    <>
      <DashboardView
        header={topbar}
        sidebar={sidebarNav}
        logout={logout}
        canSell={canSell}
        canCheckin={canCheckin}
        user={user}
        loadStats={loadStats}
        stats={stats}
        showToast={showToast}
      />
      {ToastPortal}
      {ModalPortal}
    </>
  );
}
