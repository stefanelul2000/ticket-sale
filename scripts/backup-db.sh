#!/bin/sh
# Dump the ticket-sale MySQL database (consistent, no locks) into $BACKUP_DIR and prune old dumps.
# Cron example (hourly): 15 * * * * /mnt/docker/ticket-sale/scripts/backup-db.sh >/dev/null 2>&1
# Restore: gunzip -c FILE.sql.gz | docker exec -i <db-container> sh -c 'exec mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" ticket_sale'
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# DB_CONTAINER / DB_DATABASE may come from the deployment env file.
if [ -f "$ROOT/data/ticket-sale.env" ]; then
  DB_CONTAINER="${DB_CONTAINER:-$(sed -n 's/^DB_CONTAINER=//p' "$ROOT/data/ticket-sale.env")}"
  DB_DATABASE="${DB_DATABASE:-$(sed -n 's/^DB_DATABASE=//p' "$ROOT/data/ticket-sale.env")}"
fi
CONTAINER="${DB_CONTAINER:-ticket-sale-db}"
DATABASE="${DB_DATABASE:-ticket_sale}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/data/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
umask 077
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/$DATABASE-$STAMP.sql.gz"
TMP="$OUT.partial"

# Works for MySQL and MariaDB images (root password from the container's own env).
docker exec -e DUMP_DB="$DATABASE" "$CONTAINER" sh -c '
  DUMP=$(command -v mariadb-dump || command -v mysqldump)
  exec "$DUMP" -uroot -p"${MYSQL_ROOT_PASSWORD:-$MARIADB_ROOT_PASSWORD}" --single-transaction --quick --routines --triggers --no-tablespaces "$DUMP_DB"' 2>/dev/null \
  | gzip -9 > "$TMP"

# A valid dump ends with the completion marker; never keep a truncated file.
if gunzip -c "$TMP" | tail -n 1 | grep -q "Dump completed"; then
  mv "$TMP" "$OUT"
  echo "backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
else
  rm -f "$TMP"
  echo "backup FAILED" >&2
  exit 1
fi

find "$BACKUP_DIR" -name "$DATABASE-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
