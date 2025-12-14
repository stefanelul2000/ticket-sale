# Codex Knowledge Base

## Project Overview

Ticket Sale is a monorepo that contains:

- **Backend** (`app/backend`): Laravel 12 API secured with Sanctum, RBAC middleware, and Swagger docs.
- **Frontend** (`app/frontend`): React 19 + TypeScript app powered by Vite 7. Zustand handles client state and Axios powers the API client. Tailwind CSS now provides the design system baseline.
- **Infrastructure** (`docker`): Dockerfile + docker-compose files that combine Nginx, PHP-FPM, MySQL 8, and Redis 7. Runtime configuration (e.g., `config.js`) is injected through the container entrypoint.

## Backend Architecture

- Routes are defined in `app/backend/routes/api.php`. Major controllers: `SetupController`, `BrandingController`, `UserController`, `PermissionController`, `RoleController`, `EventController`, `TicketTypeController`, and `TicketController`. Standard Laravel auth routes live in `routes/auth.php`. Admins (role ≥5) can now update staff names/usernames/emails/reset passwords via `PATCH /users/{id}` in addition to the existing role/status mutations.
- Check-in roles now have a dedicated `/events/summary` endpoint that returns lightweight event ids + names so they can filter ticket ledgers without needing full event management access.
- Middleware stack uses Sanctum authentication and layered role middleware (`role:2`, `role:3`, `role:4`, `role:5`) plus impersonation protections.
- Health, branding, and setup routes are public; everything else requires session auth.
- Request validation is handled via explicit `FormRequest` classes (e.g., `Auth\LoginRequest`) or inline `$request->validate()` calls.
- Local bootstrap: after `docker compose up`, run `docker compose exec app php artisan migrate --seed` (or `php artisan migrate --seed` in a host PHP environment) to create the `users` table and seed admin roles before hitting `/api/me`; otherwise MySQL emits `SQLSTATE[42S02]` because the schema is missing.

## Frontend Architecture

- Entry point: `src/main.tsx` renders the React tree and loads Tailwind-enhanced global styles.
- Routing: `src/router.tsx` uses `createBrowserRouter` with guarded routes (`RequireAuth`) plus two layouts: `AppLayout` (sidebar/topbar shell) and `AuthLayout` (centered login/register). This replaces the legacy `setView` approach. Core business pages (`DashboardPage`, `EventsIndexPage`, `EventEditorPage`, `AdminUsersPage`, `AdminRolesPage`) now render via Tailwind-first components.
- Shared UI primitives live in `src/ui/components/ui/` (`Button`, `Card`, `Input`, `Spinner`), providing the Tailwind foundations for the rewritten screens.
- Styling: Tailwind, PostCSS, and Autoprefixer are installed. `public/config.js` seeds `window.__APP_CONFIG__` so the `/config.js` runtime script resolves during builds.
- Legacy view infrastructure (`src/ui/views`, `src/ui/components/Layout.tsx`, `ThemeControls.tsx`, `styles.ts`) has been removed entirely. All routed experiences now live under `src/ui/pages`, ensuring every navigation event maps to an explicit URL.

## Infrastructure Notes

- Docker builds now target Alpine 3.21 with PHP 8.2 and s6-overlay v3, using native s6-rc packages (`docker/rootfs/etc/s6-overlay/s6-rc.d`). Oneshots handle env/permission setup and the Laravel bootstrap (calling `docker/entrypoint.sh` with `INIT_ONLY=true`) before the longrun services (`php-fpm`, `nginx`) start.
- Vite builds write directly into `app/backend/public` (`vite.config.ts`). Docker images copy this directory during build.
- Use `BUILD_TO_BACKEND=true npm run build` when you want Vite to write directly into `app/backend/public`; default builds now target `app/frontend/dist` to avoid permission issues in local dev. CI/container builds should set that env var.
- `docker/runtime-config.template.js` is templated into `public/config.js` so the SPA reads the API base URL at runtime (`window.__APP_CONFIG__.API_URL`).
- Nginx forwards everything to Laravel's `public/index.php` and exposes the SPA plus `/api` routes on the same origin. Health checks hit `/api/health`.

## Knowledge Updates (2025-12-14)

- Added Tailwind CSS tooling + runtime verification banner.
- Introduced BrowserRouter scaffolding, placeholder pages, and a reusable Sidebar.
- Documented frontend route mapping (`docs/frontend/route-map.md`) for parity with backend resources.
- Completed Phase 4 cleanup by deleting the legacy `setView` UI files and relying exclusively on the new Tailwind router shell.
