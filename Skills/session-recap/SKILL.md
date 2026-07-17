---
name: session-recap
type: foundational
trigger: end of a working session, OR explicit "/recap"
inputs: the conversation/transcript of the current session
outputs: Knowledge/Lessons/YYYY-MM-DD-<slug>.md
---

# session-recap

The most important skill in the system. Every session feeds Knowledge so the next session is smarter.

## When to use

- User says "let's wrap" / "end session" / "recap" / "/recap".
- You're switching projects mid-session — recap the closing one before opening the new one.

## Steps

1. **Scan the session** for these signals:
   - Decisions made (and why)
   - Mistakes you made and the correction
   - User preferences revealed (voice, format, tooling)
   - New facts about the user's projects, people, or stack
   - Patterns that recurred across sessions
2. **Discard noise.** Greetings, throwaway questions, anything not reusable.
3. **Write the lesson file** at `Knowledge/Lessons/YYYY-MM-DD-<slug>.md` using the template below.
4. **Update affected Knowledge files.** If a lesson contradicts something in `Personal/` or `Consultants/`, edit those files (don't just append a contradiction).
5. **Surface the diff.** End your message with a bullet list of files written/changed so the user can review.
6. **Drift detection (optional final step).** If this session's lesson is the THIRD or later instance of a recurring pattern across past lessons — Grep `Knowledge/Lessons/` for the same `tags` or topic — propose (do NOT apply) an update to `CLAUDE.md`, a `Knowledge/Personal/*` file, or the relevant skill. Surface as a diff for approval. Threshold is deliberate: single mistakes go in lessons; recurring patterns are vault-level drift worth promoting.
7. **Append one line to vault-root `log.md`:** `## [YYYY-MM-DD] lesson | <slug>` (and a second line `## [YYYY-MM-DD] setup | <change>` if step 6 produced an approved drift edit).

## Output template

```markdown
---
date: YYYY-MM-DD
session_topic: <one line>
project: [[Projects/<project-name>/<project-name>]]
tags: [lesson]
---

# <Title>

## What we did
<2-4 bullets>

## Decisions
- **<decision>** — because <reason>. (supersedes [[<old-doc>]] if any)

## Mistakes & corrections
- **Mistake:** <what went wrong>
  **Fix:** <what to do next time>
  **Skill to update:** [[Skills/<skill>/SKILL]]

## New context for Personal/
<bullets, only if relevant>

## Open threads
- [ ] <unfinished thing> → [[Projects/<project>/<project>]]
```

## Examples

**Good lesson (reusable):**
> Mistake: Generated standup update in long prose. User prefers ≤3 bullets per section. Fix: Update `standup-update` SKILL.md to enforce bullet cap.

**Bad lesson (noise):**
> User said hi.

## Anti-patterns

- Don't dump the full transcript. Compress to reusable signal.
- Don't create a lesson if nothing reusable happened. Better to skip the file.
- Don't silently rewrite `Personal/` — show the diff.
- Don't trigger step 6 (drift detection) from a single mistake. Wait for the 3rd recurrence of the same pattern across separate lessons. Drift detection is for trends, not one-offs.
- Don't skip step 7 (log.md append). The vault-root log is how future sessions discover that this lesson happened without reading every file in `Knowledge/Lessons/`.
