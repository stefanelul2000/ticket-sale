# Validation Rules

## Authentication
- **`POST /login`** (`Auth\LoginRequest`): `username` required string, `password` required string, optional `remember` boolean (handled via `boolean('remember')`).
- **`POST /register`**: `name` required string max 255, `email` optional email max 255 unique, `username` required string max 255 unique, `password` required string min 8 + confirmed.
- **Password reset routes** enforce Laravel's default email + token validation.

## Setup & Branding
- **`POST /setup`**: requires database credentials plus admin name/email/username/password (confirmed). Optional fields: SMTP mailer (`mail_mailer`, `mail_host`, `mail_port`, `mail_username`, `mail_password`, `mail_from_address`, `mail_from_name`) and branding colors (`branding_primary`, `branding_secondary`, `branding_background`). The action tests DB connectivity, migrates, seeds roles/permissions, creates the admin, writes `.env`, and stores branding defaults when provided.
- **`POST /setup/logo`**: multipart upload restricted to image mime types up to 2 MB.
- **`POST /branding`**: `primary`, `secondary`, and `background` must be valid CSS colors; `logo` accept SVG/PNG/JPG up to 1 MB.

## Users & Roles
- **`POST /users`** (`UserController@store`):
  - `name`: required string max 255.
  - `email`: nullable, email, max 255, unique in `users`.
  - `username`: required string max 255, unique.
  - `password`: required string min 8.
  - `role_id`: required integer exists in `roles`.
- **`PATCH /users/{id}/role`**: `role_id` required integer exists.
- **`PATCH /users/{id}/status`**: `active` required boolean.
- **`POST /roles/{roleId}/permissions`**: `permission_ids` array of integers that exist in `permissions`.

## Events
- **`POST /events` / `PATCH /events/{id}`** (`EventController@validated`):
  - `name`: required string max 255.
  - `slug`: optional string max 255, auto-generated if missing, must be unique.
  - `is_online`: boolean.
  - `venue`, `city`, `country`: nullable strings max 255.
  - `starts_at`, `ends_at`: nullable dates (`date` rule).
  - `capacity`: nullable integer ≥ 0 (cannot be below generated/sold counts when updating).
  - `branding`, `seo`: nullable arrays/JSON.

## Ticket Types
- **`POST /ticket-types` / `PATCH /ticket-types/{id}`** (`TicketTypeController@validated`):
  - `event_id`: required, exists in `events`.
  - `name`: required string max 255.
  - `kind`: optional enum (`paid`, `free`, `donation`, `tiered`).
  - `price`: numeric ≥ 0.
  - `currency`: string max 8 (defaults to event currency).
  - `capacity`: nullable integer ≥ 0.
  - `shared_capacity_key`: nullable string max 255.
  - `is_active`: boolean.
  - `sales_start`, `sales_end`: nullable dates.
  - `metadata`: nullable array.

## Tickets
- **`POST /tickets/generate`**: `ticket_type_id` required integer exists, optional `event_id` to scope generation, `count` required integer between 1 and 5,000.
- **`POST /tickets/{ticket}/sell`**: requires buyer metadata (name/email) and payment references when provided.
- **`POST /tickets/{ticket}/checkin`**: no payload, but route enforces role >= 2 and denies already checked-in tickets.
- **`POST /tickets/{ticket}/refund`**: requires justification string when configured (default optional).

## Stats
- **`GET /stats`**: query parameters `event_id` (optional integer) and `range` (enum `day|week|month`) gate the aggregation windows.

Use this guide alongside `docs/api/api-endpoints.md` when wiring frontend forms to ensure validation parity.
