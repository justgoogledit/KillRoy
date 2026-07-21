---
name: fleet-commissioning-handoff
type: executional
trigger: Jordan says "kilroy handoff <fleet>" / "package the handoff for <fleet>" / "handoff doc for <fleet>"
inputs: fleet-name (e.g. gftx-cybercab-2m-b3-agv)
outputs:
  - Projects/handoffs/<YYYY-MM-DD>-<fleet>-handoff.md (the handoff package, primary artifact)
  - log.md append (prose event line: date, fleet, robot count, tracer-event count; + structured `kilroy-log` companion line, per log.md's header contract)
---

# fleet-commissioning-handoff

Package a single fleet's current Overmind state into a markdown artifact Jordan can hand to line-side ops.

Scope note (2026-07-21 consolidation): this skill's AMR Hub buyoff-gate table, Master Tracker cross-reference, and CSV-freshness banner were all retired along with those two connectors -- see `Knowledge/Lessons/2026-07-20-connector-consolidation-planning.md`. What remains is an Overmind-only fleet-state report. Buyoff-gate questions now route to the `overmind` MCP (`AskOvermind`) or Jordan's dashboard directly.

## When to use

- End of a commissioning cycle when a fleet is ready to be handed off to production ops.
- Ad-hoc "what's the state of <fleet>" pulls when a stakeholder asks for a snapshot.

## Applies

- `kilroy-connectors` MCP server (`mcp-server/`, registered in `.mcp.json`) -- source of this skill's single pull: Overmind fleet state (`overmind_get_fleet_state`); its `node:test` suite proves the pull's fail-loud contract.
- [[Knowledge/Sources/overmind-fleets|Overmind fleet reference]] -- known-good fleet ids.
- [[Knowledge/Personal/voice]] -- packaged outputs open with the "was here" signature; see its "Humanizer pass on packaged outputs" section for the precedence rule below.
- [[Knowledge/Personal/preferences]] -- one recommendation with reason; concrete over abstract.
- `humanizer` skill (`~/.claude/skills/humanizer`) -- run on the drafted package before finalizing (step 3).

## Steps

1. Resolve the fleet name against [[Knowledge/Sources/overmind-fleets|the Overmind fleet reference]]. If it isn't a known fleet id (exact match; no alias/fuzzy resolution exists), stop and ask Jordan.
2. Pull the fleet's Overmind state via the `overmind_get_fleet_state` tool on the `kilroy-connectors` MCP server (full mode, `fleetId` = the resolved fleet): image tag, robot count, tracer events, MFS wiring, `RobotConfigs.yaml` deltas. The tool substitutes `{fleet}` into `OVERMIND_BASE_URL_TEMPLATE` itself and fails loud -- naming the syscall code, HTTP status, GraphQL error, or missing field -- rather than ever returning partial state; if it errors, stop and report per `CLAUDE.md`'s fail-loud rule. Note the tool's GraphQL query is marked UNVERIFIED against the real schema until the first corp-network run (see `mcp-server/lib/overmind.js`) -- a schema-mismatch error there is the tool working, not a Kilroy bug. No hand-rolled HTTP fallback if the MCP server is missing.
3. Draft the handoff package using the output template below. Open with the "was here" signature. Run the `humanizer` skill on the draft before finalizing -- [[Knowledge/Personal/voice]]'s rules win on any conflict (rare; see that file's "Humanizer pass" section). Write the final version to `Projects/handoffs/<YYYY-MM-DD>-<fleet>-handoff.md`.
4. Append the entry to `log.md`: the prose line `## [<date>] handoff | <fleet> -- <robot-count> robots, <tracer-event-count> tracer events active`, followed on the next line by its structured companion (format contract in `log.md`'s header): `<!-- kilroy-log date=<date> skill=fleet-commissioning-handoff event=handoff status=ok fleet=<fleet> robots=<n> tracer=<n> -->`.

## Verify

Before handing the package back to Jordan:

1. **Re-read the produced markdown** and quote two facts back (e.g. the image tag and the tracer-event count). Confirm both quotes appear verbatim in the raw Overmind response payload.
2. **No fabricated fields**: every value in the package comes from the Overmind payload. If a field is missing from the response, the tool already failed loud -- a delivered package never contains a guessed or defaulted value.
3. **Humanizer didn't touch facts**: re-run steps 1-2 above against the post-humanizer version, not just the draft. A rewrite pass can smooth phrasing in a way that loosens a specific number -- confirm none of that happened before delivering.
4. **Structured line audit**: the `kilroy-log` companion line sits on the line immediately after the prose log line and follows `log.md`'s header contract; its `robots`/`tracer` values match the package's own counts.

If any verify step fails, do not deliver the package -- fix the underlying issue first.

## Output template

```markdown
# Handoff -- <fleet-name> -- <YYYY-MM-DD>

> Kilroy was in `<fleet-name>` at HH:MM CDT. <robot-count> robots on image `<tag>`, <tracer-event-count> tracer events active.

## Fleet state (Overmind)

- Image tag: `<tag>`
- Robot count: <n>
- Tracer events active: <n>
- MFS wiring: <summary>
- RobotConfigs.yaml deltas: <summary or "none">

## Recommendation

<one recommendation with the reason -- e.g. "Hold handoff to line ops until the 2 active tracer events clear; both opened in the last 24h.">
```

## Examples

**Good trigger:** *"kilroy handoff gftx-cybercab-2m-b3-agv"*
**Good trigger:** *"package the handoff for gftx-cybercab-2m-b3-agv please"* -- step 1 matches the exact fleet id; a nickname like "cybercab 2m" falls through to step 1's "not found, ask Jordan" path, not a fuzzy match.

**Bad trigger:** *"what's the status of the fleet"* -- too vague, no fleet named. Ask Jordan which fleet.
**Bad trigger:** *"why is T3L2_042 stuck"* -- live per-unit troubleshooting. Route to the `overmind` MCP (`AskOvermind`).

## Anti-patterns

- Fabricating fields. If the Overmind response is missing a field, the tool fails loud -- never invent values.
- Reviving the AMR Hub / Master Tracker cross-reference. Those connectors are retired; git history has the old version if ever needed.
- Multi-fleet output. This skill packages one fleet per invocation. Batch-mode is out of scope for v1.
- Letting the humanizer pass rewrite facts. It edits prose, not data -- re-run Verify steps 1-2 against the post-humanizer version, not just the draft.
