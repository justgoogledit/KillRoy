---
date: 2026-07-17
session_topic: Install and configure mattpocock/skills engineering skills
project: Kilroy
tags: [lesson, tooling, mattpocock-skills]
---

# Matt Pocock engineering skills: install and per-repo setup

## What we did

- Ran the real `npx skills@latest add mattpocock/skills --all -g` installer (global scope, not project-scoped) -- 41 skills now live in `~/.claude/skills/`, available in any Claude Code session on this account, separate from Kilroy's own `Skills/` tree.
- `/setup-matt-pocock-skills` itself has `disable-model-invocation: true` in its frontmatter, so it can't be run via the Skill tool or natural-language trigger -- it's slash-command-only, and this session's skill list was loaded before the install anyway. Read its `SKILL.md` directly and followed the documented process by hand instead of waiting for a fresh session.
- Explored this repo per the skill's own step 1, presented findings, and asked the 3 real decision points via a single question round: where to anchor the config (given the known git-root/`kilroy/` nesting quirk), which issue tracker, and whether to keep default triage labels.
- Wrote `kilroy/docs/agents/{issue-tracker,triage-labels,domain}.md` and a new `## Agent skills` section in `kilroy/CLAUDE.md`.

## Decisions

- **Global skill install, not project-scoped.** These are general-purpose engineering skills (code-review, tdd, diagnosing-bugs, research, etc.), unrelated to Kilroy's AMR-tracking scope. Installing globally keeps them out of Kilroy's git history entirely and makes them available in any future session/repo, not just this one.
- **Config anchored at `kilroy/CLAUDE.md`, not a new root-level `CLAUDE.md`.** Consistent with treating `kilroy/` as Kilroy's real root (the same reasoning behind the session-start hook's path handling). This means `kilroy/docs/agents/`, and any future `kilroy/CONTEXT.md` / `kilroy/docs/adr/`, all live under `kilroy/` too -- not the true git root. Called this out explicitly in `docs/agents/domain.md` so a future reader isn't confused about which "repo root" is meant.
- **GitHub as the issue tracker**, against the real `justgoogledit/KillRoy` repo -- the user's choice when offered "local markdown" as an alternative that would have kept these skills' issue activity out of the real repo. Means `/triage`, `/to-tickets`, `/qa`, etc. will file real GitHub issues on this repo if used.
- **Default triage labels, unchanged.**
- **Added a one-line scope disclaimer to the new `## Agent skills` block in `CLAUDE.md`**: these skills are separate from Kilroy's own AMR-tracking scope and don't count against the "Skill sprawl" anti-pattern, which is specifically about Kilroy's own `Skills/` folder. Wanted this explicit given how deliberately anti-sprawl the rest of `CLAUDE.md` is -- a reader shouldn't mistake `/tdd` or `/wayfinder` showing up as a violation of that rule.

## Open threads

- [ ] The pre-existing repo-layout mismatch (true git root vs. `kilroy/`) is still open, tracked in [[Knowledge/Lessons/2026-07-17-session-start-hook]]; this session's config choices work around it consistently rather than resolving it.
- [ ] `justgoogledit/KillRoy` is the personal-account repo used to build this scaffolding, not the final home. Once cloned into Jordan's enterprise account, `docs/agents/issue-tracker.md` and `CLAUDE.md`'s `## Agent skills` section both have the literal string `justgoogledit/KillRoy` that needs a one-pass update to the real owner/repo. Both files already flag this inline. `gh` itself doesn't need any change (it infers from `git remote -v`).
