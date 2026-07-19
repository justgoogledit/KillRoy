---
name: arriving-amr-progress
type: executional
trigger: Jordan says "kilroy progress" / "kilroy progress <fleet>" / "where are the incoming AMRs" / "gate board"
inputs: optional fleet-name (defaults to all fleets Jordan is commissioning)
outputs:
  - stdout: gate-progress board (per-unit table + per-gate counts + blockers grouped by owning team)
  - Projects/progress/<YYYY-MM-DD>-progress.md (snapshot of the board, primary artifact)
  - log.md append (prose event line: date, per-gate counts, per-team blocker counts; + structured `kilroy-log` companion line, per log.md's header contract)
---

# arriving-amr-progress

Track each incoming AMR's climb through the buyoff-gate ladder (220 -> 250 -> 270 -> 280 -> 290) and surface blockers grouped by the team whose action unblocks them.

## When to use

- Daily standup prep -- "who's stuck where, whose action unblocks each unit."
- Weekly leadership rollup on incoming-AMR throughput.
- Ad-hoc "how many units are one gate from production" question.
- Not for packaging a fleet to hand off -- use [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] for that.

## Applies

- [[Knowledge/Sources/2026-07-02-pc-amr-gates|Gate ownership map]] -- authoritative source for which team owns each gate. Kilroy uses this to attribute blockers.
- [[Knowledge/Personal/voice]] -- board output opens with the "was here" signature; see its "Humanizer pass on packaged outputs" section.
- [[Knowledge/Personal/preferences]] -- short, concrete, one recommendation with reason.
- `humanizer` skill (`~/.claude/skills/humanizer`) -- run on the prose portions only (step 5).

## Steps

1. Read AMR Hub via `GET $AMR_HUB_BASE_URL/api/amrs`. If Jordan named a fleet, filter to that fleet's units; otherwise include every unit Kilroy sees.
2. For each unit extract:
   - `buyoff220Status`, `buyoff250Status`, `buyoff270Status`, `buyoff280Status`
   - Corresponding `*BlockedReason` fields (populated only when the gate is blocked)
   - `updatedAt` (used to compute days-blocked)
3. Bucket each unit by current gate:
   - `at-220` -- nothing complete yet
   - `at-250` -- 220 complete, 250 in progress
   - `at-270` -- 220+250 complete, 270 in progress
   - `at-280` -- 220+250+270 complete, 280 in progress
   - `production-ready` -- all 4 complete
   Add a `pending-290-column` note on production-ready units (the amrtracker schema does not yet have `buyoff290Status`).
   If any gate status field is null, missing, or otherwise unreadable for a unit, do not force it into a bucket and do not drop it from the total. List it under `## Data quality flags` in the output instead (see template) -- per `CLAUDE.md`'s fail-loud rule, a bad field is a data-quality problem to surface, not something to guess past.
4. For each blocked unit (non-empty `*BlockedReason`), attach:
   - Blocker text (verbatim from the AMR Hub field)
   - Days-blocked (today minus `updatedAt`)
   - **Owning team** (lookup in the gate ownership map from `Knowledge/Sources/2026-07-02-pc-amr-gates`)
5. Draft the board. Open with the "was here" signature. Group blockers by owning team so Jordan sees who to push. Run the `humanizer` skill on the prose portions only -- the signature line and the recommendation -- never on the gate tables or blocker text, which must stay verbatim per Verify below. Render the final version to stdout AND write it to `Projects/progress/<YYYY-MM-DD>-progress.md`.
6. Append the entry to `log.md`: the prose line `## [<date>] progress | <at-220>/<at-250>/<at-270>/<at-280>/<production-ready> | blockers: MFE=<n>, MFA Controls=<n>, MFA Hardware=<n>`, followed on the next line by its structured companion (format contract in `log.md`'s header): `<!-- kilroy-log date=<date> skill=arriving-amr-progress event=progress status=<ok|warn> fleet=<fleet|all> total=<n> at220=<n> at250=<n> at270=<n> at280=<n> ready=<n> flags=<n> blockers_mfe=<n> blockers_mfa_controls=<n> blockers_mfa_hardware=<n> -->`. `fleet` is the fleet filter for this run (`all` when Jordan didn't name one -- a machine consumer must not mix scoped and all-fleet counts); `flags` is the unit count under `Data quality flags`; `status=warn` when `flags` > 0, else `status=ok`.

## Verify

Before returning the board:

1. **Sum audit**: sum of per-gate bucket counts + count of units listed under `Data quality flags` = total unit count from AMR Hub. No unit falls off, and no unit is silently force-bucketed to make the sum work.
2. **Blocker traceability**: every blocker line has a matching non-empty `buyoff<gate>BlockedReason` in the raw response.
3. **No false production-ready**: no unit is reported as `production-ready` unless all 4 gate statuses literally equal `Complete`.
4. **Every blocker has an owning team**: no unattributed blockers. If the gate ownership map has no entry, stop and flag it to Jordan.
5. **Humanizer stayed in its lane**: the gate tables and blocker text in the final version are byte-for-byte identical to the pre-humanizer draft. Only the signature line and the recommendation changed.
6. **Structured line audit**: the `kilroy-log` companion line sits on the line immediately after the prose log line and follows `log.md`'s header contract; its bucket counts satisfy the same sum audit as item 1 (`at220+at250+at270+at280+ready+flags = total`), its three `blockers_*` counts match the per-team totals on the board, and `status` follows the `flags` rule in step 6.

## Output template

```markdown
# Gate progress -- <YYYY-MM-DD>

> Kilroy was in the AMR Hub at HH:MM CDT. <total> units across <n> fleets: <production-ready> production-ready, <blocker-count> blocked.

## <Fleet name> -- <n> units incoming

| Gate | Count | Units |
|---|---|---|
| at-220 (electrical) | <n> | T3L2_<nnn>, ... |
| at-250 (safety) | <n> | ... |
| at-270 (handoff/map) | <n> | ... |
| at-280 (performance) | <n> | ... |
| production-ready | <n> | ... |

(repeat per fleet)

## Data quality flags

<list any unit with a null, missing, or unreadable gate-status field. Do not bucket these units above and do not drop them from the total -- name the field, state what's still known about the unit, and say what would resolve it. Omit this section entirely if there are no flags -- don't render an empty header.>

- T3L2_<nnn> -- `buyoff<gate>Status` returned null/missing. <what's known> Needs <resolution step>.

## Blockers by owning team

### MFE (<n>)
- T3L2_<nnn> at gate 270 for 6 days -- "<blocker text>"
- ...

### MFA Controls (<n>)
- T3L2_<nnn> at gate 250 for 2 days -- "<blocker text>"
- ...

### MFA Hardware (<n>)
- T3L2_<nnn> at gate 220 for 4 days -- "<blocker text>"
- ...

## Recommendation

<one recommendation with the reason -- e.g. "MFE has 2 units blocked >5 days on gate 270 dolly-size failures. Escalate at Thursday's standup before more units queue behind them.">
```

## Examples

**Good trigger:** *"kilroy progress"* -> all fleets, full board.
**Good trigger:** *"kilroy progress gftx-cybercab-2m-b3-agv"* -> single fleet, filtered board.
**Good trigger:** *"where are the incoming amrs"* -> same as above.

**Bad trigger:** *"kilroy handoff cybercab 2m"* -> use [[Skills/fleet-commissioning-handoff/SKILL|fleet-commissioning-handoff]] instead.
**Bad trigger:** *"why is T3L2_042 stuck"* -> single-unit diagnosis; this skill is a rollup, not a diagnosis. Point Jordan at the unit's row in AMR Hub or use `fleet-troubleshooter` from `~/.claude/agents/`.

## Anti-patterns

- Guessing at owning team. Always look up from the gate ownership map. If unmapped, flag; don't infer.
- Padding empty gates. If no unit is at-280, show `at-280: 0` explicitly -- Jordan reads the zeros as signal.
- Fabricating days-blocked. Compute from `updatedAt`. If `updatedAt` is missing, say so; don't estimate.
- Writing to AMR Hub. Read-only.
- Running the humanizer pass over the whole board. It touches the signature and recommendation only -- gate tables and blocker text stay verbatim.
