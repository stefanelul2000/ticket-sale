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

if [ -d /var/www ]; then
  ROOT_UID=$(stat -c %u /var/www)
  ROOT_GID=$(stat -c %g /var/www)
  if [ "${ROOT_UID}" != "${PUID}" ] || [ "${ROOT_GID}" != "${PGID}" ]; then
    echo "Adjusting ownership for /var/www to ${PUID}:${PGID}"
    chown -R www-data:www-data /var/www
    chown -R www-data:www-data /var/log || true
  else
    echo "/var/www already owned by ${PUID}:${PGID}; skipping recursive chown"
  fi
fi

mkdir -p /var/log/nginx /var/log/php82 /var/lib/nginx/logs
chown -R nginx:nginx /var/log/nginx /var/lib/nginx/logs
chown -R www-data:www-data /var/log/php82
