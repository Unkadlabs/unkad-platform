#!/usr/bin/env bash
# The daily morning encouragement run.
#
# Manual dry run:  ./scripts/nudge-daily.sh
# Manual send:     ./scripts/nudge-daily.sh --send
# Scheduled:       see scripts/com.unkad.nudge.plist (macOS launchd, 07:18)
#
# Same shape as backup.sh and milestone-watch.sh: local, free, reads production
# from .env.local, and does not assume the network is up when launchd fires.
#
# Sending needs UNKAD_BULK_TOKEN, a different provider key from the one password
# resets use. That separation is the point: a morning run that empties the daily
# allowance would silently break the one email a locked-out contributor is
# actually waiting for. Without the key this refuses to send rather than falling
# back to the reset key.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${UNKAD_STATE_DIR:-$HOME/UnkadBackups}"
STAMP="$(date -u +%FT%TZ)"

mkdir -p "$LOG_DIR"

DB_URL="$(grep '^DATABASE_URL_UNPOOLED=' "$REPO_DIR/.env.local" | cut -d'"' -f2)"
if [ -z "$DB_URL" ]; then
  echo "$STAMP DATABASE_URL_UNPOOLED not found in .env.local" >&2
  exit 1
fi

HOST="$(echo "$DB_URL" | sed -E 's|.*@([^/:]+).*|\1|')"
for attempt in 1 2 3 4 5; do
  if host "$HOST" >/dev/null 2>&1 || nslookup "$HOST" >/dev/null 2>&1; then break; fi
  echo "$STAMP waiting for DNS ($HOST), attempt $attempt" >&2
  sleep 30
done

# The bulk key, read from .env.local the same way. Absent is not an error here:
# the dry run is useful on its own, and nudge.mjs refuses to send without it.
BULK_TOKEN="$(grep '^UNKAD_BULK_TOKEN=' "$REPO_DIR/.env.local" 2>/dev/null | cut -d'"' -f2 || true)"

cd "$REPO_DIR"
echo "$STAMP nudge run ${1:---dry-run}"

DATABASE_URL="$DB_URL" UNKAD_BULK_TOKEN="${BULK_TOKEN:-}" \
  node scripts/nudge.mjs "$@"
