#!/bin/bash
# Kilroy connector pre-check, runs on every Claude Code session start in this repo.
#
# This is a fast, deterministic reachability probe -- not a replacement for the
# check-connectors skill (kilroy/Skills/check-connectors/SKILL.md). That skill is
# still the authoritative gate run by an agent before any real data-pulling skill
# (arriving-amr-progress, fleet-commissioning-handoff, run-daily-workflow). This
# hook just surfaces a heads-up the moment a session opens, so a bad .env doesn't
# go unnoticed until Jordan types a command.
#
# Deliberately short, fixed timeouts here (not $OVERMIND_TIMEOUT_SEC, which is
# tuned for a real interactive data pull) -- this runs on every session start and
# should not make startup noticeably slower.

set -uo pipefail

KILROY_DIR="$CLAUDE_PROJECT_DIR/kilroy"
ENV_FILE="$KILROY_DIR/.env"
PROBE_TIMEOUT=3

echo "=== Kilroy connector check (session start) ==="

if [ ! -f "$ENV_FILE" ]; then
  echo "FAIL: .env not found at $ENV_FILE"
  echo "  -> cp kilroy/.env.example kilroy/.env, then fill it in."
  echo "=== end connector check ==="
  exit 0
fi

# Parse .env line by line rather than `source`/`set -a`: MASTER_TRACKER_CSV_PATH's
# default value in .env.example has an unquoted space ("OneDrive - Tesla"), which
# breaks a naive `source` (bash would try to run " Tesla/AMR..." as a command).
while IFS='=' read -r key value || [ -n "$key" ]; do
  key="$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -z "$key" || "$key" == \#* ]] && continue
  value="${value%$'\r'}"
  export "$key=$value"
done < "$ENV_FILE"

missing=()
for var in OVERMIND_BASE_URL_TEMPLATE AMR_HUB_BASE_URL MASTER_TRACKER_CSV_PATH MASTER_TRACKER_STALE_WARN_HOURS; do
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "FAIL: missing/empty required .env vars: ${missing[*]}"
  echo "=== end connector check ==="
  exit 0
fi

# AMR Hub -- pass = any 2xx.
amr_code=$(curl -s -o /dev/null -m "$PROBE_TIMEOUT" -w '%{http_code}' "$AMR_HUB_BASE_URL/api/amrs" 2>/dev/null)
if [[ "$amr_code" =~ ^2 ]]; then
  echo "PASS: AMR Hub reachable at $AMR_HUB_BASE_URL (HTTP $amr_code)"
else
  echo "FAIL: AMR Hub unreachable at $AMR_HUB_BASE_URL"
fi

# Overmind -- pass = any real HTTP response, including an auth-rejected one
# (v1 is on-corp-network-open with no token; this only tests reachability).
# curl reports "000" for a connection that never got a response.
FLEET="${KILROY_TEST_FLEET:-gftx-cybercab-2m-b3-agv}"
overmind_url="${OVERMIND_BASE_URL_TEMPLATE//\{fleet\}/$FLEET}"
overmind_code=$(curl -s -o /dev/null -m "$PROBE_TIMEOUT" -w '%{http_code}' "$overmind_url" 2>/dev/null)
if [ -n "$overmind_code" ] && [ "$overmind_code" != "000" ]; then
  echo "PASS: Overmind reachable at $overmind_url (fleet=$FLEET, HTTP $overmind_code)"
else
  echo "FAIL: Overmind unreachable at $overmind_url (fleet=$FLEET)"
fi

# Master Tracker CSV -- existence/readability is pass/fail; staleness is a WARN.
if [ ! -f "$MASTER_TRACKER_CSV_PATH" ]; then
  echo "FAIL: Master Tracker CSV not found at $MASTER_TRACKER_CSV_PATH"
elif [ ! -r "$MASTER_TRACKER_CSV_PATH" ]; then
  echo "FAIL: Master Tracker CSV not readable at $MASTER_TRACKER_CSV_PATH"
else
  mtime=$(stat -c %Y "$MASTER_TRACKER_CSV_PATH" 2>/dev/null || stat -f %m "$MASTER_TRACKER_CSV_PATH" 2>/dev/null)
  now=$(date +%s)
  age_hours=$(( (now - mtime) / 3600 ))
  if [ "$age_hours" -gt "$MASTER_TRACKER_STALE_WARN_HOURS" ]; then
    echo "WARN: Master Tracker CSV is ${age_hours}h old (threshold ${MASTER_TRACKER_STALE_WARN_HOURS}h) -- re-export before a real handoff."
  else
    echo "PASS: Master Tracker CSV fresh (${age_hours}h old) at $MASTER_TRACKER_CSV_PATH"
  fi
fi

echo "=== end connector check ==="
