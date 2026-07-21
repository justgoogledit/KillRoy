---
name: confluence-daily-status
type: executional
trigger: run-daily-workflow's morning-brief step (see run-daily-workflow Applies); no standalone on-demand trigger in v1 -- this only runs as part of the morning phase
inputs: none required beyond MCP access to `confluence`, `planner` (via `kilroy-connectors`' `planner_get_tasks`), and the `playwright` MCP server
outputs:
  - one Confluence page edit (Jordan's row on the current week's TXPC status page), only after Jordan approves the draft
  - a `## Daily Status Post` line folded into run-daily-workflow's day file, reporting success or the specific reason it didn't post
---

# confluence-daily-status

Draft and post Jordan's daily "what I'm working on" update to the team's weekly Confluence status page, under his name, without notifying the whole team's watchers. The first Kilroy skill that writes to a system other people see -- draft-then-approve and a visible (headed) browser run are both load-bearing safeguards here, not incidental choices.

## When to use

- run-daily-workflow's morning phase, as a new step after the Planner digest pull and before the day-file draft (see that skill's Applies).
- Not triggered standalone in v1 -- no "kilroy update confluence" on-demand path yet. Add one only if Jordan asks for it 3+ times outside the morning cadence, same anti-sprawl bar as any other skill addition.
- Not for reading the status page or anyone else's row -- this only ever touches Jordan's own block.

## Applies

- [[Knowledge/Sources/2026-07-20-confluence-status-page|Confluence status page reference]] -- space key, parent page id, weekly-page title pattern, and the confirmed HTML structure this skill parses and edits. Read it before touching this skill's insertion logic.
- `confluence` MCP -- `ConfluenceGetPageChildren` to resolve the current week's page (never a hardcoded URL/id), `FetchConfluencePage` to read `storage_content`, `ConfluenceUpdatePage` is deliberately **not** used for the actual submit (see below) but may still be useful for a post-submit re-fetch/confirm.
- `playwright` MCP (new, registered in `.mcp.json`) -- drives a dedicated, already-signed-in Edge profile (`PLAYWRIGHT_USER_DATA_DIR`, `PLAYWRIGHT_BROWSER_CHANNEL` from `.env`) to perform the actual edit-and-submit, because `ConfluenceUpdatePage` has no way to control the "Notify watchers" checkbox -- confirmed absent from that tool's parameters, confirmed present as a native-UI-only control via a live screenshot (2026-07-20). Runs headed (visible), not headless, by design -- see `.env.example`'s `PLAYWRIGHT_HEADLESS` note. **Must be a separate profile from Jordan's daily-driver browser** -- see `.env.example`'s `PLAYWRIGHT_USER_DATA_DIR` note; a shared profile fails almost every run because Chromium refuses a second launch against a profile that's already open elsewhere.
- `kilroy-connectors`' `planner_get_tasks` tool (already used by run-daily-workflow's Planner digest) -- reused here for draft content, not re-fetched separately when this step runs after that pull in the same session.
- run-daily-workflow's AMR gate board and prior day file's Carry-over section -- reused for draft content, same reuse-not-refetch principle.
- Not safety-adjacent. This is normal tier, same reasoning as `triage-personal-items` and the Planner digest -- but "normal tier" does not mean low-care: this is the first skill where a mistake is visible to people outside Jordan, so the fail-loud and draft-approval discipline below is non-negotiable regardless of tier.

## Steps

1. **Resolve today's page, live, never guessed.** Compute the Monday of the current week from today's actual date. Call `ConfluenceGetPageChildren` on the parent page id from the reference doc, and match a child by title against the computed `Week MM/DD/YYYY` string. If no title matches, **fail loud and stop** -- report "no weekly page found for the week of \<date\>," do not create one, do not fall back to an adjacent week.
2. **Fetch and confirm the date row.** Call `FetchConfluencePage` on the resolved page, locate the `Jordan Casias` `<h1>` block, and find the `<p><strong>{Weekday} <time datetime="..."/></strong></p>` whose `datetime` attribute equals today's date exactly (`YYYY-MM-DD` string match, not weekday-name inference). If that block or that date paragraph is missing, fail loud and stop -- this is the specific correctness rule Jordan set: never edit the wrong day.
3. **Check for an existing entry.** If a `<ul>` already immediately follows today's date paragraph, today's update was already posted. Report that back (with the existing bullet text) and ask before overwriting -- never silently double-post or silently overwrite.
4. **Draft the bullets.** Compose from:
   - Today's Planner tasks assigned to Jordan, due today, via `planner_get_tasks` (reused from run-daily-workflow's own pull when running as its step; a fresh pull if invoked in isolation).
   - A short AMR/fleet-context line drawn from the AMR gate board already produced by [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] in the same morning run -- one line naming the fleet(s) and any blocker Jordan owns directly, not a full board dump.
   - Carry-overs from the previous day file's Carry-over section, if any.
   Format as plain bullet text matching the page's existing style (see Logan Stark's entry in the reference doc) -- short, task-shaped lines, no markdown formatting beyond plain text (the page uses plain `<li><span>` bullets).
