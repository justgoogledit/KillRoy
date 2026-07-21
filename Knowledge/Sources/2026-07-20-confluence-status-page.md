---
title: Confluence Daily-Status Page Reference (TXPC)
author: Jordan Casias (confirmed live via FetchConfluencePage, 2026-07-20)
type: reference
date_synthesized: 2026-07-20
tags: [confluence, daily-status, txpc, personal-assistant]
---

# Confluence Daily-Status Page Reference (TXPC)

Structural reference for [[Skills/confluence-daily-status/SKILL|confluence-daily-status]]. Confirmed by fetching the live page, not guessed -- unlike [[Knowledge/Sources/overmind-fleets|the Overmind fleet reference]], there is no "refresh pull" here beyond re-fetching this same page if the structure changes; this doc caches page identity, not a value that needs periodic resync.

## Page identity

- Space key: `TXPC` ("Texas Production Control")
- Parent index page id: `3767570872` (title `2026` -- lists all weekly subpages as children)
- Weekly page title pattern: `Week MM/DD/YYYY`, where the date is the **Monday** of that week (e.g. `Week 07/20/2026` for the week of 2026-07-20)
- Confirmed example weekly page id: `4137131944` (`Week 07/20/2026`)
- Jordan's exact heading text to match: `Jordan Casias`

**Resolution rule for the skill:** compute the Monday of the current week from today's date, then call `ConfluenceGetPageChildren` on the parent page id and match by title against the computed `Week MM/DD/YYYY` string. Never construct or guess the page URL/id directly from the date -- always resolve through the live children list. If no child page title matches, that's a fail-loud stop, not a guess at an adjacent week.

## Confirmed page structure (storage format)

The page is a two-column `ac:layout` with one `ac:layout-cell` per column. Within each cell, every person gets:

```html
<h1><strong>{Person Name}</strong></h1>
<p><strong>Monday <time datetime="YYYY-MM-DD" /> </strong></p>
<!-- a <ul><li>...</li></ul> block appears here ONLY if that day has content -->
<p><strong>Tuesday <time datetime="YYYY-MM-DD" /> </strong></p>
...
<p><strong>Friday <time datetime="YYYY-MM-DD" /></strong></p>
```

Confirmed example with content (Logan Stark, Monday 2026-07-20):

```html
<p><strong>Monday <time datetime="2026-07-20" /> </strong></p>
<ul>
  <li><span>Skid cleaning trailer adhocs and documentation</span></li>
  <li data-uuid="..."><span>External VRC meeting</span></li>
  <li data-uuid="..."><span>Dolly adhocs</span></li>
  <li data-uuid="..."><span>Sprung casters for external castings flow PO</span></li>
  <li data-uuid="..."><span>VRC hitch issue brainstorm</span></li>
</ul>
<p><strong>Tuesday <time datetime="2026-07-21" /> </strong></p>
```

Notes for the insertion logic:

- The `<ul>` block is a sibling of the date `<p>`, inserted immediately after it -- not nested inside it.
- Bullet `<li>` elements carry an inline `<span>` wrapper and (except the first) a `data-uuid` attribute. The `data-uuid` looks like a Confluence-generated collaborative-editing id, not something the skill needs to fabricate correctly -- omitting it on a freshly-inserted `<li>` has not caused a rendering problem in the confirmed example (the first bullet in Logan Stark's list has no `data-uuid` either).
- A day with no content has only the `<p>` date paragraph and no following `<ul>` -- this is the "empty" state the skill checks for in its "already posted?" guard (Skill step 3): if a `<ul>` already exists after today's paragraph, today was already posted.
- `<time datetime="YYYY-MM-DD" />` is the authoritative date marker to match against -- exact string equality against today's date in `YYYY-MM-DD`, not the weekday name (weekday names are just display text and are not re-validated against the actual calendar day of the `datetime` value in this reference).

## Known gap: no "notify watchers" control via API

`ConfluenceUpdatePage` (the Confluence MCP tool) takes only `page_id`, `body`, `title` -- confirmed no notify/minor-edit parameter exists. The "Notify watchers" checkbox is only present in Confluence's native browser edit UI (screenshot-confirmed 2026-07-20). This is why [[Skills/confluence-daily-status/SKILL|confluence-daily-status]] posts via Playwright browser automation rather than the API tool -- see that skill's step 6, `.env.example`'s `PLAYWRIGHT_*` vars, and `.mcp.json`'s `playwright` server entry.

**Second gap found during skill review (2026-07-20):** the automation must run against a *dedicated* browser profile signed into Tesla SSO once, not Jordan's actual daily-driver profile -- Chromium refuses a second `--user-data-dir` launch against a profile that's already open elsewhere, and Jordan's daily profile is open essentially all day. See `.env.example`'s `PLAYWRIGHT_USER_DATA_DIR` note.

## Update policy

Edit this file when:
- The page structure changes (e.g. Confluence changes how bullet lists or dates are marked up).
- The parent page id or space key changes.
- A new weekly-page title pattern is observed that doesn't match `Week MM/DD/YYYY`.

Do not edit when:
- A single week's content changes -- that's just normal page content, not a structural change.

## Related

- [[Skills/confluence-daily-status/SKILL|confluence-daily-status]] -- the skill that consumes this reference.
- [[Skills/run-daily-workflow/SKILL|run-daily-workflow]] -- morning phase, where this skill's step runs.
