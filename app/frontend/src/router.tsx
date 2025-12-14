import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { RequireAuth } from './router/RequireAuth';
import { DashboardPage } from './ui/pages/DashboardPage';
import { EventsIndexPage } from './ui/pages/EventsIndexPage';
import { EventEditorPage } from './ui/pages/EventEditorPage';
import { TicketsPage } from './ui/pages/TicketsPage';
import { AdminUsersPage } from './ui/pages/AdminUsersPage';
import { AdminRolesPage } from './ui/pages/AdminRolesPage';
import { LoginPage } from './ui/pages/LoginPage';
import { RegisterPage } from './ui/pages/RegisterPage';
import { AdminBrandingPage } from './ui/pages/AdminBrandingPage';
import { AdminImpersonationPage } from './ui/pages/AdminImpersonationPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'events', element: <EventsIndexPage /> },
      { path: 'events/:id/edit', element: <EventEditorPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'admin/users', element: <AdminUsersPage /> },
      { path: 'admin/roles', element: <AdminRolesPage /> },
      { path: 'admin/branding', element: <AdminBrandingPage /> },
      { path: 'admin/impersonation', element: <AdminImpersonationPage /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
]);
