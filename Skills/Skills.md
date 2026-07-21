# Skills -- Index

Skills are the playbook. Each skill lives in its own folder with a `SKILL.md` defining trigger, inputs, steps, verification, and output format.

## Foundational skills (improve the system itself)

- [[Skills/session-recap/SKILL|session-recap]] -- at end of session, extract takeaways into `Knowledge/Lessons/`.
- [[Skills/skill-creator/SKILL|skill-creator]] -- scaffold a new skill in the right format.
- [[Skills/check-connectors/SKILL|check-connectors]] -- verify `.env` and both data sources (Overmind, Planner via Nova's `planner` MCP) are reachable before any workflow skill runs.
- [[Skills/verify-fixtures/SKILL|verify-fixtures]] -- dry-run every documented fixture-skill pairing in `Knowledge/Sources/fixtures/` and report pass/fail per pairing, including confirming the deliberately-broken fixtures fail loud. Required step in `skill-creator`'s own process before an edit is considered done.

## Executional skills (do Kilroy's actual work)

- [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] -- package a fleet's Overmind state for line-side ops. (Overmind-only since the 2026-07-21 consolidation; the AMR Hub gate board and its `arriving-amr-progress` sibling were retired -- git history preserves them.)
- [[Skills/triage-personal-items/SKILL|triage-personal-items]] -- normal-tier triage of mail, Teams, and Planner into a "needs action today" / "FYI" split. Not AMR-scoped; the start of Kilroy's broader personal-assistant surface (2026-07-20).
- [[Skills/confluence-daily-status/SKILL|confluence-daily-status]] -- drafts and posts Jordan's daily status update to the team's weekly Confluence page, draft-then-approve, via Playwright (the Confluence MCP tool can't suppress the "Notify watchers" checkbox). First Kilroy skill that writes to a system other people see (2026-07-20).
- [[Skills/run-daily-workflow/SKILL|run-daily-workflow]] -- day runner: morning brief (today's Planner tasks, personal triage, Confluence status draft), midday delta, end-of-day close-out and carry-overs. Orchestrates the skills above. Runs proactively on a schedule.

## Adding a new skill

Run `skill-creator`. It enforces the format and prevents overlap with existing skills.

Rule: only create a new Jordan-facing workflow skill when Jordan hits the same manual task 3+ times. `check-connectors` and `verify-fixtures` are exempt as foundational infrastructure, same as `skill-creator`/`session-recap`. See `CLAUDE.md` anti-patterns.

**Exception on record (2026-07-20):** `triage-personal-items` and `confluence-daily-status` were both added by explicit request without the 3+ repeats having happened yet, as deliberate steps of broadening Kilroy from AMR-only to a general personal assistant. See `CLAUDE.md`'s "Who you are" and "Scope" sections.

## Anti-overlap rule

If a new skill overlaps with an existing one, **extend the existing skill** instead. Two skills with similar triggers cause contextual rot.
