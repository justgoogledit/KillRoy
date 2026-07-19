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
- An existing skill is becoming a kitchen sink — extract a sub-skill out of it.

## Pre-flight checks (do these BEFORE writing anything)

1. **Is this actually a skill?** Ask:
   - Do I do this 2–3+ times a week?
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
5. Write 3–7 numbered steps. Concrete. No "consider" or "think about."
6. Provide an output template — exact format, with placeholders.
7. Add 1 good and 1 bad example.
8. List anti-patterns.
9. Add the skill to `Skills/Skills.md` under the right section.
10. Run [[Skills/verify-fixtures/SKILL|verify-fixtures]], scoped to the skill just created or edited (pass its name as the target-skill input). If it has no fixture pairings documented in `Knowledge/Sources/fixtures/README.md` -- true for most foundational skills, including this one -- verify-fixtures reports that explicitly; that counts as a pass. A FAIL blocks: fix the skill (or the fixture, if the fixture is what's wrong) and re-run before continuing. Do not consider the edit done on a FAIL.
11. Print the diff for review before committing.

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

## Steps
1. ...
2. ...

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
- Vague triggers like "when relevant" — useless. Specify the exact phrase.
- Stuffing multiple jobs into one skill. If the steps split cleanly into two outputs, that's two skills.
- Skipping the `verify-fixtures` check (step 10) because the diff "looks right." A skill edit isn't done until that check passes -- or explicitly reports the skill has no fixture pairings -- not just once the template sections are filled in.
