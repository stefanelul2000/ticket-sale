#!/bin/sh
# Dump the ticket-sale MySQL database (consistent, no locks) into $BACKUP_DIR and prune old dumps.
# Cron example (hourly): 15 * * * * /mnt/docker/ticket-sale/scripts/backup-db.sh >/dev/null 2>&1
# Restore: gunzip -c FILE.sql.gz | docker exec -i ticket-sale-db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ticket_sale'
set -eu

CONTAINER="${DB_CONTAINER:-ticket-sale-db}"
BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")/.." && pwd)/data/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
umask 077
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/ticket_sale-$STAMP.sql.gz"
TMP="$OUT.partial"

docker exec "$CONTAINER" sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --quick --routines --triggers --no-tablespaces ticket_sale' 2>/dev/null \
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

find "$BACKUP_DIR" -name 'ticket_sale-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
