# Frontend API Client Map

Source: `app/frontend/src/lib/api.ts`. Every helper returns `Promise<T>` after unwrapping `.data`.

| Helper | HTTP | Endpoint | Notes |
| --- | --- | --- | --- |
| `api.login(data)` | POST | `/login` | Accepts `{ username, password, remember? }`. |
| `api.register(data)` | POST | `/register` | Creates first admin and future users. |
| `api.logout()` | POST | `/logout` | Ends Sanctum session. |
| `api.me()` | GET | `/me` | Includes impersonation metadata. |
| `api.setupStatus()` | GET | `/setup/status` | Determines if setup wizard is required. |
| `api.setup(payload)` | POST | `/setup` | Runs initial provisioning. |
| `api.setupTestDb(payload)` | POST | `/setup/test-db` | Validates DB credentials before finalizing. |
| `api.uploadLogo(formData)` | POST | `/setup/logo` | Multipart upload for logos. |
| `api.branding()` | GET | `/branding` | Public theme payload. |
| `api.saveBranding(payload)` | POST | `/branding` | Admin branding save. |
| `api.tickets(params?)` | GET | `/tickets` | Paginated ticket ledger (accepts `event_id`, `per_page`, etc.). |
| `api.verify(ticketNumber)` | GET | `/tickets/{ticket}/verify` | Quick status lookup. |
| `api.checkin(ticketNumber)` | POST | `/tickets/{ticket}/checkin` | Marks check-in. |
| `api.sell(ticketNumber, payload)` | POST | `/tickets/{ticket}/sell` | Assigns buyer/reference info. |
| `api.refund(ticketNumber)` | POST | `/tickets/{ticket}/refund` | Issues refund flag. |
| `api.generate(payload)` | POST | `/tickets/generate` | Bulk generation by ticket type. |
| `api.eventTickets(eventId, ticket_type_id?)` | GET | `/events/{id}/tickets` | Optional ticket type filter. |
| `api.stats()` | GET | `/stats` | Dashboard stats. |
| `api.roles()` | GET | `/roles` | Basic role list. |
| `api.rolesWithPermissions()` | GET | `/roles/with-permissions` | Extended RBAC view. |
| `api.permissions()` | GET | `/permissions` | Permission catalog. |
| `api.updateRolePermissions(roleId, permission_ids)` | POST | `/roles/{id}/permissions` | Bulk assignment. |
| `api.users()` | GET | `/users` | Paginated user list. |
| `api.createUser(payload)` | POST | `/users` | Create admin/staff. |
| `api.updateUser(id, payload)` | PATCH | `/users/{id}` | Edit name/email/username or reset password. |
| `api.updateUserRole(id, role_id)` | PATCH | `/users/{id}/role` | Role change. |
| `api.updateUserStatus(id, active)` | PATCH | `/users/{id}/status` | Toggle active flag. |
| `api.deleteUser(id)` | DELETE | `/users/{id}` | Remove user. |
| `api.events()` | GET | `/events` | Event list with counts. |
| `api.eventSummaries()` | GET | `/events/summary` | Slim event ids + names for ledger dropdowns (role ≥ Check-in). |
| `api.createEvent(payload)` | POST | `/events` | Create event. |
| `api.updateEvent(id, payload)` | PATCH | `/events/{id}` | Update event. |
| `api.deleteEvent(id)` | DELETE | `/events/{id}` | Delete event. |
| `api.ticketTypes(event_id?)` | GET | `/ticket-types` | Optional event filter. |
| `api.createTicketType(payload)` | POST | `/ticket-types` | Create ticket type. |
| `api.updateTicketType(id, payload)` | PATCH | `/ticket-types/{id}` | Update ticket type. |
| `api.deleteTicketType(id)` | DELETE | `/ticket-types/{id}` | Delete ticket type. |
| `api.ticketActivity(limit?)` | GET | `/ticket-activity` | Shared verify/check-in/sell feed (defaults to 50 entries). |
| `api.clearTicketActivity()` | DELETE | `/ticket-activity` | Clears the shared ticket activity feed for everyone. |
| `api.impersonate(role_id)` | POST | `/impersonate` | Start impersonation. |
| `api.stopImpersonate()` | DELETE | `/impersonate` | Stop impersonation. |

Use this table to keep the new router pages aligned with backend capabilities.
