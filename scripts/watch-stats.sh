#!/usr/bin/env bash
# Poll the public stats endpoint and print a line only when something changes.
#
# Deliberately quiet: emitting every poll would bury the one event you care
# about (a new signup, a submission, the first accepted sentence) under a wall
# of identical lines. Silence means nothing moved.
#
# Usage: ./scripts/watch-stats.sh [interval_seconds]

set -uo pipefail

URL="https://qor.unkad.com/api/stats"
INTERVAL="${1:-60}"

read_stats() {
  curl -s --max-time 20 "$URL" 2>/dev/null
}

field() { echo "$1" | sed -E "s/.*\"$2\":([0-9]+).*/\1/"; }

prev=""
first=1

while true; do
  cur="$(read_stats)"

  # A failed fetch is not a change. Skip rather than reporting a phantom drop.
  if [ -z "$cur" ] || ! echo "$cur" | grep -q '"contributors"'; then
    sleep "$INTERVAL"
    continue
  fi

  if [ "$cur" != "$prev" ]; then
    c=$(field "$cur" contributors)
    p=$(field "$cur" pending)
    a=$(field "$cur" accepted)
    ts=$(date +%H:%M)

    if [ "$first" = "1" ]; then
      echo "[$ts] watching: $c contributors, $p pending, $a accepted"
      first=0
    else
      pc=$(field "$prev" contributors)
      pp=$(field "$prev" pending)
      pa=$(field "$prev" accepted)
      parts=""
      [ "$c" != "$pc" ] && parts="$parts contributors $pc→$c"
      [ "$p" != "$pp" ] && parts="$parts pending $pp→$p"
      [ "$a" != "$pa" ] && parts="$parts accepted $pa→$a"
      echo "[$ts]$parts"
    fi
    prev="$cur"
  fi

  sleep "$INTERVAL"
done
