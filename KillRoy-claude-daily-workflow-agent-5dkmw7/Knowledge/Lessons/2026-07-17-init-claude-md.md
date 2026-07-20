---
date: 2026-07-17
session_topic: /init completion -- added a "Working in this repo" section to CLAUDE.md
project: Kilroy
tags: [lesson, init, claude-md]
---

# /init: added dev-orientation info to the existing CLAUDE.md

## What we did

User ran `/init`, which asks for two things in a fresh `CLAUDE.md`: build/lint/test commands, and
high-level architecture. `CLAUDE.md` already existed here (Kilroy's persona/identity file, just
relocated to the true root by the flatten in [[Knowledge/Lessons/2026-07-17-repo-flatten]]) -- so
per `/init`'s own "if there's already a CLAUDE.md, suggest improvements" instruction, this was an
addition, not a rewrite.

Added one new section, "## Working in this repo", between "Three-folder framework" and "Plan mode
is the default": no build/lint/test tooling exists (this repo is prose and markdown, confirmed
earlier this session -- no `package.json`, no linter, nothing to compile), so the section states
that plainly instead of fabricating commands. In its place: the real verification mechanism
(per-skill `## Verify` sections), how to dry-run a skill offline (`Knowledge/Sources/fixtures/`),
what the session-start hook does, and the canonical `SKILL.md` shape with a pointer to
`skill-creator`.

## Decisions

- **Did not prepend `/init`'s literal boilerplate prefix** ("# CLAUDE.md\n\nThis file provides
  guidance to Claude Code..."). The existing file opens with "You are Kilroy: a portable,
  single-purpose Claude Code agent..." -- an identity-establishing line doing real work that
  predates this session. Stacking the generic prefix in front would read as boilerplate bolted
  onto a persona file, not an improvement. Treated the prefix instruction as aimed at the
  from-scratch case, which doesn't apply here.
- **Didn't repeat what's already covered.** Data sources, the three-folder framework, and the
  operating loop already exist elsewhere in the file -- the new section only adds what a future
  session would otherwise have to piece together by reading `skill-creator/SKILL.md`,
  `check-connectors/SKILL.md`, and the fixtures README separately.

## Open threads

None.
