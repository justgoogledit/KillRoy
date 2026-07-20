---
date: 2026-07-17
session_topic: Build and test a SessionStart hook that runs a fast connector check
project: Kilroy
tags: [lesson, automation, hooks, check-connectors]
---

# Session-start connector-check hook

## What we did

- Built `.claude/hooks/session-start.sh` (repo root, not inside `kilroy/`) using Claude Code's `session-start-hook` skill as a starting point, adapted from its dependency-install use case to a connector-reachability probe.
- Registered it in `.claude/settings.json` under `SessionStart`.
- Tested 5 real scenarios by running the script directly (per the skill's own validation method -- a SessionStart event can't be triggered mid-conversation from inside the same session): missing `.env`, filled-but-unreachable `.env`, all-three-reachable happy path (via two throwaway local HTTP servers), stale-CSV WARN, and one missing required var. All 5 produced the expected output. Cleaned up every test artifact (killed the throwaway servers by PID, removed the test `.env` and scratch files) and confirmed the repo is back to its real state (`kilroy/.env` absent, port 5000 unreachable again).

## Decisions

- **The hook is a fast pre-check, not a replacement for the `check-connectors` skill.** It uses short fixed timeouts (3s per source, not the configured `$OVERMIND_TIMEOUT_SEC`) since it runs on every session start and shouldn't add noticeable latency. It doesn't verify the AMR Hub response is parseable JSON (just checks for a 2xx), doesn't write to `log.md`, and isn't callable on demand as "kilroy check." `run-daily-workflow` still calls the full skill before pulling real data. Documented this relationship on both sides (the hook's own header comment, and a new note in `check-connectors/SKILL.md`).
- **Parse `.env` line-by-line instead of `source`/`set -a`.** `.env.example`'s `MASTER_TRACKER_CSV_PATH` default value has an unquoted space (`OneDrive - Tesla`) -- a naive `source` would break mid-parse, treating `- Tesla/AMR TRACKER/master-tracker.csv` as a separate shell command. Confirmed by testing: the line-by-line `IFS='=' read` parser captures the full space-containing value correctly (verified byte-for-byte in a throwaway test), where `source` would not have.
- **`.claude/` lives at the true git repo root** (`/home/user/KillRoy`), not inside `kilroy/`. This surfaced a real structural mismatch worth flagging (see Open threads) -- the design doc describes `~/repos/kilroy/` as a flat repo with `CLAUDE.md` directly at its root, but this actual repo has a top-level `README.md` + `kilroy/` subfolder one level down. The hook script accounts for this by reading `$CLAUDE_PROJECT_DIR/kilroy/.env`, so it works correctly against the current layout, but if the layout is ever flattened to match the design doc, the hook's path would need updating too.
- **Added `.claude/settings.local.json` to `.gitignore`.** It's harness-generated per-developer permission state, not something to share; `.claude/settings.json` (the hook registration) is the one meant to be committed.

## Mistakes & corrections

- **Mistake (caught during testing, not shipped):** first test of the AMR Hub reachability probe used a plain directory (`api/amrs/`) served by `python3 -m http.server`, which returns a 301 redirect (missing trailing slash) rather than a 200 -- the probe correctly reported FAIL on that redirect, which looked like a hook bug at first glance. It wasn't a hook bug; the *real* AMR Hub API wouldn't redirect like that. Fixed the test fixture (served a file, not a directory, at that exact path) rather than loosening the hook's `2xx`-only check to also accept redirects, since "any 2xx" is the actual intended contract from `check-connectors/SKILL.md` and loosening it would mask a real problem in production.

## Open threads

- [ ] Repo-layout mismatch with the design doc: this repo's git root has a stray top-level `README.md` + `kilroy/` subfolder, but `docs/superpowers/specs/2026-07-02-kilroy-design.md` describes `~/repos/kilroy/` as the flat repo root with `CLAUDE.md` directly inside it. Not fixed here (would mean moving every file up one directory, a bigger and more disruptive change than what was asked for) -- flagging for a deliberate decision before this gets cloned to the work computer, since `cd ~/repos/kilroy && claude` per the design doc's install instructions would NOT find `CLAUDE.md` at that path under the current layout.
- [ ] If the hook proves useful, consider whether `run-daily-workflow`'s own `check-connectors` call could shortcut using the hook's most recent result (same session) instead of re-probing -- not done here to avoid over-engineering a two-tier caching scheme before the hook has actually been used in anger.
