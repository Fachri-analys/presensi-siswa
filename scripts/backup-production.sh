#!/bin/sh
set -eu
umask 077

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${ENV_FILE:-"$PROJECT_ROOT/.env.production"}
COMPOSE_FILE=${COMPOSE_FILE:-"$PROJECT_ROOT/docker-compose.production.yml"}
BACKUP_DIR=${BACKUP_DIR:-"$PROJECT_ROOT/backups"}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

if [ ! -f "$ENV_FILE" ]; then
  echo "Production env file not found: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

DB_BACKUP="$BACKUP_DIR/presensi-db-$STAMP.dump"
UPLOADS_BACKUP="$BACKUP_DIR/presensi-uploads-$STAMP.tar.gz"
DB_TEMP="$DB_BACKUP.partial"
UPLOADS_TEMP="$UPLOADS_BACKUP.partial"

cleanup() {
  rm -f "$DB_TEMP" "$UPLOADS_TEMP"
}
trap cleanup EXIT

compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DB_TEMP"
compose exec -T api tar -czf - -C /app/uploads . > "$UPLOADS_TEMP"

if [ ! -s "$DB_TEMP" ] || [ ! -s "$UPLOADS_TEMP" ]; then
  echo "Backup failed: one or more backup files are empty." >&2
  exit 1
fi

mv "$DB_TEMP" "$DB_BACKUP"
mv "$UPLOADS_TEMP" "$UPLOADS_BACKUP"
chmod 600 "$DB_BACKUP" "$UPLOADS_BACKUP"
printf 'Database: %s\nUploads:  %s\n' "$DB_BACKUP" "$UPLOADS_BACKUP"