5. **Show the draft, wait for approval.** Present the drafted bullets inline as part of the morning brief. Jordan approves as-is or edits the text. **Nothing is posted until this step returns explicit approval** -- no default-approve on silence, no timeout-based auto-post. If Jordan's approved/edited draft has zero bullets, treat that as "skip today" -- report it as skipped in the `## Daily Status Post` line and do not proceed to step 6. Never post an empty `<ul>`.
6. **Post via Playwright, headed, with an explicit checkbox assertion.** Using the `playwright` MCP against the dedicated automation profile:
   - Launch against `PLAYWRIGHT_USER_DATA_DIR`. If the browser fails to launch because the profile is already open elsewhere (a locked-profile / second-instance error), **stop and fail loud with that specific reason** -- don't retry by force-closing anything, don't fall back to a fresh throwaway profile (that just hits a login wall instead).
   - Navigate to the resolved page URL.
   - Click Edit.
   - Insert the approved bullet list as a `<ul><li>` block immediately after today's date paragraph in Jordan's block only -- leave every other person's `<h1>` block and every other day's paragraph in Jordan's own block byte-identical.
   - Locate the "Notify watchers" checkbox and read its actual checked state. If it's checked, uncheck it. If the checkbox element can't be found at all, **stop and fail loud** -- do not submit uncertain of its state.
   - Click Update.
7. **Confirm and report.** Re-fetch the page (`FetchConfluencePage` is fine here -- read-only) and confirm the bullets landed under today's date in Jordan's block, matching the approved draft text. Report success, or the specific failure reason (page-not-found, date-mismatch, already-posted, checkbox-unconfirmed, Playwright navigation/click failure), back into the day file via the `## Daily Status Post` line.

## Verify

1. **Date-match guard actually blocks.** Confirm step 2's date comparison is exact-string equality against `<time datetime>`, not a weekday-name or approximate match -- a deliberately wrong date must fail loud, not post to the nearest day.
2. **No double-post.** Step 3's existing-`<ul>` check runs before any draft is shown, not just before posting -- an already-posted day is reported immediately, not after Jordan spends time reviewing a draft that can't be used.
3. **Scope containment.** After posting, confirm every other person's `<h1>` block on the page and every other day within Jordan's own block is byte-identical to the pre-edit fetch -- the edit touched exactly one `<ul>` insertion point.
4. **Notify-checkbox confirmation is real, not assumed.** The report must state explicitly that the checkbox was read and found/left unchecked before submit -- "assumed unchecked" or no mention at all is a Verify failure, not a pass.
5. **Approval gate held.** The posted bullet text is byte-for-byte identical to what Jordan approved in step 5 -- no silent reformatting or content addition between approval and submit.
6. **Fail-loud traceability.** Every failure path (page-not-found, date-mismatch, already-posted, checkbox-unconfirmed, Playwright failure) produces a specific, named reason in the day file's `## Daily Status Post` line -- never a generic "couldn't post."

## Output template

```markdown
## Daily Status Post

**Draft (pending your approval):**
- <bullet 1>
- <bullet 2>
- <bullet 3>

Approve as-is, edit, or skip today?

<!-- after approval and post attempt -->
**Posted** to Week <MM/DD/YYYY>, <Weekday> <date> -- notify-watchers confirmed unchecked.
<!-- or -->
**NOT POSTED** -- <specific reason: page-not-found | date-mismatch | already-posted (existing text: "...") | checkbox-unconfirmed | profile-locked | playwright-failure: <detail> | skipped (empty draft)>
```

## Examples

**Good trigger:** run-daily-workflow's morning phase reaches its Confluence-status step -> draft shown alongside the rest of the morning brief, Jordan approves, Kilroy posts via Playwright.
**Good trigger (edge case):** today's row already has a `<ul>` -> Kilroy reports the existing content and asks before doing anything else, no draft shown yet.
**Bad trigger:** *"post an update to the team channel"* -> that's Teams, not Confluence; out of scope for this skill (and out of scope for Kilroy entirely until a future spec covers it).
**Bad trigger:** *"update Thursday's row today"* -> this skill only ever targets today's actual date, resolved live. A deliberate different-day request needs a different skill/step, not a parameter bolted onto this one.

## Anti-patterns

- Guessing the weekly page URL/id from a date pattern instead of resolving it live via `ConfluenceGetPageChildren`.
- Posting via `ConfluenceUpdatePage` directly to work around the missing notify-control -- that tool cannot control the checkbox at all; the whole reason this skill uses Playwright is that gap.
- Submitting without confirming the "Notify watchers" checkbox's actual state -- an assumed-unchecked submit is exactly the failure mode Jordan flagged.
- Auto-approving the draft on any condition (timeout, no response, "looks fine") -- approval must be explicit every time.
- Running headless by default -- this posts under Jordan's name to a page his team can see; the visible browser run is the transparency mechanism, not a debugging convenience to be turned off later without reconsidering why it was on.
- Editing any block other than Jordan's own, or any day other than today's resolved date.
- Pointing `PLAYWRIGHT_USER_DATA_DIR` at Jordan's actual daily-driver browser profile. It will fail almost every run once that profile is open elsewhere -- use a dedicated profile signed in once for this purpose.
- Posting an empty bullet list when Jordan's edited draft has nothing left in it. That's a skip, not a post.
