#!/usr/bin/env bash
# Event reminder run against production (the /kulan event).
#
# Manual dry run:  ./scripts/event-reminders-run.sh
# Manual send:     ./scripts/event-reminders-run.sh --send
# Scheduled:       scripts/com.unkad.event-reminders.plist (launchd, Tue 13 Oct
#                  20:00 and Wed 14 Oct 19:00 EAT). event-reminders.mjs decides
#                  which reminder is due and marks each one sent, so a late or
#                  repeated run never double-sends and a run after the start
#                  sends nothing.
#
# Same shape as nudge-daily.sh: reads production and the bulk key from
# .env.local, waits for DNS in case launchd fires just after wake.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${UNKAD_STATE_DIR:-$HOME/UnkadBackups}"
STAMP="$(date -u +%FT%TZ)"
mkdir -p "$LOG_DIR"

val() { grep "^$1=" "$REPO_DIR/.env.local" | tail -1 | cut -d= -f2- | tr -d '"'; }

DB_URL="$(val DATABASE_URL_UNPOOLED)"
[ -n "$DB_URL" ] || { echo "$STAMP DATABASE_URL_UNPOOLED not found in .env.local" >&2; exit 1; }

HOST="$(echo "$DB_URL" | sed -E 's|.*@([^/:]+).*|\1|')"
for attempt in $(seq 1 20); do
  if host "$HOST" >/dev/null 2>&1 || nslookup "$HOST" >/dev/null 2>&1; then break; fi
  echo "$(date -u +%FT%TZ) waiting for DNS ($HOST), attempt $attempt" >&2
  sleep 30
done

cd "$REPO_DIR"
echo "$STAMP event reminders ${1:---dry-run}"
DATABASE_URL="$DB_URL" UNKAD_BULK_TOKEN="$(val UNKAD_BULK_TOKEN)" EVENT_TOKEN_SECRET="$(val EVENT_TOKEN_SECRET)" \
  node scripts/event-reminders.mjs "$@"
