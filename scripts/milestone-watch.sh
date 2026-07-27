#!/usr/bin/env bash
# Watch for the peer-accepted milestone and say so once, out loud.
#
# Manual:    ./scripts/milestone-watch.sh
# Scheduled: see scripts/com.unkad.milestone.plist (macOS launchd, twice daily)
#
# Runs scripts/milestone.mjs against production, logs every check, and raises a
# macOS notification the first time the goal is met. Same shape as backup.sh:
# local, free, reads the unpooled production URL from .env.local, and assumes
# nothing about the network being up when launchd fires.
#
# Why a marker file. The interesting event is crossing the line, which happens
# once; without a marker every run after it would notify again and the alert
# would become noise within a day. Delete the marker to re-arm, which is also
# what you do after raising the goal.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GOAL="${UNKAD_MILESTONE_GOAL:-2000}"
STATE_DIR="${UNKAD_STATE_DIR:-$HOME/UnkadBackups}"
MARKER="$STATE_DIR/milestone-$GOAL.reached"
LOG_STAMP="$(date -u +%FT%TZ)"

mkdir -p "$STATE_DIR"

# Production, not the local dev database. The pooled URL is fine here: this is
# a handful of read queries, unlike pg_dump.
DB_URL="$(grep '^DATABASE_URL_UNPOOLED=' "$REPO_DIR/.env.local" | cut -d'"' -f2)"
if [ -z "$DB_URL" ]; then
  echo "$LOG_STAMP DATABASE_URL_UNPOOLED not found in .env.local" >&2
  exit 1
fi

# launchd wakes the Mac to run this and can fire before the network is up. The
# backup job learned this the hard way on 26 July; a milestone check that fails
# on DNS would just log a spurious error, but there is no reason to repeat it.
HOST="$(echo "$DB_URL" | sed -E 's|.*@([^/:]+).*|\1|')"
for attempt in 1 2 3 4 5; do
  if host "$HOST" >/dev/null 2>&1 || nslookup "$HOST" >/dev/null 2>&1; then break; fi
  echo "$LOG_STAMP waiting for DNS ($HOST), attempt $attempt" >&2
  sleep 30
done

cd "$REPO_DIR"

# milestone.mjs exits 0 when the goal is met and 1 when it is not, so `set -e`
# would kill the script on the ordinary "not yet" path. Capture instead.
set +e
OUTPUT="$(DATABASE_URL="$DB_URL" node scripts/milestone.mjs --goal "$GOAL" 2>&1)"
REACHED=$?
set -e

echo "$LOG_STAMP check (goal $GOAL)"
echo "$OUTPUT"

if [ "$REACHED" -ne 0 ]; then
  exit 0
fi

if [ -f "$MARKER" ]; then
  echo "$LOG_STAMP goal $GOAL already announced on $(cat "$MARKER")"
  exit 0
fi

date -u +%FT%TZ > "$MARKER"
echo "$LOG_STAMP GOAL $GOAL REACHED"

# Notification plus a spoken line, because the whole point is not having to
# check. Both are best-effort: a headless or muted Mac must not fail the job.
osascript -e "display notification \"$GOAL peer-accepted sentences. Time to post.\" with title \"Qor Af-Soomaali\" sound name \"Glass\"" 2>/dev/null || true
say "Qor Af Soomaali reached $GOAL peer accepted sentences" 2>/dev/null || true
