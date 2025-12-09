# API Endpoints

This document lists all available API endpoints, their methods, associated controllers/actions, and a brief description.

| Method | Endpoint | Controller/Action | Description |
|---|---|---|---|
| GET | `/setup/status` | `SetupController@status` | Checks the current setup status of the application. |
| POST | `/setup` | `SetupController@create` | Performs initial application setup. |
| POST | `/setup/logo` | `SetupController@uploadLogo` | Uploads a logo during the setup process. |
| POST | `/setup/migrate` | `SetupController@migrate` | Runs database migrations and seeds during setup. |
| POST | `/setup/test-db` | `SetupController@testDatabase` | Tests database connection with provided credentials during setup. |
| GET | `/branding` | `BrandingController@show` | Retrieves public branding settings. |
| GET | `/health` | `Closure` | Simple health check endpoint. |
| POST | `/register` | `RegisteredUserController@store` | Registers a new user. |
| POST | `/login` | `AuthenticatedSessionController@store` | Authenticates a user. |
| POST | `/forgot-password` | `PasswordResetLinkController@store` | Sends a password reset link. |
| POST | `/reset-password` | `NewPasswordController@store` | Resets the user's password. |
| POST | `/verify-email/send` | `EmailVerificationNotificationController@store` | Resends the email verification notification. |
| GET | `/verify-email/{id}/{hash}` | `VerifyEmailController@__invoke` | Verifies the user's email address. |
| POST | `/logout` | `AuthenticatedSessionController@destroy` | Logs out the user. |
| GET | `/me` | `Closure` | Get authenticated user info. |
| GET | `/roles` | `UserController@roles` | List all roles. |
| GET | `/users` | `UserController@index` | Get paginated list of users. |
| POST | `/users` | `UserController@store` | Create a new user. |
| PATCH | `/users/{userId}/role` | `UserController@updateRole` | Update a user's role. |
| PATCH | `/users/{userId}/status` | `UserController@updateStatus` | Update a user's active status. |
| DELETE | `/users/{userId}` | `UserController@destroy` | Delete a user. |
| GET | `/permissions` | `PermissionController@index` | List all permissions. |
| GET | `/roles/with-permissions` | `RoleController@index` | Get roles with permissions. |
| POST | `/roles/{roleId}/permissions` | `RoleController@updatePermissions` | Update permissions for a role. |
| POST | `/impersonate` | `Closure` | Start impersonation. |
| POST | `/branding` | `BrandingController@update` | Update branding settings. |
| GET | `/events` | `EventController@index` | List all events. |
| POST | `/events` | `EventController@store` | Create a new event. |
| PATCH | `/events/{eventId}` | `EventController@update` | Update an event. |
| DELETE | `/events/{eventId}` | `EventController@destroy` | Delete an event. |
| GET | `/events/{event}/tickets` | `TicketController@export` | Export event tickets. |
| GET | `/ticket-types` | `TicketTypeController@index` | List all ticket types. |
| POST | `/ticket-types` | `TicketTypeController@store` | Create a new ticket type. |
| PATCH | `/ticket-types/{ticketTypeId}` | `TicketTypeController@update` | Update a ticket type. |
| DELETE | `/ticket-types/{ticketTypeId}` | `TicketTypeController@destroy` | Delete a ticket type. |
| POST | `/tickets/generate` | `TicketController@generate` | Generate tickets. |
| POST | `/tickets/{ticketNumber}/refund` | `TicketController@refund` | Refund a ticket. |
| GET | `/tickets` | `TicketController@index` | List all tickets. |
| GET | `/tickets/{ticketNumber}/verify` | `TicketController@verify` | Verify ticket status. |
| POST | `/tickets/{ticketNumber}/checkin` | `TicketController@checkin` | Check-in a ticket. |
| POST | `/tickets/{ticketNumber}/sell` | `TicketController@sell` | Sell a ticket. |
| GET | `/stats` | `TicketController@stats` | Get ticket statistics. |
| DELETE | `/impersonate` | `Closure` | Stop impersonation. |
