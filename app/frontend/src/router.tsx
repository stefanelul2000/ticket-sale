import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Link, Outlet } from 'react-router-dom';
import { api } from './lib/api';
import { useT } from './i18n';
import { AppLayout, NAV } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { RequireAuth, RequireRole } from './router/RequireAuth';
import { Loading } from './ui/components/ui/Misc';
import { LoginPage } from './ui/pages/LoginPage';
import { SetupPage } from './ui/pages/SetupPage';
import { DashboardPage } from './ui/pages/DashboardPage';
import { DoorPage } from './ui/pages/DoorPage';
import { AssignPage } from './ui/pages/AssignPage';
import { EventsPage } from './ui/pages/EventsPage';
import { EventDetailPage } from './ui/pages/event/EventDetailPage';
import { ReportsPage } from './ui/pages/ReportsPage';
import { TicketsPage } from './ui/pages/TicketsPage';
import { UsersPage } from './ui/pages/UsersPage';
import { SettingsPage } from './ui/pages/SettingsPage';
import { PublicEventPage, PublicNotFound } from './ui/pages/public/PublicEventPage';
import { PublicEventsPage } from './ui/pages/public/PublicEventsPage';
import { PublicTicketPage } from './ui/pages/public/PublicTicketPage';
import { PublicRequestPage } from './ui/pages/public/PublicRequestPage';

/** Shows the first-run wizard until an owner exists. */
function SetupGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'setup' | 'setup-db' | 'ready'>('checking');

  useEffect(() => {
    api
      .setupStatus()
      .then((s) => setState(s.needsSetup ? (s.setupDisabled ? 'setup' : 'setup-db') : 'ready'))
      .catch(() => setState('ready')); // never fall into the wizard on errors
  }, []);

  if (state === 'checking') return <div className="min-h-screen bg-bg"><Loading /></div>;
  if (state === 'setup' || state === 'setup-db') return <SetupPage needsDb={state === 'setup-db'} onDone={() => window.location.assign('/')} />;
  return <>{children}</>;
}

const allow = (path: string) => NAV.find((n) => n.to === path)!.allow;

function StaffNotFound() {
  const t = useT();
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">{t('common.notFound')}</h1>
      <Link to="/" className="mt-4 inline-block font-semibold text-accent hover:underline">{t('nav.dashboard')}</Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/e', element: <PublicEventsPage /> },
      { path: '/e/:slug', element: <PublicEventPage /> },
      { path: '/e/:slug/cerere', element: <PublicRequestPage /> },
      { path: '/t/:code', element: <PublicTicketPage /> },
    ],
  },
  {
    element: (
      <SetupGate>
        <Outlet />
      </SetupGate>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'door', element: <RequireRole allow={allow('/door')}><DoorPage /></RequireRole> },
          { path: 'assign', element: <RequireRole allow={allow('/assign')}><AssignPage /></RequireRole> },
          { path: 'tickets', element: <RequireRole allow={allow('/tickets')}><TicketsPage /></RequireRole> },
          { path: 'events', element: <RequireRole allow={allow('/events')}><EventsPage /></RequireRole> },
          { path: 'events/:id', element: <RequireRole allow={allow('/events')}><EventDetailPage /></RequireRole> },
          { path: 'reports', element: <RequireRole allow={allow('/reports')}><ReportsPage /></RequireRole> },
          { path: 'users', element: <RequireRole allow={allow('/users')}><UsersPage /></RequireRole> },
          { path: 'settings', element: <RequireRole allow={allow('/settings')}><SettingsPage /></RequireRole> },
          { path: '*', element: <StaffNotFound /> },
        ],
      },
    ],
  },
  { path: '*', element: <PublicLayout />, children: [{ path: '*', element: <PublicNotFound /> }] },
]);
