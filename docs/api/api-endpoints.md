# API Endpoints

This canonical list mirrors the routes defined in `app/backend/routes/api.php`.

| Method | Endpoint | Controller/Action | Description |
|---|---|---|---|
| GET | `/setup/status` | `SetupController@status` | Checks current setup status. |
| POST | `/setup` | `SetupController@create` | Performs the first-time setup. |
| POST | `/setup/logo` | `SetupController@uploadLogo` | Uploads a logo during setup. |
| POST | `/setup/migrate` | `SetupController@migrate` | Executes migrations + seeders. |
| POST | `/setup/test-db` | `SetupController@testDatabase` | Verifies connectivity to a provided DB. |
| GET | `/branding` | `BrandingController@show` | Public branding info. |
| POST | `/branding` | `BrandingController@update` | Authenticated branding updates. |
| GET | `/health` | `Closure` | Health heartbeat. |
| POST | `/register` | `RegisteredUserController@store` | Register a user. |
| POST | `/login` | `AuthenticatedSessionController@store` | Login (Sanctum session). |
| POST | `/forgot-password` | `PasswordResetLinkController@store` | Request password reset email. |
| POST | `/reset-password` | `NewPasswordController@store` | Finalize password reset. |
| POST | `/verify-email/send` | `EmailVerificationNotificationController@store` | Resend verification email. |
| GET | `/verify-email/{id}/{hash}` | `VerifyEmailController@__invoke` | Confirm email ownership. |
| POST | `/logout` | `AuthenticatedSessionController@destroy` | Logout current user. |
| GET | `/me` | `Closure` | Fetch authenticated user (+ impersonation info). |
| GET | `/roles` | `UserController@roles` | List roles. |
| GET | `/roles/with-permissions` | `RoleController@index` | Roles + permissions. |
| POST | `/roles/{roleId}/permissions` | `RoleController@updatePermissions` | Update role permissions. |
| GET | `/permissions` | `PermissionController@index` | List permissions. |
| GET | `/users` | `UserController@index` | Paginated users. |
| POST | `/users` | `UserController@store` | Create user. |
| PATCH | `/users/{userId}` | `UserController@update` | Update name, username, email, or password. |
| PATCH | `/users/{userId}/role` | `UserController@updateRole` | Change role. |
| PATCH | `/users/{userId}/status` | `UserController@updateStatus` | Enable/disable user. |
| DELETE | `/users/{userId}` | `UserController@destroy` | Delete user. |
| POST | `/impersonate` | `Closure` | Start impersonating (role >= 5). |
| DELETE | `/impersonate` | `Closure` | Stop impersonating. |
| GET | `/events` | `EventController@index` | List events. |
| GET | `/events/summary` | `EventController@summary` | Lightweight id/name list accessible to Check-in+ roles. |
| POST | `/events` | `EventController@store` | Create event. |
| PATCH | `/events/{eventId}` | `EventController@update` | Update event. |
| DELETE | `/events/{eventId}` | `EventController@destroy` | Delete event. |
| GET | `/events/{event}/tickets` | `TicketController@export` | Export tickets for an event. |
| GET | `/ticket-types` | `TicketTypeController@index` | List ticket types. |
| POST | `/ticket-types` | `TicketTypeController@store` | Create ticket type. |
| PATCH | `/ticket-types/{ticketTypeId}` | `TicketTypeController@update` | Update ticket type. |
| DELETE | `/ticket-types/{ticketTypeId}` | `TicketTypeController@destroy` | Delete ticket type. |
| POST | `/tickets/generate` | `TicketController@generate` | Generate tickets in bulk. |
| POST | `/tickets/{ticketNumber}/refund` | `TicketController@refund` | Mark ticket as refunded. |
| GET | `/tickets` | `TicketController@index` | List tickets. |
| GET | `/tickets/{ticketNumber}/verify` | `TicketController@verify` | Verify ticket. |
| POST | `/tickets/{ticketNumber}/checkin` | `TicketController@checkin` | Check in ticket. |
| POST | `/tickets/{ticketNumber}/sell` | `TicketController@sell` | Register a sale. |
| GET | `/stats` | `TicketController@stats` | Ticket stats for dashboard. |
