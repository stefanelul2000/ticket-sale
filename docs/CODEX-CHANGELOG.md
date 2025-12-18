# Codex Changelog

## 2025-12-14 - 19:50 — Shared ticket activity feed
- Added `ticket_activity_logs` plus `TicketActivityController` so verify/check-in/sell actions write to a global feed exposed via `GET/DELETE /ticket-activity` for role ≥2 operators.
- Ticket workflows now log success/failure directly from the API, and the Dashboard polls/clears the shared log so every user sees the same history until someone explicitly clears it.
- Updated frontend API client + dashboard UI, plus docs (knowledge base, API references) to capture the new endpoints and persistence model.

## 2025-12-14 - 19:05 — Auto check-in input handles Enter
- Wired the dashboard's ticket code field with global Enter/Numpad Enter listeners and newline trimming so hardware scanners immediately dispatch Verify vs. Check-in based on auto mode without extra clicks, and the input now clears after submission so the next scan is ready instantly.
- File: `app/frontend/src/ui/pages/DashboardPage.tsx`.

## 2025-12-14 - 18:45 — Setup gate restored
- Added a frontend setup gate that calls `/setup/status` before rendering the router. When the API reports `needsSetup`, the SPA now renders a four-step wizard (DB connection test, admin creation, optional email, branding colors + logo upload) before unlocking the authenticated app.
- The wizard now stays on a completion screen after provisioning (no automatic redirect) so users can review success details and click “Enter the application” when ready.
- For security, we no longer persist any credentials in `localStorage`—only the wizard step was briefly stored, but now workflows restart from Step 1 after a refresh so passwords and SMTP secrets are never written to disk. The “setup disabled” banner was removed so the wizard always displays when DB provisioning is required.
- Created `SetupPage.tsx` and wired it through `App.tsx`, with error handling for DB connectivity issues so empty databases immediately show the provisioning UI instead of falling back to the login screen.
- Extended `SetupController@create` to accept optional branding colors and persist them in `settings`, and Step 4 now supports uploading a logo via `/setup/logo` once provisioning succeeds.
- Improved UX: Step 2 now displays password requirements and mismatch hints, and API validation errors route users back to the relevant step (SMTP/branding). Logo uploads that require authentication now show a friendly notice reminding admins they can upload later from Admin → Branding.

## 2025-12-14 - 18:15 — Dev compose vendor mounts
- Updated `docker/docker-compose.override.yml` to bind-mount `app/backend/vendor` and `app/frontend/node_modules` directly from the host, preventing empty named volumes from masking Composer/NPM installs and ensuring Laravel boots after a clean DB reset.
- Refreshed `docker/README.dev.md` to describe the new default and document how to switch back to named volumes if desired.

## 2025-12-14 - 18:00 — Native s6-rc services
- Migrated from legacy `/etc/cont-init.d` + `/etc/services.d` scripts to first-class s6-rc packages under `docker/rootfs/etc/s6-overlay/s6-rc.d`. Oneshots (`env-setup`, `laravel-bootstrap`) now handle UID remapping and Laravel provisioning before longruns (`php-fpm`, `nginx`) start.
- Updated the Dockerfile to mark `run`/`up` scripts executable automatically and documented the new supervision flow across the knowledge base + infrastructure docs so operators know the bundle structure.
- Ensured `/var/log/nginx`, `/var/log/php82`, and `/var/lib/nginx/logs` are created during env setup so the host-mounted log directory is ready before services start, eliminating the previous missing-file alerts.

## 2025-12-14 - 17:30 — Docker healthchecks & host log mount
- Added healthchecks for the `app`, `db`, and `redis` services in `docker/docker-compose.yml` so Compose waits for each dependency (curling `/health`, `mysqladmin ping`, `redis-cli ping`) before marking containers healthy.
- Bound `/var/log` to a host path (plus `docker/local-logs` in the override) and reverted nginx logs to file targets so on-host operators can tail access/error logs without `docker logs`.
- Clarified the cont-init ownership optimizer in the infrastructure docs to explain why `/var/www` is only re-chowned when necessary, and noted the new log mount in both Docker + Nginx documentation.

## 2025-12-14 - 17:10 — S6-overlay production base
- Rebuilt `docker/Dockerfile` on Alpine 3.21 with PHP 8.2 packages, s6-overlay v3, and supervised nginx/php-fpm services so the container now honors `PUID`/`PGID`/`TZ` and runs `/init`.
- Added `docker/rootfs` cont-init scripts for timezone/user remapping plus Laravel bootstrap and service definitions under `etc/services.d/`.
- Updated the nginx fastcgi target, entrypoint wiring, and docs (knowledge base + infrastructure) to describe the new supervision model and runtime env knobs.

## 2025-12-14 - 15:45 — Event summaries for ticket ledger access
- Added `/events/summary` (role ≥2) to provide lightweight event lists without exposing full event management data.
- Updated the Tickets page + API client to call the summary endpoint so Check-in roles can load the ledger dropdown without 403 errors.
- Documented the new endpoint across API and frontend references to keep role mappings accurate.

## 2025-12-14 - 16:20 — Admin user editing
- Added `PATCH /users/{id}` so admins can update staff names, usernames, emails, or reset passwords without deleting the account.
- Extended the Admin Users UI with an edit dialog hooked to the new API and exposed the helper via the frontend client map.
- Updated API docs + knowledge base to reflect the new capability.

## 2025-12-14 - 16:35 — Mobile card overflow fix
- Updated the shared `Card` component to force `w-full`, preventing wide tables/forms from extending past the viewport on phones (affecting Events, Ticket Types, Tickets, and Admin Users).
- No UI changes needed per page—the fix is centralized in `Card.tsx`.

