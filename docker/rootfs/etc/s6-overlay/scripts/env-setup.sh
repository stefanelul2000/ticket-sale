#!/command/with-contenv bash
set -euo pipefail

if [ -n "${TZ:-}" ] && [ -f "/usr/share/zoneinfo/${TZ}" ]; then
  ln -sf "/usr/share/zoneinfo/${TZ}" /etc/localtime
  echo "${TZ}" > /etc/timezone
fi

PUID=${PUID:-1000}
PGID=${PGID:-1000}

CURRENT_UID=$(id -u www-data)
CURRENT_GID=$(id -g www-data)

if [ "${CURRENT_GID}" != "${PGID}" ]; then
  groupmod -o -g "${PGID}" www-data
fi

if [ "${CURRENT_UID}" != "${PUID}" ]; then
  usermod -o -u "${PUID}" www-data
fi

echo "Permissions fixed: www-data is now UID ${PUID}"

# Only runtime directories belong to www-data; the application code stays root-owned.
for d in /var/www/storage /var/www/bootstrap/cache; do
  [ -d "$d" ] && chown -R www-data:www-data "$d"
done
chown -R www-data:www-data /var/log/php82 2>/dev/null || true

mkdir -p /var/log/nginx /var/log/php82 /var/lib/nginx/logs
chown -R nginx:nginx /var/log/nginx /var/lib/nginx/logs
chown -R www-data:www-data /var/log/php82
