# Ticket Sale (Modernized)

Event ticketing portal with Laravel API + React/Vite frontend, Dockerized for easy deployment.

## Structure
- `app/backend` — Laravel API (auth, roles, events, tickets, branding, setup).
- `app/frontend` — React + Vite SPA (build output served by Laravel).
- `docker/` — docker-compose, Dockerfile, nginx.conf.

## Quick start (Docker)
```bash
cd docker
docker compose up -d
```
- Frontend: http://localhost:8080
- API: http://localhost:8080/api
- Containers: `ticket-sale-app` (nginx+php-fpm), `ticket-sale-db` (mysql), `ticket-sale-redis` (redis).
- On first start, migrates/seeds once; thereafter skipped (uses `/config/.provisioned`).

## Setup flow (first run)
1) Open the SPA; setup wizard appears if no admin exists.
2) DB defaults (compose): host `db`, database `ticket_sale`, user `ticket_user`, password `ticket_pass`.
3) Create admin account, set optional SMTP + branding.
4) Setup writes `.env` and locks it; setup endpoints then hard-deny.

## Frontend dev
```bash
cd app/frontend
npm install
npm run dev    # Vite dev server
npm run build  # emits to ../backend/public/assets
```

## Backend dev
```bash
cd app/backend
composer install
php artisan migrate --database=mysql
php artisan db:seed
```

## Dev (recommended)
For development and verification we recommend using the Docker environment with the dev override compose to keep runtime parity.

To start the dev environment (bind mounts for source code are used so edits take effect immediately):
```bash
# build local app image and start services with the override
make build-image
cd docker
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

To run a CI-like smoke test locally (runs a MySQL + app image + /api/health check), use:
```bash
# default runs on port 8081 to avoid conflicts; override env if necessary
make smoke-test
```
Or override the port or image explicitly:
```bash
SMOKE_PORT=8082 IMAGE=ghcr.io/yourorg/ticket-sale:dev-latest make smoke-test
```

See `docker/README.dev.md` for more detail on mounts, named volumes vs host bind mounts, and `nginx` vs `php artisan serve` options.
## Features (current)
- Role-based access (viewer/check-in/seller/event manager/admin, site owner immutable).
- Ticket generation with CSV/PNG sheet/ZIP of per-ticket barcodes.
- Sell/verify/check-in with scan history and double-sell/check-in guards.
- Events, ticket types, user/role admin; comprehensive UI branding (logo, primary/secondary/background colors).
- UI includes toast notifications for user feedback and modal dialogs for critical interactions.
- Redis-backed sessions/cache (in Docker).
- Health endpoint: `GET /api/health`.

## CI/CD (GHCR)
- Workflow: `.github/workflows/docker-publish.yml`
- Image: `ghcr.io/<owner>/ticket-sale:latest`
- Push on commits to `main/master` and tags `v*`/`release-*`.
- Requires no extra secrets; uses `GITHUB_TOKEN` to push to GHCR in the same org/user.

## Production deploy
1) Run `docker compose -f docker/docker-compose.yml up -d --build`.
2) Browse to the app; the setup wizard appears by design.
3) Complete setup (DB creds, admin user, optional SMTP/branding). The container seeds base roles/permissions automatically and runs migrations on start.
4) Branding/settings are shared for all users and stored in the DB.

> Note: The provided `docker-compose.yml` uses placeholder host bind paths for `/var/www/html/storage` and `/config`. Replace `/host/path/ticket-sale/storage` and `/host/path/ticket-sale/config` with real paths on your host before deploying.

## phpMyAdmin (optional, manual run)
```bash
docker run -d --name ticket-sale-phpmyadmin -p 8081:80 \
  --network modern_default \
  -e PMA_HOST=db -e PMA_PORT=3306 \
  -e PMA_USER=ticket_user -e PMA_PASSWORD=ticket_pass \
  phpmyadmin:5.2
```
Then open http://localhost:8081.
