---
date: 2026-07-17
session_topic: Flatten the kilroy/ nesting -- repo root and Kilroy's root now match
project: Kilroy
tags: [lesson, repo-structure]
---

# Flattened the repo -- kilroy/ is the root now

## What we did

- User ran `/init`, which forced the long-open repo-layout question (tracked across
  [[Knowledge/Lessons/2026-07-17-session-start-hook]], [[Knowledge/Lessons/2026-07-17-matt-pocock-skills-setup]])
  to an actual decision: Claude Code's own convention expects `CLAUDE.md` at the true git root, and
  this repo's true root had only a stub `README.md` I'd written specifically to explain the
  mismatch -- circular, self-inflicted complexity.
- User asked what was actually in the parent folder. Answer: `.git/`, `.claude/` (real, needed),
  `.gitignore` (real), the stub `README.md`, and the untracked `skills/` reference clone. Nothing
  else. Confirmed the nesting was accidental (almost certainly the original "Add files via upload"
  commit dragging a `kilroy/` folder into GitHub's web UI instead of uploading its contents
  directly) and safe to flatten.
- Moved every file up one level with `git mv` (history preserved -- confirmed via `git status`
  showing clean `R` renames, not delete+add). Merged the two `.gitignore` files (root's `skills/`
  + local-settings entries, `kilroy/`'s secrets/OS-junk entries) into one. Resolved the two
  collisions (`README.md`, `.gitignore` existed at both levels) by keeping the real content and
  discarding the stub.
- Fixed every stale `kilroy/` path reference in living docs: `.claude/hooks/session-start.sh`
  (this one was functional, not just cosmetic -- its `$CLAUDE_PROJECT_DIR/kilroy/.env` path was
  now wrong), `CLAUDE.md`, `docs/agents/domain.md` (rewrote the now-false "repo root means
  kilroy/, not the true git root" note entirely). Left `kilroy/` references alone in `log.md` and
  two `Lessons/` entries -- those are historical record of what was true *at the time*, not living
  documentation.
- Re-ran the hook directly after the fix to confirm it still reports correctly against the new
  path (`FAIL: .env not found at /home/user/KillRoy/.env` -- no more `/kilroy/` in the path).

## Decisions

- **`docs/superpowers/specs/2026-07-02-kilroy-design.md` needed no changes.** Its `~/repos/kilroy/`
  references describe the intended *clone directory name*, not an internal nesting level --
  after the flatten, cloning this repo to `~/repos/kilroy/` now genuinely puts `CLAUDE.md` at that
  path's root, matching the design doc's original vision. The design doc was right all along; the
  actual repo just hadn't matched it.
- **Historical log/lesson entries are not rewritten.** `log.md` and the two `Lessons/` files that
  mention the old nesting describe what was true when they were written. Rewriting them to erase
  the mismatch would falsify the record of a real decision that got made. This entry is the closing
  note, not a retroactive edit.

## Open threads

- [ ] None. This closes the repo-layout open thread from both
  [[Knowledge/Lessons/2026-07-17-session-start-hook]] and
  [[Knowledge/Lessons/2026-07-17-matt-pocock-skills-setup]].
