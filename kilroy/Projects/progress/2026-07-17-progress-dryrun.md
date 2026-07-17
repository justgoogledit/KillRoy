> DRY-RUN ARTIFACT -- SYNTHETIC FIXTURE DATA. Produced by executing `arriving-amr-progress`
> against `Knowledge/Sources/fixtures/amr-hub-response.json` (not a live AMR Hub call) to
> execution-test the skill in an environment with no corp-network access. No unit ID, blocker
> text, or count below is real. Do not hand this to Jordan or line-side ops. See
> `Knowledge/Sources/fixtures/README.md`.

# Gate progress -- 2026-07-17

> Kilroy was in the AMR Hub at 08:15 CDT. 13 units across 1 fleet: 1 production-ready, 4 blocked, 1 unit flagged for missing data.

## Cybercab 2M B3 -- 13 units incoming

| Gate | Count | Units |
|---|---|---|
| at-220 (electrical) | 3 | T3L2_047, T3L2_048, T3L2_049 |
| at-250 (safety) | 2 | T3L2_045, T3L2_046 |
| at-270 (handoff/map) | 4 | T3L2_041, T3L2_042, T3L2_043, T3L2_044 |
| at-280 (performance) | 2 | T3L2_039, T3L2_040 |
| production-ready | 1 | T3L2_038 (pending-290-column -- amrtracker has no `buyoff290Status` yet) |

Clean-bucket sum: 3 + 2 + 4 + 2 + 1 = 12. Total units returned: 13. The 1-unit gap is `T3L2_050` -- see Data quality flags below. This is the fixture's deliberate edge case; the sum audit is expected to surface a gap here, not silently report 12/13 or 13/13.

## Data quality flags

- **T3L2_050** -- `buyoff250Status` is null in the AMR Hub response. 220 = Complete, 270/280 = NotStarted, so this unit is mid-ladder, not production-ready -- but I'm not bucketing it at `at-250` or anywhere else because I can't confirm the 250 gate's real state from a null field. Per the fail-loud rule in `CLAUDE.md`, I'm excluding it from every bucket and from `production-ready` rather than guessing. Needs a source-side fix (re-pull or check the AMR Hub record directly) before this unit can be placed.

## Blockers by owning team

### MFA Hardware (1)
- T3L2_049 at gate 220 for 7 days -- "IPC replacement part on backorder, network config blocked"

### MFA Controls (2)
- T3L2_042 at gate 270 for 6 days -- "dolly size 4 fails localization"
- T3L2_046 at gate 250 for 2 days -- "PLC download pending TIA V20 install"

### MFE (1)
- T3L2_040 at gate 280 for 3 days -- "throughput below 93.6% avail target"

## Recommendation

T3L2_049 is the oldest open blocker at 7 days and sits at gate 220 -- everything behind it on the electrical buyoff queue is stalled on MFA Hardware's backorder. I'd chase that part status before Thursday's standup; it's blocking the earliest gate in the ladder, so it has the largest downstream effect of the four open items.

---

## Execution-test notes (not part of the skill's real output -- dry-run record only)

**Verify steps run against this output:**

1. **Sum audit** -- 12 clean-bucketed + 1 explicitly-flagged-unavailable (`T3L2_050`) = 13 = total unit count from the fixture. Pass. The skill's stated Verify step ("no unit falls off") holds even in the presence of a bad field, because the unit is flagged rather than dropped or force-bucketed.
2. **Blocker traceability** -- all 4 blocker lines above match a non-empty `buyoff<gate>BlockedReason` verbatim in `amr-hub-response.json`. Pass.
3. **No false production-ready** -- only `T3L2_038` has all 4 gates literally `Complete`. `T3L2_050` has 220=Complete but 250=null, so it correctly does NOT appear as production-ready despite having one Complete gate. Pass.
4. **Every blocker has an owning team** -- all 4 resolved against `Knowledge/Sources/2026-07-02-pc-amr-gates.md` (220->MFA Hardware, 250/270->MFA Controls, 280->MFE). Pass.

**Finding:** the skill's output template (`Skills/arriving-amr-progress/SKILL.md`) has no designated section for a data-quality flag like `T3L2_050`. Verify step 1 implies this case should be caught ("no unit falls off") but the template gives no slot to render it, so a less careful run could satisfy Verify by simply omitting the unit from the visible board while still passing a sloppy version of the sum check. Recommend adding a `## Data quality flags` section to the template -- done informally above; proposing it get added to the skill itself as a real template section (see follow-up commit).
