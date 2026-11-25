#!/bin/sh
# Laravel bootstrap (s6 oneshot, runs as root before php-fpm/nginx start).
# Container environment is the source of truth; /config/app.env keeps APP_KEY and
# values written by the setup wizard.
set -eu

cd /var/www/html

STORED_ENV="${ENV_STORE_PATH:-/config/app.env}"
PROVISION_MARK="${PROVISION_MARK:-/config/.provisioned}"

as_www() {
  /command/s6-setuidgid www-data "$@"
}

artisan() {
  as_www php artisan "$@"
}

log() {
  echo "[bootstrap] $*"
}

# ---------- .env (persisted in /config) ----------
mkdir -p "$(dirname "$STORED_ENV")"
if [ ! -s "$STORED_ENV" ]; then
  log "creating $STORED_ENV from .env.example"
  cp .env.example "$STORED_ENV"
fi
ln -sfn "$STORED_ENV" .env
chown www-data:www-data "$STORED_ENV" "$(dirname "$STORED_ENV")"
chmod 640 "$STORED_ENV"

if [ -z "${APP_KEY:-}" ] && ! grep -Eq '^APP_KEY=.+' "$STORED_ENV"; then
  log "generating APP_KEY"
  artisan key:generate --force
fi

# ---------- writable dirs ----------
mkdir -p storage/app/public storage/app/private storage/framework/sessions storage/framework/cache/data \
         storage/framework/views storage/logs storage/api-docs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

if [ ! -L public/storage ]; then
  artisan storage:link >/dev/null 2>&1 || true
fi

# ---------- frontend runtime config ----------
# Empty API_URL => the SPA uses its own origin + /api (works behind any proxy/host).
API_URL="${VITE_API_URL:-}"
API_URL=$(printf '%s' "$API_URL" | tr -d '"\\<>')
printf 'window.__APP_CONFIG__ = { API_URL: "%s" };\n' "$API_URL" > public/config.js
chown www-data:www-data public/config.js
log "config.js API_URL='${API_URL}'"

# ---------- caches ----------
artisan config:clear >/dev/null 2>&1 || true
artisan route:clear >/dev/null 2>&1 || true
artisan view:clear >/dev/null 2>&1 || true

if [ "${GENERATE_L5_SWAGGER_ON_STARTUP:-false}" = "true" ] || [ ! -f storage/api-docs/api-docs.json ]; then
  artisan l5-swagger:generate >/dev/null 2>&1 || log "swagger generation failed (ignored)"
fi

# ---------- database ----------
if [ "${AUTO_MIGRATE:-true}" != "true" ]; then
  log "AUTO_MIGRATE disabled; skipping migrations"
  exit 0
fi

if [ -z "${DB_HOST:-}" ]; then
  log "DB_HOST not set; migrations will run from the setup wizard"
  exit 0
fi

log "waiting for database ${DB_HOST}:${DB_PORT:-3306}"
tries=0
until as_www php -r '
  try {
    new PDO("mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT") ?: 3306).";dbname=".getenv("DB_DATABASE"),
            getenv("DB_USERNAME"), getenv("DB_PASSWORD"), [PDO::ATTR_TIMEOUT => 3]);
  } catch (Throwable $e) { exit(1); }' 2>/dev/null; do
  tries=$((tries + 1))
  if [ "$tries" -ge 60 ]; then
    log "database not reachable after 120s; continuing without migrations"
    exit 0
  fi
  sleep 2
done

# Migrations are idempotent: run on every start so image updates apply schema changes.
artisan migrate --force --no-interaction

if [ ! -f "$PROVISION_MARK" ]; then
  log "first start: seeding roles and permissions"
  artisan db:seed --force --no-interaction
  touch "$PROVISION_MARK"
  chown www-data:www-data "$PROVISION_MARK"
fi

log "bootstrap complete"
