---
date: 2026-07-18
session_topic: /to-tickets -- split the cleanup spec into 8 published tickets
project: Kilroy
tags: [lesson, ask-matt, to-tickets, mcp]
---

# Cleanup spec split into 8 tickets

## What we did

- Read `/to-tickets`' `SKILL.md` directly (slash-command-only, same pattern as `/to-spec` and
  `setup-matt-pocock-skills`) and followed its process by hand against issue #2 (the published
  cleanup spec).
- Drafted 8 tracer-bullet tickets: 4 independent process/doc items (fixture-check automation, the
  proactive-trigger fix, structured logging, standardizing adversarial review), and 4 for the MCP
  connector server -- one scaffold-plus-first-tool ticket that proves the pattern, then one ticket
  per remaining data source (Overmind, Master Tracker CSV, Planner), each blocked by the scaffold
  ticket since they all need the server to exist first.
- Presented the breakdown per the skill's own required step 4 ("quiz the user") before publishing
  anything -- granularity, blocking edges, and specifically how to handle the trigger-fix ticket,
  which isn't purely agent-executable (it needs a human to grant an environment permission).
  Jordan approved the granularity/edges and chose `ready-for-human` over `ready-for-agent` for
  that one ticket.
- Published all 8 as real GitHub issues (#3-#10) via `gh api` REST (the working path in this
  sandbox), in dependency order. Used GitHub's **native issue-dependencies API**
  (`POST .../issues/<n>/dependencies/blocked_by`) to link #8, #9, #10 as blocked by #7 -- not just
  a text reference, an actual structured dependency GitHub itself tracks and reports via
  `issue_dependencies_summary`.
- Verified the links landed correctly by re-reading each issue's `issue_dependencies_summary`
  after creation: #7 shows `blocking: 3`, #8/#9/#10 each show `blocked_by: 1`. Didn't just trust
  the creation calls succeeded -- confirmed the graph is actually correct.

## Decisions

- **Ticket #4 (proactive-trigger fix) got `ready-for-human`, not `ready-for-agent`.** It depends
  on an environment permission only Jordan can grant -- an agent picking it up would just hit the
  same wall that stalled it originally. Labeling it honestly rather than letting it sit
  "agent-ready" and silently fail again.
- **Used GitHub's native blocking-dependency API, not just prose "Blocked by" text**, since
  `/to-tickets`' own instructions prefer the platform's native relationship where one exists. This
  was already documented as available in `docs/agents/issue-tracker.md`'s Wayfinding section from
  earlier in the session -- reused that exact pattern rather than re-deriving it.
- **Did not close or modify issue #2** (the parent spec), per the skill's explicit instruction.
  Each ticket references it via a `## Parent` section instead.

## Open threads

- [ ] None of the 8 tickets have been worked yet. Next step per `/ask-matt`'s routing is
  `/implement`, one ticket at a time, clearing context between each -- starting with whichever
  ticket Jordan wants worked first (the frontier right now is #3, #4, #5, #6, and #7, since none
  of those have unmet blockers; #8/#9/#10 wait on #7).
