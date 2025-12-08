#!/bin/sh
set -e

cd /var/www/html

STORED_ENV="${ENV_STORE_PATH:-/config/app.env}"
PROVISION_MARK="${PROVISION_MARK:-/config/.provisioned}"
mkdir -p "$(dirname "$STORED_ENV")" /var/www/html/storage

# Prepare a single shared .env (symlink to $STORED_ENV)
# Populate from example if the file is missing or empty.
if [ ! -s "$STORED_ENV" ]; then
  cp .env.example "$STORED_ENV"
fi
rm -f .env
ln -s "$STORED_ENV" .env

# Helper to update .env key with provided value (if present in environment)
update_env_value() {
  key="$1"
  value="$2"
  [ -z "$value" ] && return 0
  quoted=$(quote_env_value "$value")
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${quoted}|" .env
  else
    echo "${key}=${quoted}" >>.env
  fi
}

quote_env_value() {
  value="$1"
  escaped="${value//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  printf '%s' "\"$escaped\""
}

# Sync runtime env overrides into the persisted .env so Laravel picks them up
update_env_value "REDIS_HOST" "$REDIS_HOST"
update_env_value "REDIS_PORT" "$REDIS_PORT"
update_env_value "CACHE_DRIVER" "$CACHE_DRIVER"
update_env_value "SESSION_DRIVER" "$SESSION_DRIVER"
update_env_value "QUEUE_CONNECTION" "$QUEUE_CONNECTION"

if ! grep -q "^APP_KEY=" .env || [ "$(grep '^APP_KEY=' .env | cut -d= -f2)" = "" ]; then
  php artisan key:generate --force
fi

# Ensure public storage link exists (for logo uploads)
php artisan storage:link >/dev/null 2>&1 || true

# Persist env to storage volume and make it writable by www-data
chown www-data:www-data .env "$STORED_ENV"
chmod 660 .env "$STORED_ENV"

# Ensure writable storage/cache dirs
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Clear cached config/routes/views so new env values (e.g., APP_URL, REDIS_HOST) take effect
php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true

# Run migrations/seed only once (unless you remove the provision mark).
if [ ! -f "$PROVISION_MARK" ]; then
  if [ -n "$DB_HOST" ] && [ -n "$DB_DATABASE" ]; then
    if php -r "try { new PDO('mysql:host='.getenv('DB_HOST').';dbname='.getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD')); } catch (Throwable \$e) { exit(1);}"; then
      php artisan migrate --force || true
      php artisan db:seed --force || true
      touch "$PROVISION_MARK"
    else
      echo "DB not reachable yet; skipping migrate/seed. Setup will run when DB is ready."
    fi
  else
    echo "DB settings missing; skipping migrate/seed until setup completes."
  fi
else
  echo "Provisioning already completed; skipping migrate/seed."
fi

# Start services
php-fpm -D
exec nginx -g "daemon off;"
