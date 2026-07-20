---
name: skill-creator
type: foundational
trigger: user says "create a skill for X" / "I do this every day, automate it"
inputs: a description of the repeatable task
outputs: Skills/<new-skill>/SKILL.md (and updates Skills/Skills.md index)
---

# skill-creator

Scaffolds new skills so they all follow the same shape and don't overlap.

## When to use

- User describes a task they want to automate.
- An existing skill is becoming a kitchen sink -- extract a sub-skill out of it.

## Pre-flight checks (do these BEFORE writing anything)

1. **Is this actually a skill?** Ask:
   - Do I do this 2-3+ times a week?
   - Does it follow a predictable pattern?
   - Does preloaded context (Knowledge) help?

   If any answer is no, recommend doing it inline instead.
2. **Does an overlapping skill exist?** Grep `Skills/*/SKILL.md` for similar triggers. If one exists, **extend it** instead of duplicating.
3. **Name it well.** `verb-noun` (e.g. `ingest-source`, not `sources` or `source-ingestion-tool`). Lowercase, hyphenated.

## Steps

1. Run the pre-flight checks. If skill is justified, continue.
2. Draft the SKILL.md using the canonical template (below).
3. Specify the trigger as **observable user phrases**, not abstract intent.
4. Name the inputs Claude needs and outputs it produces (with file paths).
5. Write the steps. Aim for 3-7 numbered steps for a typical executional skill (foundational process skills like this one may run longer). Concrete. No "consider" or "think about."
6. Provide an output template -- exact format, with placeholders.
7. Add 1 good and 1 bad example.
8. List anti-patterns.
9. Add the skill to `Skills/Skills.md` under the right section.
10. Run [[Skills/verify-fixtures/SKILL|verify-fixtures]], scoped to the skill just created or edited (pass its name as the target-skill input). If it has no fixture pairings documented in `Knowledge/Sources/fixtures/README.md` -- true for most foundational skills, including this one -- verify-fixtures reports that explicitly; that counts as a pass. A FAIL blocks: fix the skill (or the fixture, if the fixture is what's wrong) and re-run before continuing. Do not consider the edit done on a FAIL. Exception to the scoping: if the edit touched anything under `Knowledge/Sources/fixtures/` (a fixture file or the README), run verify-fixtures unscoped instead -- the orphaned-fixture coverage check only runs on unscoped invocations, and it's the only thing that catches a fixture added without a README entry.
11. **Adversarial review (required for non-trivial changes).** Before shipping, spawn one reviewer subagent against the change and fold its findings in.
    - **Trivial (review optional), exhaustively:** typo fixes, `Skills/Skills.md` index-line updates, `log.md` or `Knowledge/Lessons/` appends. **Anything not on that list is non-trivial** and gets the review -- that includes any new skill, any edit to any section of an existing `SKILL.md`, any edit to `CLAUDE.md` or the identity files (`Knowledge/Personal/*`), anything under `Knowledge/Sources/fixtures/`, and safety-adjacent sources like the gate ownership map. The default deliberately errs toward reviewing: one-line diffs have carried real bugs here.
    - **How, concretely:** spawn a subagent (a Plan-type or general-purpose agent) whose prompt (a) names the changed file(s) and tells it to read them in full, plus the canonical references they must stay consistent with -- this file's template, `CLAUDE.md`, `Knowledge/Personal/voice.md`, and any skill the change cross-references; (b) asks it to hunt for concrete problems only: contradictions with existing sections, stale counts or references elsewhere in the repo, missing template sections, scope drift from what was asked, edge cases the Steps or Verify sections don't cover; (c) forbids it from rubber-stamping -- "no problems found" must be earned by naming what it checked.
    - **Then:** fix every finding or write down why it's wrong -- never silently drop one. If a fix changed Steps or Verify content, re-run step 10.
    - This step exists because it keeps paying: a review pass caught 8 real gaps in the Planner-digest plan before it shipped ([[Knowledge/Lessons/2026-07-18-planner-digest-interview-and-build]]), and another caught a blocker in verify-fixtures' own carve-out logic ([[Knowledge/Lessons/2026-07-19-verify-fixtures-shipped]]). A separate post-build verification pass caught 3 more one-line stale-reference bugs the same day. None of those would have been caught by "the diff looks right."
    - For safety-adjacent changes (the gate ownership map, buyoff-status derivation steps), this review is **in addition to** the human read-through `CLAUDE.md`'s safety tier already requires from Jordan -- it does not replace it.
12. Print the diff for review before committing.

## Canonical SKILL.md template

```markdown
---
name: <verb-noun>
type: executional | foundational
trigger: <observable user phrase or event>
inputs: <what you need>
outputs: <where output lands>
---

# <skill-name>

## When to use
<2-4 concrete triggers>

## Applies
<the Knowledge/ files and other skills this one reads or depends on, as [[wikilinks]], with one line each on why>

## Steps
1. ...
2. ...

## Verify
<numbered checklist run after executing the skill -- concrete checks (sum audits, traceability, fail-loud confirmations), not "double-check the output">

## Output template
<exact format>

## Examples
**Good:** <example>
**Bad:** <example>

## Anti-patterns
- Don't <thing>
```

## Anti-patterns

- Creating a skill before doing the task once manually. You can't write good steps for a workflow you've never run.
- Vague triggers like "when relevant" -- useless. Specify the exact phrase.
- Stuffing multiple jobs into one skill. If the steps split cleanly into two outputs, that's two skills.
- Skipping the `verify-fixtures` check (step 10) because the diff "looks right." A skill edit isn't done until that check passes -- or explicitly reports the skill has no fixture pairings -- not just once the template sections are filled in.
- Skipping the adversarial review (step 11) because the change "is small." The stale-reference bugs caught by verification passes here were each one line. Small diff is not the same as trivial change; step 11's trivial list is the line, not gut feel.
- Treating a reviewer finding as noise and dropping it without a written reason. Fold it in or refute it in writing -- silence is how a caught bug ships anyway.
