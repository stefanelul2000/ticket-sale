#!/bin/sh
set -e

cd /var/www/html

STORED_ENV="${ENV_STORE_PATH:-/config/app.env}"
PROVISION_MARK="${PROVISION_MARK:-/config/.provisioned}"
mkdir -p "$(dirname "$STORED_ENV")" /var/www/html/storage

# Restore env from storage if present
if [ -f "$STORED_ENV" ]; then
  cp "$STORED_ENV" .env
elif [ ! -f .env ]; then
  cp .env.example .env
fi

if ! grep -q "^APP_KEY=" .env || [ "$(grep '^APP_KEY=' .env | cut -d= -f2)" = "" ]; then
  php artisan key:generate --force
fi

# Persist env to storage volume
cp .env "$STORED_ENV"

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
