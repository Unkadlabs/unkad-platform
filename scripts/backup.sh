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

# launchd wakes the Mac to run this, and on 26 July it fired before the network
# was up: pg_dump failed DNS resolution and left a 0-byte file behind. An empty
# file that looks like a backup is worse than no file, because it becomes the
# most recent one and reads as success. So: retry while the network settles,
# verify the result is real, and delete anything that is not.
HOST="$(echo "$DB_URL" | sed -E 's|.*@([^/:]+).*|\1|')"
for attempt in 1 2 3 4 5; do
  if host "$HOST" >/dev/null 2>&1 || nslookup "$HOST" >/dev/null 2>&1; then break; fi
  echo "$(date -u +%FT%TZ) waiting for DNS ($HOST), attempt $attempt" >&2
  sleep 30
done

if ! "$PG_DUMP" "$DB_URL" --no-owner --format=custom --file="$OUT"; then
  rm -f "$OUT"
  echo "$(date -u +%FT%TZ) BACKUP FAILED, removed partial file" >&2
  exit 1
fi

# A custom-format dump of a live corpus is tens of KB. Anything tiny means the
# dump aborted early even though pg_dump returned success.
SIZE=$(wc -c < "$OUT" | tr -d ' ')
if [ "$SIZE" -lt 10000 ]; then
  rm -f "$OUT"
  echo "$(date -u +%FT%TZ) BACKUP SUSPECT (${SIZE} bytes), removed" >&2
  exit 1
fi
echo "$(date -u +%FT%TZ) wrote $OUT ($(du -h "$OUT" | cut -f1))"

# Prune old backups.
find "$BACKUP_DIR" -name 'unkad-*.dump' -mtime +$KEEP_DAYS -delete
echo "$(date -u +%FT%TZ) backups on disk: $(ls -1 "$BACKUP_DIR"/unkad-*.dump 2>/dev/null | wc -l | tr -d ' ')"
