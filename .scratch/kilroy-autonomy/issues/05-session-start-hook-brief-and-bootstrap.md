# 05 — SessionStart hook: brief surfacing + bootstrap detection

Blockers: 02. Blocks: 07.

Extend `.claude/hooks/session-start.sh` (post-consolidation probe version from ticket 01)
with two behaviors. Keep it fast — it runs on every session start; heavy work stays in
the skills, the hook only reads markers and prints context.

**Daily-brief surfacing (first interactive session of a workday):**
- Read today's `Projects/daily/runs/YYYY-MM-DD-*.json` markers.
- All ok → print pointer to brief + day checklist + "Confluence draft awaiting approval".
- Partial → same, plus explicit per-source failure list.
- Failed/absent (workday, after 08:45) → print "morning run failed / never ran — run
  /run-daily-workflow now?".
- Track "first session of day" with a lightweight touch-file so later sessions the same
  day don't repeat the full brief.

**Bootstrap detection:**
- If `.env` missing OR `.scratch/kilroy-autonomy/bootstrap-pending` marker exists →
  print instruction to run the bootstrap checklist (ticket 07's skill/doc) instead of
  the normal brief flow.

Windows note: hook must work under Git Bash on Windows (Claude Code hooks run through
bash there). Avoid macOS-only commands; `date`, `ls`, `cat`, `[ -f ]` only.

Acceptance:
- Shellcheck-clean; runs < 1s with no network calls in the marker-reading path.
- Manual test matrix on Mac with synthetic marker files: ok / partial / failed / absent /
  non-workday / bootstrap-pending.
