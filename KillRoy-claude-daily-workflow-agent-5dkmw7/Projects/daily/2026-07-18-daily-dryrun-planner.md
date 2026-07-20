> DRY-RUN ARTIFACT -- SYNTHETIC FIXTURE DATA. Produced by executing `run-daily-workflow`'s morning
> phase against `Knowledge/Sources/fixtures/planner-tasks-response.json` (not a live Graph API
> call) to execution-test the new Planner digest addition specifically. `GRAPH_API_USER_OBJECT_ID`
> treated as `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee` per the fixture README. No task title, GUID, or
> plan name below is real. Do not hand this to Jordan. See
> `Knowledge/Sources/fixtures/README.md`.
>
> This focuses on the new `## Today's tasks (Planner)` section only -- the AMR board/action-list
> portions of the morning phase were already execution-tested against `amr-hub-response.json` in
> `2026-07-17-daily-dryrun.md`; not re-duplicated here.

# Daily -- 2026-07-18 (Planner digest excerpt)

## Today's tasks (Planner)

**MFA Controls -- Daily Ops (1)**
- [ ] Send buyoff status update to leadership before EOD -- due today

**GFTX AMR Acceptance -- Cross-team (1)**
- [ ] Draft weekly status slide for leadership sync -- due today

Data quality flags (Planner): Confirm E-stop revalidation schedule with MFA Hardware -- `dueDateTime` returned null/missing, excluded from the list above. Needs a direct check in Planner to see the real due date.

## Close-out (Planner)

Planner tasks are not reconciled here -- see Planner directly for current status.

---

## Execution-test notes (not part of the skill's real output -- dry-run record only)

**Manual trace against `planner-tasks-response.json`'s 5 tasks:**

| Task | dueDateTime | Assigned to | Result |
|---|---|---|---|
| `FIXTURE-taskId-0001` | 2026-07-18 (today) | Jordan (`aaaa...`) | Included -- Plan A |
| `FIXTURE-taskId-0002` | 2026-07-18 (today) | Someone else (`1111...`) | Excluded -- wrong assignee |
| `FIXTURE-taskId-0003` | 2026-07-22 (not today) | Jordan | Excluded -- not due today |
| `FIXTURE-taskId-0004` | `null` | Jordan | Flagged -- Data quality flags (Planner), not silently dropped, not folded into the digest |
| `FIXTURE-taskId-0005` | 2026-07-18 (today) | Jordan | Included -- Plan B |

**Verify steps run against this output:**

1. **Planner task traceability** (Verify item 7) -- both included tasks (`0001`, `0005`) match real rows in the fixture, filtered to `GRAPH_API_USER_OBJECT_ID` and due today. Pass.
2. **Planner data quality flags** (Verify item 8) -- `0004`'s null `dueDateTime` is named explicitly under its own line, not silently dropped and not guessed into the due-today list. Pass.
3. **Assignment filter actually filters** -- `0002` is due today but assigned to a different GUID; it does not appear anywhere in the digest above. Confirmed by omission -- if a naive implementation pulled every due-today task in the plan regardless of assignee, `0002` would appear here and it does not. Pass.
4. **Due-today-only, no invented overdue handling** -- `0003` (due 2026-07-22) does not appear, and no "overdue" section was invented. Matches Jordan's explicit "due today, not overdue-inclusive" answer from the interview. Pass.
5. **Group-by-plan-name** -- the two included tasks land under their correct, distinct plan names (`MFA Controls -- Daily Ops` for `0001`, `GFTX AMR Acceptance -- Cross-team` for `0005`), mirroring how the AMR board groups by fleet. Pass.
6. **Close-out exclusion** (Steps §4, Anti-patterns) -- the close-out section states plainly that Planner tasks aren't reconciled here, with no done/moved/still-open bookkeeping attempted for them. Pass.
7. **Humanizer scope** (Verify item 9) -- no humanizer pass was run over this excerpt at all, since none of it is prose (task titles/plan names/the data-quality-flag line's task title are all verbatim source text, not narrative). This itself demonstrates the rule holds: there was nothing here for humanizer to touch.

All match the workflow's own analytical verification pass exactly -- independently re-derived by hand here, not just trusted from that report.
