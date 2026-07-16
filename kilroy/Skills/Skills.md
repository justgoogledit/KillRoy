# Skills -- Index

Skills are the playbook. Each skill lives in its own folder with a `SKILL.md` defining trigger, inputs, steps, verification, and output format.

## Foundational skills (improve the system itself)

- [[Skills/session-recap/SKILL|session-recap]] -- at end of session, extract takeaways into `Knowledge/Lessons/`.
- [[Skills/skill-creator/SKILL|skill-creator]] -- scaffold a new skill in the right format.

## Executional skills (do Kilroy's actual work)

- [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] -- package a fleet's commissioning state for line-side ops.
- [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] -- board of incoming AMRs across the 5-gate ladder, blockers grouped by owning team.

## Adding a new skill

Run `skill-creator`. It enforces the format and prevents overlap with existing skills.

Rule: only create skill #3 when Jordan hits the same manual task 3+ times. See `CLAUDE.md` anti-patterns.

## Anti-overlap rule

If a new skill overlaps with an existing one, **extend the existing skill** instead. Two skills with similar triggers cause contextual rot.
