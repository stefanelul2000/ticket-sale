#!/usr/bin/env bash
# Runs the same basic smoke test the CI does (MySQL + app image + healthcheck)
set -euo pipefail

default_image="ghcr.io/stefanelul2000/ticket-sale:dev-latest"
IMAGE=${IMAGE:-${default_image}}
NETWORK=${NETWORK:-ticket-sale-ci}
SMOKE_PORT=${SMOKE_PORT:-8081}

# Create network if missing
if ! docker network ls | grep -q "$NETWORK"; then
docker network create "$NETWORK" || true
fi

# Start MySQL
if ! docker ps -a --format '{{.Names}}' | grep -q mysql-ci; then
  docker run -d --name mysql-ci --network "$NETWORK" \
    -e MYSQL_DATABASE=ticket_sale \
    -e MYSQL_USER=ticket_user \
    -e MYSQL_PASSWORD=ticket_pass \
    -e MYSQL_ROOT_PASSWORD=rootpass \
    mysql:8.0
else
  docker start mysql-ci >/dev/null || true
fi

# Wait for MySQL
for i in {1..30}; do
  if docker exec mysql-ci mysql -u root -prootpass -e "SELECT 1;" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# Run the app image
if docker ps -a --format '{{.Names}}' | grep -q app-ci; then
  if docker ps --format '{{.Names}}' | grep -q app-ci; then
    docker start app-ci >/dev/null || true
  else
    docker rm app-ci >/dev/null 2>&1 || true
    docker run -d --name app-ci --network "$NETWORK" -p ${SMOKE_PORT}:80 \
    -e APP_ENV=production \
    -e APP_DEBUG=false \
    -e DB_HOST=mysql-ci \
    -e DB_DATABASE=ticket_sale \
    -e DB_USERNAME=ticket_user \
    -e DB_PASSWORD=ticket_pass \
    -e CACHE_DRIVER=file \
    -e SESSION_DRIVER=file \
    -e QUEUE_CONNECTION=sync \
    -e VITE_API_URL=http://localhost:${SMOKE_PORT}/api \
    "$IMAGE"
  fi
fi

# Wait for health endpoint
for i in {1..40}; do
  if curl -fsS http://localhost:${SMOKE_PORT}/api/health >/dev/null 2>&1; then
    echo "Healthcheck OK"
    exit 0
  fi
  sleep 2
done

echo "Healthcheck failed"
docker logs app-ci || true
exit 1
