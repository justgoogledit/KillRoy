---
date: 2026-07-19
session_topic: Ticket #6 -- adversarial review is now a required skill-creator step
project: Kilroy
tags: [lesson, skill-creator, review, ticket-6]
---

# Adversarial review standardized (ticket #6)

## What we did

- Added step 11 to [[Skills/skill-creator/SKILL]]: a required adversarial-review pass for
  non-trivial changes, with an exhaustive trivial list (typo fixes, Skills.md index lines,
  log/Lessons appends) and a default that everything else is non-trivial. The step says
  concretely how to spawn the reviewer (what the prompt must name, what to hunt for, no
  rubber-stamping) and requires findings to be folded in or refuted in writing.
- Dog-fooded the step on the very change that introduces it. The reviewer found 6 real problems:
  the companion template fix queued by [[Knowledge/Lessons/2026-07-19-verify-fixtures-shipped]]
  had been missed (canonical template lacked `Applies`/`Verify`), the non-trivial/trivial lists
  didn't partition, the safety bullet referenced a change class the definition didn't cover,
  the justification metrics were uncited and partly misattributed (verification-pass catches
  credited to review passes), identity files were missing from the definition despite the
  ticket's "identity-file change" intent, and the "3-7 steps" guidance now contradicted this
  file's own 12 steps. All six folded in.
- Also cleaned this file's pre-existing em/en dashes (inherited from the starter-pack version,
  predating the repo's no-em-dash rule enforcement).
- Re-ran step 10 after the fixes per the new step's own rule: verify-fixtures scoped to
  skill-creator, no fixture pairings in the canonical table, explicit pass.

## Decisions

- **Trivial is the exhaustive list; non-trivial is the default.** The first draft enumerated
  non-trivial and left gaps (Anti-patterns edits, fixture files, identity files fell in neither
  list). Enumerating the small side and defaulting the rest is the version that can't drift.
- **Credit catches accurately.** Review passes and post-build verification passes are different
  mechanisms; the step now cites each catch to its actual mechanism with wikilinks to the lesson
  files, so the numbers stay auditable instead of becoming stale folklore.
- **The template fix rode along as the queued companion, not scope creep.** The prior session's
  lesson explicitly said to fix the canonical template "alongside ticket #6, which already edits
  that file" -- the reviewer catching its omission is the system working.

## Open threads

- [ ] None new for this ticket. Frontier after this: #4 (ready-for-human, Jordan's), #5
  (structured log line), #7 (MCP scaffold + AMR Hub tool); #8/#9/#10 still blocked on #7.
