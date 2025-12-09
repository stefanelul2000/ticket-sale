# Ticket Sale (Backend)

Laravel API for the Ticket Sale app (sessions/caching on Redis, MySQL data, Sanctum auth).

## Prerequisites
- Docker / docker-compose
- Node 20+ (for frontend build; optional if using the built assets)
- PHP/Composer (only if running backend locally outside Docker)

## Running with Docker (recommended)
From repo root:
```bash
cd docker
docker compose up -d --build
```
Services: `app` (php-fpm), `web` (nginx on :8080), `db` (MySQL), `redis` (Redis).

## Local dev without Docker (optional)
- Copy `.env.example` to `.env` and set DB/Redis creds.
- Ensure PHP extensions: pdo_mysql, redis.
- Run:
```bash
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

## Setup flow
1) Visit the app in the browser; the setup wizard will create admin user and DB settings.
2) After setup, `.env` is locked down (permissions) and setup API is hard-denied.

## Migrations & seeds
```bash
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed
```

## Tests
```bash
docker compose exec app php artisan test
```

## Notes
- Sessions/cache use Redis (`SESSION_DRIVER=redis`, `CACHE_STORE=redis`).
- Health endpoint: `GET /api/health`
- Impersonation logs and admin actions recorded in `admin_logs` table.
