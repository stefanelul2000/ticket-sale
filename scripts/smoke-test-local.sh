#!/usr/bin/env bash
# Runs the same basic smoke test the CI does (MySQL + app image + healthcheck)
#
# Environment variables:
#  IMAGE: docker image to run (defaults to ghcr.io/<org>/ticket-sale:dev-latest)
#  SMOKE_PORT: host port to bind (defaults to 8080; will auto-choose a free port)
#  NETWORK: docker network to use (defaults to ticket-sale-ci)
#  DEBUG=1: print debug output
#  SKIP_CLEANUP=1: skip cleanup at the end (leave containers running for debugging)
set -euo pipefail
DEBUG=${DEBUG:-1}

# Helper: Find a free TCP port on the host starting from a given port
find_free_port() {
  start_port=$1
  for p in $(seq ${start_port} $((start_port + 100))); do
    if ! ss -ltn 2>/dev/null | grep -q ":[[:space:]]*${p}\b"; then
      echo $p
      return 0
    fi
  done
  return 1
}

default_image="ghcr.io/stefanelul2000/ticket-sale:dev-latest"
IMAGE=${IMAGE:-${default_image}}
NETWORK=${NETWORK:-ticket-sale-ci}
# Track whether this script created the network or the containers so we can clean them up.
CREATED_NETWORK=0
CREATED_MYSQL=0
CREATED_APP=0
SKIP_CLEANUP=${SKIP_CLEANUP:-0}
# Align with CI: default host port 8080 (will auto-shift if busy)
SMOKE_PORT=${SMOKE_PORT:-8080}
if ss -ltn 2>/dev/null | grep -q ":[[:space:]]*${SMOKE_PORT}\b"; then
  if [ "$DEBUG" -eq 1 ]; then
    echo "Host port ${SMOKE_PORT} appears to be in use. Searching for a free port..."
  fi
  NEW_PORT=$(find_free_port $((SMOKE_PORT + 1))) || NEW_PORT=$(find_free_port 20000) || true
  if [ -n "$NEW_PORT" ]; then
    if [ "$DEBUG" -eq 1 ]; then
      echo "Using free host port ${NEW_PORT} instead of requested ${SMOKE_PORT}"
    fi
    SMOKE_PORT=${NEW_PORT}
  else
    echo "No free port found near ${SMOKE_PORT}; please specify SMOKE_PORT manually" >&2
    exit 1
  fi
fi

# Create network if missing
if ! docker network ls | grep -q "$NETWORK"; then
  [ "$DEBUG" -eq 1 ] && echo "Creating network $NETWORK"
  docker network create "$NETWORK" || true
  CREATED_NETWORK=1
fi

# Start MySQL
if ! docker ps -a --format '{{.Names}}' | grep -q mysql-ci; then
  docker run -d --name mysql-ci --network "$NETWORK" \
    -e MYSQL_DATABASE=ticket_sale \
    -e MYSQL_USER=ticket_user \
    -e MYSQL_PASSWORD=ticket_pass \
    -e MYSQL_ROOT_PASSWORD=rootpass \
    mysql:8.0
  CREATED_MYSQL=1
else
  [ "$DEBUG" -eq 1 ] && echo "Starting existing mysql-ci"
  docker start mysql-ci >/dev/null || true
fi

# Wait for MySQL
for i in {1..30}; do
  [ "$DEBUG" -eq 1 ] && echo "Waiting for MySQL to be ready (attempt ${i}/30)"
  if docker exec mysql-ci mysql -u root -prootpass -e "SELECT 1;" >/dev/null 2>&1; then
    [ "$DEBUG" -eq 1 ] && echo "MySQL ready"
    break
  fi
  sleep 2
done

# Run the app image
if docker ps -a --format '{{.Names}}' | grep -q app-ci; then
  [ "$DEBUG" -eq 1 ] && echo "Removing existing app-ci"
  docker rm -f app-ci >/dev/null 2>&1 || true
fi

[ "$DEBUG" -eq 1 ] && echo "Running app-ci from image $IMAGE on port ${SMOKE_PORT}"
run_out=$(docker run -d --name app-ci --network "$NETWORK" -p ${SMOKE_PORT}:80 \
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
  "$IMAGE" 2>&1) || true
if [ -n "$run_out" ] && echo "$run_out" | grep -qi "Error response from daemon"; then
  echo "Failed to start app image: $run_out" >&2
  echo "Try a different free port with SMOKE_PORT or stop any container bound to ${SMOKE_PORT}." >&2
  exit 1
fi
CREATED_APP=1

# If SKIP_CLEANUP is not set, ensure cleanup runs on script exit
cleanup() {
  if [ "$SKIP_CLEANUP" = "1" ]; then
    [ "$DEBUG" -eq 1 ] && echo "SKIP_CLEANUP=1; leaving test containers & network intact"
    return 0
  fi

  [ "$DEBUG" -eq 1 ] && echo "Running cleanup..."
  # Remove app container if we created it or if it's using the name
  if docker ps -a --format '{{.Names}}' | grep -q app-ci; then
    docker rm -f app-ci >/dev/null 2>&1 || true
    [ "$DEBUG" -eq 1 ] && echo "Removed app-ci container"
  fi

  # Remove mysql container if we created it (or in any case) to avoid stale state
  if docker ps -a --format '{{.Names}}' | grep -q mysql-ci; then
    docker rm -f mysql-ci >/dev/null 2>&1 || true
    [ "$DEBUG" -eq 1 ] && echo "Removed mysql-ci container"
  fi

  # Remove network if our script created it
  if [ "$CREATED_NETWORK" -eq 1 ]; then
    docker network rm "$NETWORK" >/dev/null 2>&1 || true
    [ "$DEBUG" -eq 1 ] && echo "Removed network $NETWORK"
  fi
}
trap cleanup EXIT INT TERM

# Wait for health endpoint
for i in {1..40}; do
  if [ "$DEBUG" -eq 1 ]; then
    echo "Checking health endpoint (attempt ${i}/40)"
  fi
  if curl -fsS http://localhost:${SMOKE_PORT}/api/health >/dev/null 2>&1; then
    echo "Healthcheck OK"
    exit 0
  fi
  sleep 2
done

echo "Healthcheck failed"
docker logs --tail 200 app-ci || true
exit 1
