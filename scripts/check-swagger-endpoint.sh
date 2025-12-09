#!/bin/sh
set -eu

# Simple smoke test to validate swagger JSON and UI are available
# Usage: scripts/check-swagger-endpoint.sh [host] [port]
HOST=${1:-localhost}
PORT=${2:-8080}
BASE="http://${HOST}:${PORT}"

echo "Waiting for health endpoint to become ready on ${BASE}..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "${BASE}/api/health" >/dev/null 2>&1; then
    echo "Health OK"
    break
  fi
  sleep 2
done

echo "Checking swagger JSON endpoint..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -fsS -H 'X-Forwarded-Proto: https' "${BASE}/api/docs?api-docs.json" >/dev/null 2>&1; then
    echo "Swagger JSON OK"
    break
  fi
  sleep 2
done

echo "Validating swagger UI references the JSON URL..."
if ! curl -fsS -H 'X-Forwarded-Proto: https' "${BASE}/api/documentation" | grep -q 'url: "/api/docs?api-docs.json"'; then
  echo "Swagger UI does not reference the expected JSON path"
  exit 1
fi

echo "Swagger endpoints validated"
exit 0
