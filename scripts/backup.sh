#!/usr/bin/env bash
# Nightly Neon backup — runs locally, costs nothing.
#
# Manual:    ./scripts/backup.sh
# Scheduled: see scripts/com.unkad.backup.plist (macOS launchd)
#
# Dumps the production database to ~/UnkadBackups/ and keeps 30 days.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${UNKAD_BACKUP_DIR:-$HOME/UnkadBackups}"
KEEP_DAYS=30

# Read the unpooled connection string from .env.local (pg_dump dislikes poolers).
DB_URL="$(grep '^DATABASE_URL_UNPOOLED=' "$REPO_DIR/.env.local" | cut -d'"' -f2)"
if [ -z "$DB_URL" ]; then
  echo "DATABASE_URL_UNPOOLED not found in .env.local" >&2
  exit 1
fi

# Neon runs Postgres 17; use a matching client if one is installed.
PG_DUMP="$(ls /opt/homebrew/opt/postgresql@17/bin/pg_dump 2>/dev/null || command -v pg_dump)"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y-%m-%d_%H%M)"
OUT="$BACKUP_DIR/unkad-$STAMP.dump"

"$PG_DUMP" "$DB_URL" --no-owner --format=custom --file="$OUT"
echo "$(date -u +%FT%TZ) wrote $OUT ($(du -h "$OUT" | cut -f1))"

# Prune old backups.
find "$BACKUP_DIR" -name 'unkad-*.dump' -mtime +$KEEP_DAYS -delete
echo "$(date -u +%FT%TZ) backups on disk: $(ls -1 "$BACKUP_DIR"/unkad-*.dump 2>/dev/null | wc -l | tr -d ' ')"
