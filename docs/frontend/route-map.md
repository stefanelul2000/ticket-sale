# Frontend Route Map

This document maps backend resources (derived from `app/backend/routes/api.php`) to the live React Router pages. Every screen now flows through `src/router.tsx`; no legacy `setView` fallbacks remain.

## Resource Controllers Discovered

- `SetupController`
- `BrandingController`
- `UserController`
- `PermissionController`
- `RoleController`
- `TicketController`
- `TicketTypeController`
- `EventController`
- `Auth\AuthenticatedSessionController`
- `Auth\RegisteredUserController`
- `Auth\PasswordResetLinkController`
- `Auth\NewPasswordController`
- `Auth\EmailVerificationNotificationController`
- `Auth\VerifyEmailController`

## Planned Routes

| Backend Domain | API Endpoints | Frontend Route(s) | Purpose |
| --- | --- | --- | --- |
| Setup (`SetupController`) | `/setup/*` | `/setup`, `/welcome` | Initial configuration wizard and pre-setup welcome screen. |
| Branding (`BrandingController`) | `GET/POST /branding` | `/admin/branding` | Admin-only screen to edit global colors/logo. |
| Authentication (`Auth* controllers`) | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email/*`, `/logout` | `/login`, `/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email` | Public auth flows. |
| Profile (`/me`) | `/me` | `/me` | Display the authenticated user's profile and impersonation indicators. |
| Roles & Permissions (`UserController@roles`, `PermissionController`, `RoleController`) | `/roles`, `/users`, `/permissions`, `/roles/with-permissions`, `/roles/{id}/permissions` | `/admin/users`, `/admin/roles`, `/admin/permissions` | Administrative RBAC management screens. |
| Impersonation (`/impersonate`) | `POST/DELETE /impersonate` | `/admin/impersonation` | Start/stop impersonation with audit logs. |
| Events (`EventController`) | `/events`, `/events/{id}` | `/events`, `/events/:id/edit` | Event list, ticket-type management, and link-outs to edit a specific event. |
| Ticket Types (`TicketTypeController`) | `/ticket-types`, `/ticket-types/{id}` | `/events` (Ticket Types tab) | Ticket type CRUD lives inside the Events page rather than its own route. |
| Tickets (`TicketController`) | `/tickets`, `/tickets/{ticketNumber}/verify`, `/tickets/{ticketNumber}/checkin`, `/tickets/{ticketNumber}/sell`, `/tickets/generate`, `/tickets/{ticketNumber}/refund`, `/events/{event}/tickets`, `/stats` | `/tickets` (placeholder), `/dashboard` (verify/check-in/sell widgets) | Ticket lifecycle management; dashboard still handles verify/check-in while `/tickets` will eventually expose dedicated tools. |
| Dashboard (`TicketController@stats`) | `/stats` | `/dashboard` | Business insights and at-a-glance performance metrics. |
| Health | `/health` | `/health` | System heartbeat page. |

## Navigation Groups

- **Public:** `/`, `/login`, `/register`, `/auth/*`, `/health`, `/branding`.
- **Setup:** `/welcome`, `/setup`.
- **Authenticated Core:** `/dashboard`, `/tickets`, `/events`, `/stats`.
- **Admin:** `/admin/users`, `/admin/roles`, `/admin/branding`, `/admin/impersonation` (future: `/admin/permissions`).

- **Role requirements:**
  - `/dashboard`: any authenticated user.
  - `/tickets`: role ≥ 2 (Check-in or higher).
  - `/events`: role ≥ 4 (Manager or higher).
- `/admin/*`: role ≥ 5 and not currently impersonating another role.

Implementation Notes:
- `src/router.tsx` declares the BrowserRouter tree, using `RequireAuth` + `AppLayout` for protected sections and `AuthLayout` for login/register.
- `/dashboard`, `/events`, `/events/:id/edit`, `/admin/users`, and `/admin/roles` render the new Tailwind experiences; `/tickets` is the next area to flesh out.
- `/tickets` now relies on the new `/events/summary` endpoint (role ≥ 2) for its event selector so lower roles never hit the restricted event management API.
