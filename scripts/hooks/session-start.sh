#!/usr/bin/env bash
# Kilroy SessionStart hook -- daily-brief surfacing + bootstrap detection.
#
# Tracked at scripts/hooks/session-start.sh because .claude/ is gitignored
# (machine-local). Each machine's .claude/settings.json must register this
# script under SessionStart -- the work-PC bootstrap checklist (autonomy
# ticket 07, docs/bootstrap-windows.md) performs that registration. See
# scripts/hooks/README.md for the registration snippet.
#
# Portability contract: runs under Git Bash on Windows AND macOS bash 3.2.
# No `date -d` (GNU-only), no `date -j` (BSD-only), no jq, no network calls.
# Weekday is computed via Zeller's congruence so the KILROY_HOOK_TODAY
# override stays consistent with the date it names. Target runtime < 1s.
#
# Test-only env overrides (never set these in a real hook registration):
#   KILROY_HOOK_TODAY=YYYY-MM-DD  -- pretend today is this date
#   KILROY_HOOK_NOW=HHMM          -- pretend the local time is HHMM
#
# Marker schema (written by run-daily-workflow, autonomy ticket 02), one file
# per phase at Projects/daily/runs/YYYY-MM-DD-<phase>.json:
#   {"status":"ok|partial|failed|skipped",
#    "sources":{"<name>":{"status":"ok|failed","detail":"..."}},
#    "startedAt":"ISO","finishedAt":"ISO"}
# Top-level "status" is the first "status" key in the file (schema order);
# parsing below relies on that documented order.

set -u

# --- repo root -------------------------------------------------------------
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  REPO_ROOT="$CLAUDE_PROJECT_DIR"
else
  REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fi

# --- bootstrap detection (checked first, skips the brief entirely) ---------
if [ ! -f "$REPO_ROOT/.env" ] || [ -f "$REPO_ROOT/.scratch/kilroy-autonomy/bootstrap-pending" ]; then
  echo "Kilroy: bootstrap pending -- .env is missing or the bootstrap-pending marker is set."
  echo "Open docs/bootstrap-windows.md and run the bootstrap checklist before anything else."
  exit 0
fi

# --- date / time (overridable for tests only) ------------------------------
TODAY="${KILROY_HOOK_TODAY:-$(date +%F)}"
NOW="${KILROY_HOOK_NOW:-$(date +%H%M)}"

case "$TODAY" in
  [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) ;;
  *) echo "Kilroy hook: bad date '$TODAY' (expected YYYY-MM-DD)."; exit 0 ;;
esac
case "$NOW" in
  [0-9][0-9][0-9][0-9]) ;;
  *) echo "Kilroy hook: bad time '$NOW' (expected HHMM)."; exit 0 ;;
esac

