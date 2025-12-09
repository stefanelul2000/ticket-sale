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
update_env_value "DB_HOST" "$DB_HOST"
update_env_value "DB_DATABASE" "$DB_DATABASE"
update_env_value "DB_USERNAME" "$DB_USERNAME"
update_env_value "DB_PASSWORD" "$DB_PASSWORD"
update_env_value "SETUP_ENABLED" "$SETUP_ENABLED"
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

# Ensure framework subdirectories exist for file-based sessions/cache/views
mkdir -p storage/framework/sessions storage/framework/cache/data storage/framework/views

# Ensure writable storage/cache/public dirs
chown -R www-data:www-data storage bootstrap/cache public
chmod -R 775 storage bootstrap/cache public

# Ensure host-mounted files are editable for host users and still writable by the webserver
umask 0002

ensure_writable_dir() {
  dir="$1"
  [ -d "$dir" ] || return 0
  # Try to chown everything to www-data; if it succeeds, we're done
  if chown -R www-data:www-data "$dir" >/dev/null 2>&1; then
    chmod -R 775 "$dir" >/dev/null 2>&1 || true
    return 0
  fi

  # If chown didn't work (e.g. host mount where chown is not permitted), try ACLs if available
  if command -v setfacl >/dev/null 2>&1; then
    echo "Applying ACL for www-data on $dir"
    setfacl -R -m u:www-data:rwX -m g:www-data:rwX "$dir" || true
    setfacl -R -d -m u:www-data:rwX -m g:www-data:rwX "$dir" || true
    return 0
  fi

  # Last resort: make files and directories readable/writable by group and public (for dev only)
  echo "Applying permissive permissions on $dir"
  find "$dir" -type d -exec chmod 2775 {} \; 2>/dev/null || true
  find "$dir" -type f -exec chmod 0664 {} \; 2>/dev/null || true
}

ensure_writable_dir storage
ensure_writable_dir bootstrap/cache
ensure_writable_dir public
ensure_writable_dir /var/www/html

# ----------------------------------------
# Generate Swagger JSON on startup (if missing or if explicitly enabled)
# ----------------------------------------
# Use GENERATE_L5_SWAGGER_ON_STARTUP=true to always run, or false to only generate if missing
GENERATE_L5_SWAGGER_ON_STARTUP="${GENERATE_L5_SWAGGER_ON_STARTUP:-false}"
if [ "${GENERATE_L5_SWAGGER_ON_STARTUP}" = "true" ] || [ ! -f /var/www/html/storage/api-docs/api-docs.json ]; then
  echo "Generating L5 Swagger JSON (startup)..."
  # Attempt to generate swagger JSON; ignore failures to avoid blocking startup
  php artisan l5-swagger:generate || true
  # Fix ownership if host bind mounted created root-owned files
  chown -R www-data:www-data /var/www/html/storage/api-docs || true
fi

# Clear cached config/routes so new env values (e.g., APP_URL, REDIS_HOST) take effect
php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan route:clear >/dev/null 2>&1 || true

# Run migrations/seed only once (unless you remove the provision mark).
if [ "${AUTO_MIGRATE:-true}" = "true" ]; then
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
else
  echo "AUTO_MIGRATE disabled; skipping automatic migrate/seed."
fi

# ----------------------------------------
# Inject runtime API URL into frontend config.js
# ----------------------------------------
API_URL="${VITE_API_URL:-http://localhost/api}"

if [ -f /var/www/html/public/config.js ]; then
  echo "Injecting runtime API_URL=${API_URL} into config.js..."
  sed -i "s|__API_URL__|${API_URL}|g" /var/www/html/public/config.js
else
  echo "Warning: public/config.js not found!"
fi

echo "Final runtime config.js contents:"
cat /var/www/html/public/config.js || echo "config.js not readable"

# Start services
php-fpm -D
exec nginx -g "daemon off;"

