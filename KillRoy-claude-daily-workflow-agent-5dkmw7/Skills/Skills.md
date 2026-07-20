# Skills -- Index

Skills are the playbook. Each skill lives in its own folder with a `SKILL.md` defining trigger, inputs, steps, verification, and output format.

## Foundational skills (improve the system itself)

- [[Skills/session-recap/SKILL|session-recap]] -- at end of session, extract takeaways into `Knowledge/Lessons/`.
- [[Skills/skill-creator/SKILL|skill-creator]] -- scaffold a new skill in the right format.
- [[Skills/check-connectors/SKILL|check-connectors]] -- verify `.env` and all four data sources are reachable before any workflow skill runs.
- [[Skills/verify-fixtures/SKILL|verify-fixtures]] -- dry-run every documented fixture-skill pairing in `Knowledge/Sources/fixtures/` and report pass/fail per pairing, including confirming the deliberately-broken fixtures fail loud. Required step in `skill-creator`'s own process before an edit is considered done.

## Executional skills (do Kilroy's actual work)

- [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] -- package a fleet's commissioning state for line-side ops.
- [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] -- board of incoming AMRs across the 5-gate ladder, blockers grouped by owning team.
- [[Skills/run-daily-workflow/SKILL|run-daily-workflow]] -- day runner: morning brief (AMR actions plus today's Planner tasks), midday delta, end-of-day close-out and carry-overs. Orchestrates the two skills above. Runs proactively on a schedule.

## Adding a new skill

Run `skill-creator`. It enforces the format and prevents overlap with existing skills.

Rule: only create a new Jordan-facing workflow skill when Jordan hits the same manual task 3+ times. `check-connectors` and `verify-fixtures` are exempt as foundational infrastructure, same as `skill-creator`/`session-recap`. See `CLAUDE.md` anti-patterns.

## Anti-overlap rule

If a new skill overlaps with an existing one, **extend the existing skill** instead. Two skills with similar triggers cause contextual rot.
