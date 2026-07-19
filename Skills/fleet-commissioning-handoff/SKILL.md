---
name: fleet-commissioning-handoff
type: executional
trigger: Jordan says "kilroy handoff <fleet>" / "package the handoff for <fleet>" / "handoff doc for <fleet>"
inputs: fleet-name (e.g. gftx-cybercab-2m-b3-agv)
outputs:
  - Projects/handoffs/<YYYY-MM-DD>-<fleet>-handoff.md (the handoff package, primary artifact)
  - log.md append (prose event line: date, fleet, open-item count, production-ready count; + structured `kilroy-log` companion line, per log.md's header contract)
---

# fleet-commissioning-handoff

Package a single fleet's current commissioning state into a markdown artifact Jordan can hand to line-side ops.

## When to use

- End of a commissioning cycle when a fleet is ready to be handed off to production ops.
- Ad-hoc "what's the state of <fleet>" pulls when a stakeholder asks for a snapshot.
- Not for daily progress checks -- use [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]] for that.

## Applies

- [[Knowledge/Sources/2026-07-02-pc-amr-gates|Gate ownership map]] -- 220/250/270/280/290 -> owning team.
- `kilroy-connectors` MCP server (`mcp-server/`, registered in `.mcp.json`) -- source of the Overmind fleet state (`overmind_get_fleet_state`) and the AMR Hub unit data (`amr_hub_get_units`); its `node:test` suite proves both pulls' fail-loud contracts. The Master Tracker CSV read stays prose-described until ticket #9 migrates it.
- [[Knowledge/Personal/voice]] -- packaged outputs open with the "was here" signature; see its "Humanizer pass on packaged outputs" section for the precedence rule below.
- [[Knowledge/Personal/preferences]] -- one recommendation with reason; concrete over abstract.
- `humanizer` skill (`~/.claude/skills/humanizer`) -- run on the drafted package before finalizing (step 6).

## Steps

1. Resolve the fleet name. Confirm it appears in the Master Tracker CSV (`$MASTER_TRACKER_CSV_PATH`, column `projectIdentifier` or equivalent). If not, stop and ask Jordan.
2. Pull the fleet's Overmind state via the `overmind_get_fleet_state` tool on the `kilroy-connectors` MCP server (full mode, `fleetId` = the resolved fleet): image tag, robot count, tracer events, MFS wiring, `RobotConfigs.yaml` deltas. The tool substitutes `{fleet}` into `OVERMIND_BASE_URL_TEMPLATE` itself and fails loud -- naming the syscall code, HTTP status, GraphQL error, or missing field -- rather than ever returning partial state; if it errors, stop and report per `CLAUDE.md`'s fail-loud rule. Note the tool's GraphQL query is marked UNVERIFIED against the real schema until the first corp-network run (see `mcp-server/lib/overmind.js`) -- a schema-mismatch error there is the tool working, not a Kilroy bug.
3. Pull AMR Hub gate data via the `amr_hub_get_units` tool on the same server, passing this fleet as `fleetId`. For each unit extract `buyoff220Status`, `buyoff250Status`, `buyoff270Status`, `buyoff280Status`, corresponding `*BlockedReason` fields, and `updatedAt`. Derive `production-ready` = all 4 gates `= Complete`. The tool fails loud on an unreachable Hub or malformed response (never an empty list) -- if it errors, stop and report; if `unitCount` is 0 with a non-zero `totalUnitCount`, the fleet filter matched nothing -- say so rather than packaging an empty fleet as real. No hand-rolled HTTP fallback if the MCP server is missing.
4. Read the Master Tracker CSV. Extract per-unit `pipelineStatus`, `etaAtFactory`, `projectIdentifier`, `vendorRef`, `hardwareRevision` for units in this fleet.
5. Cross-reference:
   - Units listed in Master Tracker but not in AMR Hub -> flag as "incoming, not yet ingested."
   - Units in AMR Hub but not in Master Tracker -> flag as "in dashboard, no upstream record" (possible data-entry gap).
   - Units offline in Overmind but with open buyoff items -> flag as "may block gate progression." **Currently unfulfillable as written**: `overmind_get_fleet_state`'s five-field contract carries no per-unit online status (a known gap in the fixture too), and step 2 forbids side-channel pulls. Until the first corp-network run verifies the real schema and the tool grows that field, state the omission explicitly in the Cross-reference findings section -- never silently skip it, and never guess at per-unit status.
