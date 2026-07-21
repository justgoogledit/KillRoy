---
date: 2026-07-20
session_topic: Design and scaffold confluence-daily-status, Kilroy's second personal-assistant exception skill
project: [[Projects/daily/daily]]
tags: [lesson, personal-assistant, confluence, playwright, mcp-setup]
---

# Confluence daily-status: design, scaffold, and machine-move checklist

## Resume here (fresh context window)

State as of end of session: design approved, skill scaffolded, docs updated, all committed. Nothing
left to design -- everything remaining is machine setup and verification, tracked as the checklist
under "Open threads" below.

- Commits: `8a7b1e3` (pre-existing fleet-id/issue-tracker updates, unrelated to this feature) and
  `fea090a` (the confluence-daily-status feature itself -- skill, reference doc, `.mcp.json`,
  `.env.example`, and updates to `run-daily-workflow`/`CLAUDE.md`/`README.md`/`Skills.md`).
- Read this whole file before doing anything else in a new session -- it's the complete decision
  trail, not just a summary.
- Start with the first unchecked item under "Open threads" -- they're in dependency order (Node
  install before `npm install`, `.env` before `kilroy check`, etc.).
- If `.mcp.json` looks different from what this lesson describes, trust the file -- it's been
  hand-corrected at least once since (see the `--browser` vs `--channel` note below), and the
  reference docs may lag it if that keeps happening.

## What we did

