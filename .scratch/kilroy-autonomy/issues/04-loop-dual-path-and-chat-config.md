# 04 — Microsoft Loop dual-path + group-chat config

Blockers: 01. Blocks: 07.

**Loop access (new data source):**
- Extend `Skills/triage-personal-items/SKILL.md` (and the morning phase that calls it)
  with Loop assignments, dual-path:
  1. Nova `loop` MCP if present (expected on the work PC).
  2. Fallback: Loop-assigned tasks via the `planner` MCP (Loop task lists sync to
     Planner/To Do).
- Both paths marked **UNVERIFIED-until-Windows** in the skill text; bootstrap (ticket 07)
  resolves which is real and removes the marker.
- Neither path reachable → fail loud in the run marker + brief; never silently skip Loop.

**Group-chat config:**
- Teams group chats to summarize come from config, not hardcoded skill text:
  `Knowledge/Personal/monitored-chats.md` (list of chat names/ids + why monitored),
  created empty-with-template now, filled during bootstrap when Jordan is asked.
- Skill reads that file each morning run; file missing/empty → flagged in brief as
  "no group chats configured", not an error.

Acceptance:
- Skill template shape maintained; Verify section covers the fail-loud Loop case.
- `monitored-chats.md` template exists with instructions comment.
- Grep confirms no chat names or Loop workspace ids hardcoded anywhere.
