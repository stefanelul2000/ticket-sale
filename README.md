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
- Containers: `ticket-sale-app` (php-fpm), `ticket-sale-web` (nginx), `ticket-sale-db` (mysql), `ticket-sale-redis` (redis).
- On start, migrates/seeds roles automatically.

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

## Features (current)
- Role-based access (viewer/check-in/seller/event manager/admin, site owner immutable).
- Ticket generation with CSV/PNG sheet/ZIP of per-ticket barcodes.
- Sell/verify/check-in with scan history and double-sell/check-in guards.
- Events, ticket types, user/role admin; branding (logo/colors).
- Redis-backed sessions/cache (in Docker).
- Health endpoint: `GET /api/health`.

## phpMyAdmin (optional, manual run)
```bash
docker run -d --name ticket-sale-phpmyadmin -p 8081:80 \
  --network modern_default \
  -e PMA_HOST=db -e PMA_PORT=3306 \
  -e PMA_USER=ticket_user -e PMA_PASSWORD=ticket_pass \
  phpmyadmin:5.2
```
Then open http://localhost:8081.
