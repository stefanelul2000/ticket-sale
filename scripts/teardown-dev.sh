#!/usr/bin/env bash
# Teardown helper to stop and remove development containers and named volumes created by docker override
set -euo pipefail

NETWORK=${NETWORK:-docker_default}
COMPOSE_DIR=docker

cd $COMPOSE_DIR

echo "Stopping compose services..."
docker compose down --remove-orphans || true

# Stop and remove common containers used by tooling if present
for NAME in ticket-sale-app ticket-sale-db ticket-sale-redis mysql-ci app-ci; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${NAME}$"; then
    echo "Removing container ${NAME}..."
    docker rm -f ${NAME} >/dev/null 2>&1 || true
  fi
done

# Remove the network if present
if docker network ls --format '{{.Name}}' | grep -q "${NETWORK}"; then
  echo "Removing network ${NETWORK}" 
  docker network rm ${NETWORK} || true
fi

# Remove named volumes created by the dev override by matching their names
VOLUMES_TO_REMOVE=$(docker volume ls -q | grep -E "backend_vendor|frontend_node_modules|db-data|docker_backend_vendor|docker_frontend_node_modules") || true
if [ -n "${VOLUMES_TO_REMOVE}" ]; then
  echo "Removing volumes:\n${VOLUMES_TO_REMOVE}"
  echo "${VOLUMES_TO_REMOVE}" | xargs -r docker volume rm || true
fi

# Also remove app-ci/mysql-ci images created by the smoke test if any (cleanup only images with expected tag)
IMAGES_TO_REMOVE=$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep 'ghcr.io/stefanelul2000/ticket-sale:dev-latest' | awk '{print $2}' ) || true
if [ -n "${IMAGES_TO_REMOVE}" ]; then
  echo "Removing dev images (IDs):\n${IMAGES_TO_REMOVE}"
  echo "${IMAGES_TO_REMOVE}" | xargs -r docker rmi -f || true
fi

echo "Teardown complete."