NOW_NUM=$((10#$NOW))
MORNING_DEADLINE=845 # retry run lands ~08:45; past that, missing morning = fail loud

# ISO weekday (1=Mon .. 7=Sun) via Zeller's congruence -- portable, and
# correct for KILROY_HOOK_TODAY overrides where `date +%u` would not be.
iso_weekday() {
  local y m d k j h
  y=$((10#${1%%-*}))
  m=$((10#$(printf '%s' "$1" | cut -d- -f2)))
  d=$((10#$(printf '%s' "$1" | cut -d- -f3)))
  if [ "$m" -le 2 ]; then
    m=$((m + 12))
    y=$((y - 1))
  fi
  k=$((y % 100))
  j=$((y / 100))
  h=$(((d + (13 * (m + 1)) / 5 + k + k / 4 + j / 4 + 5 * j) % 7))
  echo $(((h + 5) % 7 + 1))
}

DOW=$(iso_weekday "$TODAY")

RUNS_DIR="$REPO_ROOT/Projects/daily/runs"
DAY_FILE_REL="Projects/daily/$TODAY-daily.md"
DAY_FILE="$REPO_ROOT/$DAY_FILE_REL"
BRIEF_SHOWN="$RUNS_DIR/.brief-shown-$TODAY"

# --- marker parsing helpers (grep/sed/cut only -- no jq) -------------------

# Collapse newlines/tabs so grep -o works on pretty-printed JSON too.
flatten_marker() {
  tr '\n\r\t' '   ' <"$1"
}

# Top-level status: first "status" value in the file (see schema note above).
marker_status() {
  flatten_marker "$1" |
    grep -o '"status"[[:space:]]*:[[:space:]]*"[a-z]*"' |
    head -n 1 |
    sed 's/.*"\([a-z]*\)"[[:space:]]*$/\1/'
}

# Emit one "name: detail" line per source whose status is "failed".
marker_failed_sources() {
  flatten_marker "$1" |
    grep -o '"[A-Za-z0-9_.-]\{1,\}"[[:space:]]*:[[:space:]]*{[^{}]*}' |
    grep '"status"[[:space:]]*:[[:space:]]*"failed"' |
    while IFS= read -r entry; do
      name=$(printf '%s' "$entry" | sed 's/^"\([^"]*\)".*/\1/')
      detail=$(printf '%s' "$entry" | sed -n 's/.*"detail"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
      printf '%s: %s\n' "$name" "${detail:-no detail recorded}"
    done
}

marker_phase() {
  local base
  base=$(basename "$1" .json)
  printf '%s\n' "${base#"$TODAY"-}"
}

# --- housekeeping: drop stale .brief-shown-* files from previous days ------
if [ -d "$RUNS_DIR" ]; then
  for f in "$RUNS_DIR"/.brief-shown-*; do
    [ -e "$f" ] || continue
    [ "$f" = "$BRIEF_SHOWN" ] && continue
    rm -f "$f"
  done
fi

# --- scan today's markers --------------------------------------------------
MARKER_COUNT=0
DEGRADED=0
MORNING_PRESENT=0
for f in "$RUNS_DIR/$TODAY"-*.json; do
  [ -e "$f" ] || continue
  MARKER_COUNT=$((MARKER_COUNT + 1))
  status=$(marker_status "$f")
  case "$status" in
    partial | failed) DEGRADED=1 ;;
  esac
  if [ "$(marker_phase "$f")" = "morning" ]; then
    MORNING_PRESENT=1
  fi
done

# --- non-workday (Fri/Sat/Sun): note only if markers exist, else silent ----
if [ "$DOW" -ge 5 ]; then
  if [ "$MARKER_COUNT" -gt 0 ]; then
    echo "Kilroy: non-workday, no scheduled runs (but run markers exist for $TODAY)."
  fi
  exit 0
fi

# --- workday, no markers at all --------------------------------------------
if [ "$MARKER_COUNT" -eq 0 ]; then
  if [ "$NOW_NUM" -gt "$MORNING_DEADLINE" ]; then
    echo "Kilroy: morning run failed or never ran -- run /run-daily-workflow now?"
  fi
  exit 0
fi

# --- first-session-of-day guard: repeat sessions get one line --------------
if [ -f "$BRIEF_SHOWN" ]; then
  overall="ok"
  [ "$DEGRADED" -eq 1 ] && overall="degraded"
  echo "Kilroy: brief already shown today (runs: $overall) -- see $DAY_FILE_REL."
  exit 0
fi

# --- full brief ------------------------------------------------------------
echo "Kilroy daily brief -- $TODAY"

if [ "$MORNING_PRESENT" -eq 0 ] && [ "$NOW_NUM" -gt "$MORNING_DEADLINE" ]; then
  echo "Morning run failed or never ran -- run /run-daily-workflow now?"
fi

if [ "$DEGRADED" -eq 0 ]; then
  echo "All run markers ok."
else
  echo "Run markers report failures:"
  for f in "$RUNS_DIR/$TODAY"-*.json; do
    [ -e "$f" ] || continue
    status=$(marker_status "$f")
    case "$status" in
      partial | failed)
        phase=$(marker_phase "$f")
        marker_failed_sources "$f" | while IFS= read -r line; do
          echo "  - $phase / $line"
        done
        ;;
    esac
  done
fi

echo "Day file + checklist: $DAY_FILE_REL"

if [ -f "$DAY_FILE" ] && grep -q 'DRAFT -- awaiting approval' "$DAY_FILE"; then
  echo "Confluence draft awaiting approval -- review it in the day file before posting."
fi

touch "$BRIEF_SHOWN"
exit 0
