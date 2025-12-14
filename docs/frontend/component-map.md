# Frontend Component Map

## Core Shell
- **`src/router.tsx`**: Declares the route tree with `createBrowserRouter`, wrapping protected sections with `RequireAuth`.
- **`src/ui/App.tsx`**: Hosts the `<RouterProvider />`.
- **`src/layouts/AppLayout.tsx`**: Sidebar + topbar shell for authenticated routes, rendering content via `<Outlet />`.
- **`src/layouts/AuthLayout.tsx`**: Centered card used for login/register flows.

## Shared UI
- **`src/ui/components/ui/`**: Tailwind primitives (`Button`, `Card`, `Input`, `Spinner`) reused by every routed page to keep styling consistent.

## Views
- **`src/ui/pages/DashboardPage.tsx`**: Dashboard stats plus sell, verify, and check-in workflows.
- **`src/ui/pages/EventsIndexPage.tsx`**: Event CRUD, ticket-type management, ticket generation/export helpers.
- **`src/ui/pages/EventEditorPage.tsx`**: Deep editing for a single event and its ticket types.
- **`src/ui/pages/TicketsPage.tsx`**: Placeholder for the broader ticket management tooling.
- **`src/ui/pages/AdminUsersPage.tsx`**: Staff invitations, role changes, and active toggles.
- **`src/ui/pages/AdminRolesPage.tsx`**: Permission matrix editing for RBAC roles.
- **`src/ui/pages/AdminBrandingPage.tsx`**: Color/logo management for the product theme.
- **`src/ui/pages/AdminImpersonationPage.tsx`**: Start/stop impersonation flows for administrators.
- **`src/ui/pages/LoginPage.tsx` / `RegisterPage.tsx`**: Auth flows rendered inside `AuthLayout`.

Legacy `src/ui/views/*` files have been deleted; every screen now corresponds to a React Router page.

## Styling
- **`src/index.css`**: Boots Tailwind and keeps the bespoke gradients/variables from the legacy UI. Loaded once in `src/main.tsx`.
- **Tailwind Config**: `tailwind.config.js` scans `src/**/*.{ts,tsx}` and Laravel Blade views for utility usage.

Use this map alongside `docs/frontend/route-map.md` when evolving routed pages.
