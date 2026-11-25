# Ticket Sale (Modernized)

Event ticketing portal with Laravel API + React/Vite frontend, Dockerized for easy deployment.

## Structure
- `app/backend` — Laravel API (auth, roles, events, tickets, branding, setup).
- `app/frontend` — React + Vite SPA (build output served by Laravel).
- `docker/` — docker-compose, Dockerfile, nginx.conf.

## Production deploy (Docker)
```bash
# 1. Build the image (runs on any x86_64 Docker host)
docker build -f docker/Dockerfile --target app -t ticket-sale:local .
# 2. Create an env file outside git (see docker/ticket-sale.env.example) with strong DB passwords
# 3a. Start app + bundled MySQL + Redis (only the app port is published)
docker compose -p ticket-sale -f docker/docker-compose.yml --profile bundled-db --env-file /path/to/ticket-sale.env up -d
# 3b. ...or use an existing MySQL/MariaDB server (set DB_HOST, DB_NETWORK, DB_PASSWORD in the env file)
docker compose -p ticket-sale -f docker/docker-compose.yml -f docker/docker-compose.external-db.yml --env-file /path/to/ticket-sale.env up -d
# 4. Create the first owner account before exposing the site
docker exec ticket-sale-app s6-setuidgid www-data php artisan user:create-owner <username> <email> "<Name>"
```
- Put it behind an HTTPS reverse proxy that sets `X-Forwarded-Proto/Host` (private-network proxies are trusted by default, see `TRUSTED_PROXIES`). Set `APP_URL` and `SANCTUM_STATEFUL_DOMAINS` to the public host.
- Migrations run on every container start; roles/permissions are seeded on first start.
- Health: `GET /api/health` (checks the database; used by the container healthcheck).
- Backups: `scripts/backup-db.sh` (reads `DB_CONTAINER`/`DB_DATABASE` from `data/ticket-sale.env`; cron it hourly; restore command inside the script).
- Emergency: `php artisan user:reset-password <username>` (also re-activates the account).

## Ticket workflow
1. **Events** → create the event and a ticket type, then **Generate tickets**. Codes are random (`K7M3P-9QXR2`), not guessable.
2. **Download… → Barcodes ZIP**: per ticket a print card (QR + CODE128 + code + number), plus QR-only and CODE128-only images and a CSV for mail merge.
3. **Sell / assign** (Seller and up): scan or type the code and enter the guest name. A ticket must be sold/assigned before it can enter.
4. **Door check-in** (Check-in, Manager, Admin; not Sellers): Zebra/USB scanners type into the field (Enter submits); phones use the **Camera** button (needs HTTPS). Results: ENTRY OK / ALREADY CHECKED IN / NOT SOLD / UNKNOWN.
5. **Tickets** page: search by code, name or number; Managers can *Undo sale* for tickets not yet checked in.

Roles: Viewer < Check-in < Seller < Event Manager < Admin < Site Owner. Admins only manage users below their own level; the site owner cannot be changed by admins.

## Setup wizard (non-Docker installs)
If no admin exists the SPA shows a setup wizard. With `SETUP_ENABLED=true` it also asks for DB credentials; with `false` the DB comes from the environment. It locks itself once an admin exists.

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
## Tests
```bash
make test   # builds the `test` image target and runs php artisan test (sqlite in memory)
```

## CI/CD (GHCR)
- Workflow: `.github/workflows/docker-publish.yml` (runs the backend tests, then builds and pushes)
- Image: `ghcr.io/<owner>/ticket-sale:dev-latest`
- Push on commits to `dev` and tags `v*`/`release-*`.
- Requires no extra secrets; uses `GITHUB_TOKEN` to push to GHCR in the same org/user.

## phpMyAdmin (optional, manual run)
```bash
docker run -d --name ticket-sale-phpmyadmin -p 8081:80 \
  --network modern_default \
  -e PMA_HOST=db -e PMA_PORT=3306 \
  -e PMA_USER=ticket_user -e PMA_PASSWORD=ticket_pass \
  phpmyadmin:5.2
```
Then open http://localhost:8081.
