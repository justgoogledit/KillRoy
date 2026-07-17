# KillRoy
amr agent

The real content lives in `kilroy/` -- see `kilroy/README.md` and `kilroy/CLAUDE.md`. This
top-level folder is the actual git repo root (not `kilroy/`, despite the design doc describing
`~/repos/kilroy/` as a flat layout with `CLAUDE.md` at the root -- see the open thread in
`kilroy/Knowledge/Lessons/2026-07-17-session-start-hook.md` for that discrepancy).

`.claude/hooks/session-start.sh` runs a fast Kilroy connector check (Overmind/AMR Hub/CSV
reachability) on every Claude Code session start in this repo. See
`kilroy/Skills/check-connectors/SKILL.md` for how it relates to the full `check-connectors` skill.
