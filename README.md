# Bilete · Atelier Săcelean

Invitation and door-check-in platform for [Asociația Atelier Săcelean](https://atelier-sacelean.ro) — Laravel API + React/Vite SPA (Romanian/English, light/dark, Atelier Săcelean design), Dockerized.

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
#     and sit behind a reverse-proxy container without publishing a host port (PROXY_NETWORK, TRUSTED_PROXIES):
docker compose -p ticket-sale -f docker/docker-compose.yml -f docker/docker-compose.external-db.yml \
  -f docker/docker-compose.proxy-net.yml --env-file /path/to/ticket-sale.env up -d
# 4. Create the first owner account before exposing the site
docker exec ticket-sale-app s6-setuidgid www-data php artisan user:create-owner <username> <email> "<Name>"
```
- Put it behind an HTTPS reverse proxy that sets `X-Forwarded-Proto/Host`. Set `TRUSTED_PROXIES` to the proxy's network only, and `APP_URL` / `SANCTUM_STATEFUL_DOMAINS` to the public host.
- Recommended CSP for the host: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` and `Permissions-Policy: camera=(self)`.
- Swagger docs are off unless `API_DOCS_ENABLED=true`. There is no email password reset: admins reset passwords (or `php artisan user:reset-password`).
- Migrations run on every container start; roles/permissions are seeded on first start.
- Health: `GET /api/health` (checks the database; used by the container healthcheck).
- Backups: `scripts/backup-db.sh` (reads `DB_CONTAINER`/`DB_DATABASE` from `data/ticket-sale.env`; cron it hourly; restore command inside the script).
- Emergency: `php artisan user:reset-password <username>` (also re-activates the account).

## How it works
- **Events** (managers): create the event (date, venue, capacity, description, public page, Nextcloud photos link, donation link). Each event has tabs: *Overview* (live report), *Guests*, *Invitations & print*, *Types*, *Settings* (duplicate for next year, delete).
- **Invitations & print**: generate random, unguessable codes (`K7M3P-9QXR2`) or paste a guest list (`Name; category`) to get personalised invitations. The ZIP contains a print card per invitation (logo, event, date, guest name, QR + CODE128), QR-only and CODE128-only images and a CSV for mail merge.
- **QR codes** contain the public ticket URL (`<public_url>/t/CODE`): parents land on the event page (status, *Donează* and *Poze* buttons); door scanners extract the code from the same QR. CODE128 holds the plain code. Set the public URL in *Settings* before printing.
- **Assign invitations** (volunteers): scan/type the code, type the guest name, optional category (parent, family, friend, official guest, partner, press, other). A ticket must be assigned before it is valid at the door.
- **Door** (check-in staff): bound to one event; scanners (Zebra DataWedge keyboard output, USB) or the phone camera; results ENTRY OK / ALREADY IN / NOT ASSIGNED / WRONG EVENT / UNKNOWN; name search; walk-ins without invitation; live counters.
- **Reports**: per event (attendance, arrivals per 15 min, who came by category, distribution per day, volunteers, CSV) and across events; returning guests (managers).
- **Public pages**: `/e` (published events), `/e/<slug>`, `/t/<code>` — no guest names are ever shown publicly.

Roles: Reports < Door < Volunteer < Event manager < Admin < Owner (see the *Users* page). Admins only manage users below their own level. Public self-registration is off (`REGISTRATION_ENABLED=false`).

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