## 2025-12-14 - 16:42 — Responsive tables
- Added `min-width` constraints to the Events, Ticket Types, Tickets, and Admin Users tables so they scroll horizontally within their cards instead of squeezing columns or overflowing on narrow screens. Mobile now also renders these datasets as stacked cards, eliminating the need for horizontal scrolling altogether.

## 2025-12-14 - 14:30 — Ticket ledger view
- Updated the Tickets page with an event selector and sales ledger table showing buyer, seller, and sold timestamps for each ticket.
- Extended `/tickets` to accept `event_id`/`per_page` filters and include seller/event relations so the frontend can render targeted reports.
- Documented the optional params in the API client map.

## 2025-12-14 - 14:55 — Role-aware navigation & admin gating
- Navigation now hides routes your (effective) role cannot access, and impersonation auto-redirects you to the proper landing page with a header control to stop impersonating.
- Tickets, Events, and all admin pages enforce front-end role guards (no more 403s); branding changes immediately update the global theme.
- Added reusable hooks/utilities for role checks and color blending to keep the UI consistent with branding.

## 2025-12-14 - 14:40 — Admin branding & impersonation portals
- Added `/admin/branding` for managing theme colors/logo and `/admin/impersonation` for switching roles.
- Wired the admin submenu + router to surface the new pages and refreshed docs/component maps accordingly.

## 2025-12-14 - 13:35 — Phase 4 cleanup removes legacy UI
- Deleted the remaining legacy React files (`src/ui/views/**`, `src/ui/components/{Layout,Button,Card,ThemeControls}.tsx`, and `src/ui/styles.ts`) so every screen now lives under `src/ui/pages` with Tailwind primitives.
- Verified navigation flows through `src/router.tsx` + `AppLayout`, ensuring sidebar links update the URL and there is no `setView` fallback.
- Updated the knowledge base, component map, route map, and components doc to capture the all-router architecture.

## 2025-12-14 - 13:46 — Mobile navigation updates
- Enhanced `AppLayout` with a high-contrast menu toggle and relocated the desktop account controls into the sidebar footer so the UI remains discoverable across breakpoints.
- Admin-only links now live inside a collapsible “Admin” group above the account card (showing only for high-role users) to declutter the primary navigation.
- Removed the temporary mobile nav pill strip now that the drawer experience is polished; the menu button remains the single entry point.

## 2025-12-14 - 00:39 — Tailwind + Router Scaffolding
- Installed Tailwind CSS (with PostCSS/Autoprefixer) and wired `src/index.css` to boot Tailwind alongside the existing global styles.
- Introduced `BrowserRouter` via `src/router.tsx`, preserved the prior UI inside `LegacyApp.tsx`, and added Tailwind placeholder pages plus a shared `Sidebar`.
- Added runtime config shims (`public/config.js`) so `/config.js` resolves during Vite builds.
- Documentation: created Codex knowledge base, changelog, updated frontend route map, and mapped API/frontend integrations.

## 2025-12-14 - 01:10 — Build target toggle & DB bootstrap docs
- Added a `BUILD_TO_BACKEND` toggle in `vite.config.ts` so local builds use `dist/` while release builds can still publish directly into `app/backend/public` without needing elevated permissions.
- Documented the local migration requirement (`php artisan migrate --seed`) plus the new build flag inside the knowledge base to avoid SQL errors on fresh databases.

## 2025-12-14 - 01:17 — Added phpMyAdmin to dev override
- Updated `docker/docker-compose.override.yml` with a `phpmyadmin` service (port `8081`) wired to the MySQL container for quick database inspection during local development.
- Documented the new helper service in `docs/infrastructure/docker.md`.

## 2025-12-14 - 01:25 — Removed LegacyApp fallback
- Deleted `src/ui/LegacyApp.tsx` and pointed all routes (including `/` and `/setup`) at the new Tailwind router pages so the modern SPA is the only experience rendered.
- Cleaned up the sidebar and documentation to remove `/legacy` references, keeping the route map and component map aligned with the new structure.

## 2025-12-14 - 02:00 — Completed router migration
- Restored the full application experience by wiring the legacy dashboard, events, admin, setup, and auth views into React Router directly inside `src/ui/App.tsx`. Visiting `/dashboard`, `/events`, `/admin`, `/setup`, `/welcome`, `/login`, or `/register` now renders the full UI instead of placeholders.
- Removed the temporary router placeholders (`src/router.tsx`, `src/ui/pages/`, `Sidebar.tsx`) and updated the knowledge base + component map + route map to describe the new structure.

## 2025-12-14 - 02:20 — Tailwind shell + router foundation
- Added Tailwind UI primitives under `src/ui/components/ui/` plus new `AppLayout` and `AuthLayout` shells to standardize navigation and auth screens.
- Introduced `src/router.tsx` with `RequireAuth`, skeleton pages (`DashboardPage`, `EventsIndexPage`, `EventEditorPage`, `TicketsPage`, `AdminUsersPage`, `AdminRolesPage`, `LoginPage`, `RegisterPage`), and replaced the legacy `setView` entry point with `<RouterProvider />`.
- Updated frontend documentation (knowledge base, component map, route map) to describe the new architecture.

## 2025-12-14 - 02:40 — Phase 3: Dashboard + Events + Admin migrations
- Migrated the legacy dashboard logic (stats cards, selling, verify/check-in, history log) into the new Tailwind `DashboardPage`.
- Rebuilt events management: `EventsIndexPage` now handles event CRUD, ticket type management, ticket generation, and download workflows; `EventEditorPage` provides per-event editing for details and ticket types.
- Ported administrative screens into `AdminUsersPage` (invites, role/status changes) and `AdminRolesPage` (permission toggles).
- Documentation (knowledge base, component map, route map) updated to reflect the completed migrations.