- Ran `check-connectors` cold -- found `.env` missing entirely, correctly stopped everything else per its fail-loud rule.
- Grilled (via `mattpocock-skills:grilling`) a scope-change request ("Kilroy is my main personal assistant now, work computer has live Nova MCPs") down to one shippable slice: Jordan's daily Confluence status-page update, draft-then-approve, folded into `run-daily-workflow`'s morning phase.
- Fetched the live `TXPC` Confluence page during grilling to confirm structure as fact rather than asking Jordan to describe it (per-person `<h1>`, per-day `<p><time>`, content-only `<ul>`).
- Found and confirmed (via a real tool-schema check plus Jordan's own screenshot of the native editor) that `ConfluenceUpdatePage` has no way to control the "Notify watchers" checkbox -- it only exists in Confluence's browser UI.
- Wrote the plan, got approval, then implemented: `.mcp.json` (new -- didn't exist before, even though `CLAUDE.md`/README already referenced it), `.env.example` additions, `Knowledge/Sources/2026-07-20-confluence-status-page.md`, `Skills/confluence-daily-status/SKILL.md`, and updates to `run-daily-workflow`, `CLAUDE.md`, `README.md`, `Skills/Skills.md`.
- Ran a `superpowers:writing-skills` review pass on the new skill and caught two real gaps before they shipped: (1) the original "use Jordan's real browser profile" design breaks almost every run because Chromium refuses a second `--user-data-dir` launch against an already-open profile -- fixed by switching to a dedicated, once-signed-in secondary profile; (2) an empty/edited-to-nothing approved draft would have posted an empty `<ul>` -- fixed to treat that as a skip.

## Decisions

- **Draft-then-approve, always.** Jordan's stated reasoning: this is a page his whole team can see, under his name -- no default-approve on silence, no timeout auto-post. Non-negotiable per the skill's own text.
- **Playwright over the API tool, headed not headless.** The API tool structurally cannot control the notify checkbox; Playwright driving a real (but dedicated) browser profile is the only way found. Headed by design -- visibility into a team-facing write is treated as a safeguard, not a debugging nicety, and flipping it later requires re-reading the skill's rationale first (enforced by a comment trail, not code).
- **Second personal-assistant anti-sprawl exception, on record.** `confluence-daily-status` joins `triage-personal-items` as workflow #5, explicit exception per `CLAUDE.md`'s Scope section -- documented as not setting a precedent for future asks.
- **Dedicated Playwright browser profile, not Jordan's daily driver.** Supersedes the original plan text (which said "Jordan's real, already-signed-in profile") -- caught during the writing-skills review, not before. `.env.example`, the skill, the reference doc, and `CLAUDE.md` were all updated together so nothing was left saying the old (broken) thing.

## Mistakes & corrections

- **Mistake:** Initial plan assumed Playwright could drive Jordan's actual daily-driver browser profile for SSO continuity, without checking whether that profile would already be open (it will be, essentially always).
  **Fix:** Switched to a dedicated secondary profile, signed into Confluence once, kept closed otherwise. Caught by deliberately running a skill-quality review pass instead of treating "plan approved" as "done."
  **Skill to update:** [[Skills/confluence-daily-status/SKILL]] -- already applied this session.
- **Mistake:** Wrote `.mcp.json`'s `playwright` server entry (package name `@playwright/mcp@latest`, flags `--user-data-dir`/`--channel`) without verifying against real docs -- a WebSearch attempt to confirm failed (VPC-restricted network), and I did not have another way to verify from this environment.
  **Fix:** Flagged explicitly as unverified rather than presented as working config. Open thread below -- verify on a network where WebSearch/WebFetch actually resolves, or by installing the package and reading its own `--help`.

## New context for Personal/

- Jordan's day-to-day (confirmed via grilling, useful for future personal-assistant scoping): morning Teams/Outlook mention check → Loop assignment check → AMR chat triage → Confluence daily status update → all-day AMR KPI/health watch → Thursday-evening management report. Only the Confluence piece is built; the other three are named, explicitly out-of-scope-for-now future specs (see README's Scope section).
- The scaffolding move from personal machine to work machine is itself a "contract change" Jordan named explicitly -- Nova's live Teams/Outlook/Confluence MCPs are only available there, which is why this expansion started now rather than earlier.

## Open threads

- [x] Finish verifying `@playwright/mcp`'s CLI flags. Confirmed against the real `@playwright/mcp` README: package name `@playwright/mcp` is correct (upstream `microsoft/playwright-mcp`); `--user-data-dir <path>` is correct and real; the server is headed by default (headless only with an explicit `--headless` flag), matching the "never headless" requirement -- no extra flag needed. `--channel` is NOT a valid flag -- channel is set via `--browser <chrome|firefox|webkit|msedge>` (or `--executable-path`) instead. `.mcp.json` corrected to `--browser` (the earlier `--channel` guess would have been rejected/ignored at startup). `PLAYWRIGHT_BROWSER_CHANNEL=msedge` in `.env.example` is already a valid `--browser` value -- no `.env.example` change needed.
- [x] Install Node.js 18+ on the work machine. Found already installed via winget (`OpenJS.NodeJS.LTS`, v24.18.0, `C:\Program Files\nodejs`) and already in the machine PATH -- just not picked up by this session's already-open shell. No fresh install needed; a new shell/session sees it fine.
- [x] `cd mcp-server && npm install` (kilroy-connectors dependency, one-time). Done -- 93 packages, 0 vulnerabilities.
- [ ] `cp .env.example .env` and fill in every real value -- `.env` does not exist yet at all (confirmed by this session's `check-connectors` run: the very first check failed at the missing-file step). This includes the two new `PLAYWRIGHT_*` vars alongside the four original AMR/Planner ones.
- [ ] Create a dedicated Edge/Chrome profile, sign into `confluence.teslamotors.com` once via Tesla SSO, then leave it closed so Playwright can claim it. Must NOT be Jordan's daily-driver profile -- see `.env.example`'s `PLAYWRIGHT_USER_DATA_DIR` comment for why.
- [ ] Restart Claude Code from the repo root so the newly-created `.mcp.json` actually registers `kilroy-connectors` and `playwright` -- neither was live during this session since the file didn't exist until partway through.
- [ ] Re-run `kilroy check` once `.env` is filled, to confirm all four AMR/Planner sources pass for real (this session only ever saw the all-missing state).
- [ ] Dry-run `confluence-daily-status`'s date-resolution logic (steps 1-2) against the already-captured `Week 07/20/2026` page content, including a deliberately-wrong-date case, to prove the fail-loud guard actually stops rather than guessing.
- [ ] Live end-to-end test: post to a real day's row (low-stakes day, or revert immediately after) once Playwright/Node/profile exist. Confirm bullets land correctly, nothing else on the page moved, and specifically confirm with Jordan (or a teammate) whether any notification fired despite the unchecked box -- this has never actually been observed, only inferred from the tool gap.