6. Draft the handoff package using the output template below. Open with the "was here" signature. Run the `humanizer` skill on the draft before finalizing -- [[Knowledge/Personal/voice]]'s rules win on any conflict (rare; see that file's "Humanizer pass" section). Write the final version to `Projects/handoffs/<YYYY-MM-DD>-<fleet>-handoff.md`.
7. Append the entry to `log.md`: the prose line `## [<date>] handoff | <fleet> -- <production-ready>/<total> ready, <open-item-count> open items`, followed on the next line by its structured companion (format contract in `log.md`'s header): `<!-- kilroy-log date=<date> skill=fleet-commissioning-handoff event=handoff status=<ok|warn> fleet=<fleet> ready=<n> total=<n> open=<n> -->`. `status=warn` when the package carries the stale-CSV warning banner (Verify step 4), else `status=ok`.

## Verify

Before handing the package back to Jordan:

1. **Re-read the produced markdown** and quote two facts back:
   - One fact from the Overmind response (e.g. image tag)
   - One fact from the AMR Hub response (e.g. a specific unit's blocked reason)
   Confirm both quotes appear verbatim in the raw response payloads.
2. **Sum audit**: total unit count in the handoff = the `unitCount` reported by the `amr_hub_get_units` tool result for this fleet (with `totalUnitCount` as the cross-check that the filter itself saw the full Hub). No unit falls off.
3. **No fabricated IDs**: every robot ID mentioned in the handoff appears in the Overmind payload, the AMR Hub payload, or the Master Tracker CSV. (The CSV is a valid source here, not just AMR Hub/Overmind -- step 5's "incoming, not yet ingested" finding necessarily cites a unit that exists only in the Master Tracker CSV.)
4. **CSV freshness**: if the Master Tracker CSV's `mtime` is older than `$MASTER_TRACKER_STALE_WARN_HOURS`, include a `> Warning: Master Tracker CSV is <N>h old. Re-export before final handoff.` line at the top of the package.
5. **Humanizer didn't touch facts**: re-run steps 1-3 above against the post-humanizer version, not just the draft. A rewrite pass can smooth phrasing in a way that loosens a specific number, drops a unit ID, or rephrases a blocker reason into something vaguer -- confirm none of that happened before delivering.
6. **Structured line audit**: the `kilroy-log` companion line sits on the line immediately after the prose log line and follows `log.md`'s header contract; its `ready`/`total`/`open` values match the package's own counts, and `status=warn` if and only if the staleness banner from Verify step 4 is present.

If any verify step fails, do not deliver the package -- fix the underlying issue first.

## Output template

```markdown
# Handoff -- <fleet-name> -- <YYYY-MM-DD>

> Kilroy was in `<fleet-name>` at HH:MM CDT. <production-ready>/<total> production-ready, <open-item-count> open items, <blocker-count> active blockers.

## Fleet state (Overmind)

- Image tag: `<tag>`
- Robot count (Overmind): <n>
- Tracer events active: <n>
- MFS wiring: <summary>

## Buyoff-gate status (AMR Hub)

| Unit | 220 | 250 | 270 | 280 | Production-ready | Open blocker |
|---|---|---|---|---|---|---|
| T3L2_<nnn> | Complete | Complete | InProgress | NotStarted | No | 270: <reason> |
| ... |

## Upstream context (Master Tracker)

| Unit | Pipeline status | ETA | Vendor ref | HW rev |
|---|---|---|---|---|
| T3L2_<nnn> | On-site | 2026-06-15 | <ref> | Rev C |
| ... |

## Cross-reference findings

- <finding 1>
- <finding 2>

## Recommendation

<one recommendation with the reason -- e.g. "Hold handoff to line ops until T3L2_014 clears 250. MFA Controls has the action; ETA per blocker note is 2 days.">
```

## Examples

**Good trigger:** *"kilroy handoff gftx-cybercab-2m-b3-agv"*
**Good trigger:** *"package the handoff for cybercab 2m please"* (resolve alias -> fleet name via Master Tracker)

**Bad trigger:** *"what's the status of the fleet"* -- too vague, no fleet named. Ask Jordan which fleet.
**Bad trigger:** *"show me T3L2_014 progress"* -- single unit, not a fleet package. Use [[Skills/arriving-amr-progress/SKILL|arriving-amr-progress]].

## Anti-patterns

- Fabricating fields. If the Master Tracker CSV is missing a column, note it in the package, don't invent values.
- Writing to AMR Hub. Read-only. Jordan updates gate status through the dashboard.
- Skipping the CSV freshness check. Stale upstream data has bitten real handoffs before.
- Multi-fleet output. This skill packages one fleet per invocation. Batch-mode is out of scope for v1.
- Letting the humanizer pass rewrite facts. It edits prose, not data -- re-run Verify steps 1-3 against the post-humanizer version, not just the draft.
