---
date: 2026-07-17
session_topic: Install humanizer skill and wire it into Kilroy's report-generating skills
project: Kilroy
tags: [lesson, humanizer, voice, tooling]
---

# Humanizer: install and wire into report generation

## What we did

- Cloned [blader/humanizer](https://github.com/blader/humanizer) to inspect it before installing (same caution as the mattpocock/skills install) -- it's a single 622-line `SKILL.md`, prose-only, no code, based on Wikipedia's "Signs of AI writing" guide.
- Installed it globally via `npx skills@latest add blader/humanizer -g` -- lives at `~/.agents/skills/humanizer`, symlinked into `~/.claude/skills/humanizer` and 48+ other agent harnesses. Unlike the mattpocock/skills install, this one showed up as available in the *same* running session immediately (no fresh-session wait needed this time).
- Wired it into all three of Kilroy's report-generating skills (`fleet-commissioning-handoff`, `arriving-amr-progress`, `run-daily-workflow`) and into `Knowledge/Personal/voice.md`.
- Smoke-tested it live: ran the actual `humanizer` skill against a deliberately AI-sounding recommendation line, confirmed the rewrite preserved every fact (unit ID, day count, gate, team) while cutting the corporate framing and copula avoidance. Output converged almost exactly on the voice this session's own earlier dry-run artifacts already used -- a decent sign Kilroy's existing voice.md and humanizer's target register were already aligned before this wiring.

## Decisions

- **Scoped to prose only, never to data-bearing content.** `fleet-commissioning-handoff` runs it on the whole drafted package but re-verifies facts afterward (new Verify step 5). `arriving-amr-progress` and `run-daily-workflow` scope it explicitly to the signature line and recommendation only -- gate tables, blocker text, and action-item bullets stay byte-for-byte verbatim, with a new Verify step in each confirming that. This matters more here than in a typical writing context: a rewrite pass that "smooths" a blocker reason or drops a unit ID would be a real safety-adjacent failure per `CLAUDE.md`'s fail-loud rule, not just a style nit.
- **`Knowledge/Personal/voice.md` is the tiebreaker, not humanizer.** Added a "Humanizer pass on packaged outputs" section there stating this explicitly. Humanizer is the wider net (passive voice, promotional language, sycophantic tone, and more); voice.md is Jordan's specific calibration (no em dashes, "was here" signature, one recommendation with reason). They're aligned in spirit -- confirmed by the smoke test -- but voice.md wins if they ever diverge.
- **Different treatment from mattpocock/skills.** Those were kept explicitly separate from Kilroy's own scope (general engineering skills, not part of `CLAUDE.md`'s workflow list). Humanizer is the opposite case -- it's now a real step inside Kilroy's own report-generating skills, not an adjacent toolkit. Noted this distinction in `CLAUDE.md`'s `## Persona` section rather than under `## Agent skills` (which is explicitly scoped to "separate from Kilroy's own AMR-tracking scope").
- **User also asked that this apply to "communicating with me in general," not just Kilroy's generated reports.** Applying humanizer's principles (no em dashes, no filler, no sycophantic tone, no forced rule-of-three) to conversational replies in this session going forward, starting now -- these overlap heavily with rules already in this file's own "Phrases to avoid" section. Making that a standing instruction for *future* sessions in this repo would need a home to live in, and the only candidate right now is a root-level `CLAUDE.md`, which doesn't exist (same open structural question as [[Knowledge/Lessons/2026-07-17-session-start-hook]]). Not resolved here -- flagged as an open thread rather than silently creating one.

## Open threads

- [ ] If Jordan wants "always humanize chat replies" to persist across future sessions (not just this one), that needs a root-level `CLAUDE.md` or similar -- tied to the same repo-layout decision already open in [[Knowledge/Lessons/2026-07-17-session-start-hook]].
