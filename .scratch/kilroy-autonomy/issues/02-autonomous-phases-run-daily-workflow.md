# 02 — Autonomous phases in run-daily-workflow

Blockers: 01. Blocks: 03, 05, 06, 07, 08.

Rework `Skills/run-daily-workflow/SKILL.md` (post-consolidation shape) into the
four-phase autonomous day loop per spec:

- Phases: `morning` (07:00), `delta` (11:00, 13:00), `closeout` (16:00, Thursday adds
  reflection — reflection itself is ticket 08). Invoked headless as
  `claude -p "/run-daily-workflow --autonomous --phase=<phase>"`.
- `--autonomous` mode: no interactive questions, NEVER invokes Confluence posting or
  playwright tools — drafts only. Interactive mode keeps the existing approval flow.
- Morning phase gathers: mail mentions, Teams DM tags, configured group chats
  (`Knowledge/Personal/` config from bootstrap), Loop + Planner assignments (Loop path
  per ticket 04); drafts Confluence status; generates day checklist (ticket 03).
- Every phase writes a status marker `Projects/daily/runs/YYYY-MM-DD-<phase>.json`
  with the schema from spec (`status`, per-source `sources` map, `startedAt`,
  `finishedAt`, ISO 8601) plus a journal entry (ticket 08 defines journal fields).
- Fail loud, per-source partials: dead source recorded in marker + surfaced, never
  silently dropped; run continues with remaining sources.
- Mon–Thu only: skill checks weekday, exits cleanly with a `skipped` marker otherwise.

Acceptance:
- Skill follows the repo template (frontmatter, When to use, Applies, Steps, Verify,
  Output template, Examples, Anti-patterns).
- Verify section includes: marker file exists per phase, per-source statuses sum to
  overall status, no playwright/confluence tool named anywhere in the autonomous path.
- Dry-runnable against fixtures/synthetic data via verify-fixtures where a pairing
  exists; Nova-MCP-dependent steps marked UNVERIFIED-until-Windows.
