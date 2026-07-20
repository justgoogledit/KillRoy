# Kilroy — AMR Fleet Commissioning Agent — Design

> Description: A portable Claude Code agent (a "persona" like Heath Darby's Atlas) for **Jordan's team -- the acceptance-side of the GFTX AMR pipeline**. Kilroy tracks each incoming unit as it climbs the buyoff ladder from MFE (220 electrical -> 250 safety -> 270 handoff/map -> 280 performance -> 290 production) and produces the end-of-cycle handoff package to line-side ops. Lives in its own repo, forked from the starter-pack, installable on any machine with Claude Code.

**Date:** 2026-07-02
**Project:** Kilroy (new); adjacent to [[Projects/amr/amr]] and [[Projects/agentic-os/agentic-os]]
**Status:** Spec — awaiting Jordan review before scaffold
**Related:**
- Origin: 2026-07-01 Kilroy naming session, sparked by Heath Darby's Atlas intro (Tesla Energy R&R agent on Nova/novacode)
- Starter template: `Projects/agentic-os/starter-pack/` (already built to be handed off)
- Overmind data-source reference: [[Knowledge/Sources/2026-06-02-overmind-architecture]]
- Prior agent-port design (shape reference): [[Projects/agentic-os/notes/2026-06-04-amr-fleet-agents-port-design]]
- AMR project state: [[Projects/amr/amr]]
- Skill authoring standard: [[Skills/skill-creator/SKILL]]

---

## Problem

Jordan's team is the **acceptance side** of the GFTX AMR pipeline. MFA Hardware fabricates and delivers, MFE runs early bringup, and Jordan's team (PC + MFA Controls) signs each unit off through the buyoff-gate ladder before it goes to production on the four GFTX AMR lines (Kyle 2R Seats, CT Door 1M, Cybercab 2F B3, Cybercab 2M B3).

The pipeline is documented in [[Knowledge/Sources/2026-06-08-pc-amr-confluence]] -- ~157 AMRs are in flight, ~53 onsite today, 100+ by EOY 2026. The 5 gates and their owners:

- **220** -- electrical buyoff (wiring, power-on, charger, network, IPC setup). Owner: MFA Hardware. Milestone 300.
- **250** -- safety buyoff (E-stop validation, sensor calibration, firmware). Owner: Overmind + MFA Controls. Milestone 400.
- **270** -- handoff/map buyoff (PLC safety config, 270 map setup). Owner: MFA Controls + MFE. Milestone 500.
- **280** -- performance testing (every production dolly size). Owner: MFE. Milestone 500.
- **290** -- production buyoff (auto stations, KPI signoff at 93.6% availability). Owner: MFE + PC. Milestone 700.

Two chunks of Jordan's work are manual today:

1. **Tracking arriving-AMR gate progress** -- who is stuck where, whose action unblocks each unit (his team vs MFE vs MFA), how long they've been blocked. Today he reads the `amrtracker` DB row-by-row.
2. **End-of-cycle handoff to line-side ops** -- pull Overmind config state, cross-reference gate status per unit, stitch it into a fleet-readable artifact, deliver it.

The existing vault-based Agentic OS is powerful but personal. It can't be handed to a colleague, installed on Nova, or run in a demo VM without dragging the entire vault + Jordan's memory + `Knowledge/Personal/*.md` along with it.

Heath Darby's Atlas showed the packaging pattern: a named, single-purpose agent with its own home, identity file, skill library, and connector configs. Jordan wants the equivalent for his domain.

## Goal

A working `~/repos/kilroy/` Claude Code project that:

1. Has its own identity (name, voice, scope) captured in `CLAUDE.md`.
2. Owns two skills on day one: `fleet-commissioning-handoff` and `arriving-amr-progress`.
3. Reads from Overmind GraphQL and AMR Hub buyoff-gate data.
4. Runs on Jordan's laptop first; portable to another machine via `git clone` + `.env` fill.
5. Produces a real handoff package for one real fleet as its first exercise.

## Non-goals (this pass)

- Nova/novacode deployment. Local-first. Nova is Phase 2.
- Shared team use. Single-machine (Jordan's laptop) through first demo.
- Rewriting the existing vault skills. Kilroy hits the same Overmind API the vault uses but has its own skill implementation. No cross-repo skill imports.
- Graph API integration for the Master Tracker xlsx. v1 reads a local CSV export at a known path; the Graph API + SharePoint path is Phase 2 (mirrors the same env vars `amrtracker` uses: `SHAREPOINT_SHARED_FILE_URL` + `GRAPH_API_CLIENT_SECRET`).
- Porting `fleet-monitor` / `fleet-troubleshooter` / `shift-handoff` into Kilroy. Those stay at `~/.claude/agents/`. Kilroy's scope is commissioning + handoff, not runtime ops.
- MCP wiring (Confluence, Jira, SharePoint). Atlas has these; Kilroy earns them one at a time.

## Solution

### Architecture

| Aspect | Decision |
|---|---|
| Home | New repo `~/repos/kilroy/`. Forked from `Projects/agentic-os/starter-pack/`. |
| Substrate | Claude Code (opus + sonnet mix depending on skill). No Nova, no ECC install layer. |
| Identity file | `CLAUDE.md` at repo root. Kilroy's name, voice, scope, operating loop. |
| Knowledge structure | Inherits three-folder shape (`Skills/`, `Knowledge/`, `Projects/`). Kilroy's `Knowledge/` is separate from Jordan's vault. Anything Kilroy learns lives in Kilroy's tree. |
| Data connectors | `.env`-driven. `.env.example` committed. Real `.env` gitignored. |
| Skills day one | Two skills: `fleet-commissioning-handoff` and `arriving-amr-progress`. Same AMR Hub connector, two output shapes. |
| AMR Hub gate schema | `amrtracker/backend/src/routes/amrs.ts:16` -- `VALID_GATES = ['220', '250', '270', '280']`. Each gate has `buyoff{gate}Status` + `buyoff{gate}BlockedReason` columns. Production-ready = all 4 = `Complete` (line 490-493). **290 is a real gate per the milestone RACI, but not yet a patchable column in `amrtracker`.** Kilroy consumes the existing 4-gate schema for v1 and reports 290 as derived; add 290 to `amrtracker` in a separate PR when the schema catches up. |
| Gate ownership metadata | Kilroy hard-codes gate -> owning-team mapping from [[Knowledge/Sources/2026-06-08-pc-amr-confluence]]: 220=MFA Hardware, 250=Overmind+MFA Controls, 270=MFA Controls+MFE, 280=MFE, 290=MFE+PC. This lets Kilroy attribute each blocker to the team whose action unblocks it. |
| Memory | Claude Code auto-memory scoped to the Kilroy repo directory. Distinct from Jordan's vault memory. |
| Portability test | Clone to a second directory, `cp .env.example .env`, fill 3 secrets, run the same skill. If it works, portability is proven. |

### Identity + voice

Kilroy inherits Jordan's **External** register from [[Knowledge/Personal/voice]] with one persona layer added: status messages open with the "was here" signature.

Sample handoff-doc opening:

> Kilroy was in `gftx-cybercab-2m-b3-agv` at 14:32 CDT. 3 open Tier-1 buyoffs, 1 SAFE_AF stalled 6 days on T3L2_014. Handoff package below.

Voice rules (all inherited, one added):

- Direct, concrete, no hedging (voice.md).
- No em dashes; use `--` or restructure the sentence.
- One recommendation per section, with reason (preferences.md).
- **Added:** third-person "Kilroy was here" opener on packaged outputs. First-person for analysis and recommendations inside the package.

### First skill: `fleet-commissioning-handoff`

Follows [[Skills/skill-creator/SKILL]] canonical template. Sits at `Skills/fleet-commissioning-handoff/SKILL.md`.

Frontmatter:

```yaml
---
name: fleet-commissioning-handoff
type: executional
trigger: Jordan says "kilroy handoff <fleet>" or "package the handoff for <fleet>"
inputs: fleet-name (e.g. gftx-cybercab-2m-b3-agv)
outputs:
  - Projects/handoffs/<date>-<fleet>-handoff.md (the package)
  - log.md append (handoff-generated event)
---
```

Steps:

1. Resolve fleet-name against Overmind `deployments/global_values.yaml` (or the cached snapshot in `Knowledge/Sources/overmind-fleets.md`).
2. Pull current `active/*.yaml` state via Overmind GraphQL for that fleet: image tag, robot count, tracer events, MFS wiring, `RobotConfigs.yaml` deltas. *(Superseded 2026-07-19: this pull now goes through the `overmind_get_fleet_state` tool on the `kilroy-connectors` MCP server -- see `mcp-server/` and the current `Skills/fleet-commissioning-handoff/SKILL.md`.)*
3. Pull AMR Hub gate data for that fleet via `GET /api/amrs`: per-unit `buyoff220Status`, `buyoff250Status`, `buyoff270Status`, `buyoff280Status` (+ blocked-reason fields), and derive production-ready count (all 4 = `Complete`). *(Superseded 2026-07-19: this pull now goes through the `amr_hub_get_units` tool on the same server.)*
4. Read the Sonic AMR Master Tracker CSV export from `$MASTER_TRACKER_CSV_PATH`. Extract per-unit `pipelineStatus`, `etaAtFactory`, `projectIdentifier`, `vendorRef`, `hardwareRevision` for units in the target fleet. Cross-reference: flag units the Master Tracker lists but AMR Hub does not yet know about (physically incoming, not yet ingested), and vice-versa. *(Superseded 2026-07-19: this read now goes through the `master_tracker_get_rows` tool on the `kilroy-connectors` MCP server, which also carries the mtime-staleness flag.)*
5. Cross-reference: any buyoff item whose robot is offline in Overmind gets flagged.
6. Render the handoff package to `Projects/handoffs/<date>-<fleet>-handoff.md` using Kilroy's voice.
7. Append to Kilroy's `log.md` with fleet name, date, open-item count.

Verify:

- Re-read the produced handoff and quote 2 facts back against the raw Overmind response and the AMR Hub response.
- Confirm every open item in the handoff has a matching source-row in one of the inputs.
- No fabricated robot IDs. No invented tier states.

### Second skill: `arriving-amr-progress`

Same connector, different output shape. Tracks each incoming AMR's climb through the 4 buyoff gates.

Frontmatter:

```yaml
---
name: arriving-amr-progress
type: executional
trigger: Jordan says "kilroy progress" / "kilroy progress <fleet>" / "where are the incoming AMRs"
inputs: optional fleet-name (defaults to all fleets Jordan is commissioning)
outputs:
  - stdout: gate-progress board (per-unit table + per-gate counts + blockers list)
  - Projects/progress/<date>-progress.md (snapshot of the board)
  - log.md append (progress-snapshot event)
---
```

Steps:

1. Read AMR Hub `GET /api/amrs` (optionally filtered by fleet). *(Superseded 2026-07-19: this read now goes through the `amr_hub_get_units` tool on the `kilroy-connectors` MCP server -- see `mcp-server/` and the current `Skills/arriving-amr-progress/SKILL.md`. The rest of this spec is left as written; it is the historical design record.)*
2. For each unit, extract the 4 gate statuses + any `buyoff{gate}BlockedReason` populated.
3. Bucket units by current gate: `at-220`, `at-250`, `at-270`, `at-280`, `production-ready` (all 4 complete). Add a `pending-290-column` note if a unit is production-ready under the current 4-gate schema.
4. For each blocked unit, surface the blocker text, days-blocked (from `updatedAt`), **and the owning team** (from the hard-coded gate-ownership map). Group blockers by owning team so Jordan sees who to push.
5. Render a compact board to stdout, write the same content to `Projects/progress/<date>-progress.md`.
6. Append to `log.md` with per-gate counts + per-team blocker counts.

Verify:

- Sum of per-gate bucket counts equals total unit count from AMR Hub -- no unit falls off.
- Every blocker listed traces to a real `buyoff{gate}BlockedReason` value in the response.
- No unit is reported as `production-ready` unless all 4 gates literally = `Complete`.
- Every blocker has an assigned owning team from the ownership map (no unattributed blockers).

Output sketch:

```
Kilroy was in the AMR Hub at 14:32 CDT.

Cybercab 2M B3 -- 12 units incoming
  at-220 (electrical):   3   T3L2_047, T3L2_048, T3L2_049
  at-250 (safety):       2   T3L2_045, T3L2_046
  at-270 (handoff/map):  4   T3L2_041, T3L2_042, T3L2_043, T3L2_044
  at-280 (performance):  2   T3L2_039, T3L2_040
  production-ready:      1   T3L2_038

Blockers by team:
  MFE (2):
    T3L2_042 at gate 270 for 6 days -- "dolly size 4 fails localization"
    T3L2_040 at gate 280 for 3 days -- "throughput below 93.6% avail target"
  MFA Controls (1):
    T3L2_046 at gate 250 for 2 days -- "PLC download pending TIA V20 install"
```

### Data connector config

`~/repos/kilroy/.env.example`:

```bash
# Overmind GraphQL -- edge-enforced auth on corp network
# (no bearer needed on-corp; off-corp will fail loud, expected)
OVERMIND_BASE_URL_TEMPLATE=https://{fleet}.robots.tesla.com
OVERMIND_TIMEOUT_SEC=15

# AMR Hub (local amrtracker instance)
# Dev mode is unauthenticated (amrtracker/backend/src/middleware/auth.ts:9 --
# skips JWT validation when AZURE_TENANT_ID/CLIENT_ID unset). Point Kilroy at
# your locally-running amrtracker on :5000.
AMR_HUB_BASE_URL=http://localhost:5000

# Master Tracker CSV export -- authoritative upstream that amrtracker mirrors.
# Export from SharePoint xlsx to CSV, drop it at a known local path, Kilroy reads it.
# Graph API auto-fetch is Phase 2.
MASTER_TRACKER_CSV_PATH=C:/Users/jocasias/OneDrive - Tesla/AMR TRACKER/master-tracker.csv
```

Rationale: `.env` is the portability boundary. Three blanks (or defaults) and Kilroy is functional. No tokens for v1 -- everything is local or on-corp-network open.

### Install-and-run

```bash
# First-time on any machine
git clone <kilroy-git-url> ~/repos/kilroy
cd ~/repos/kilroy
cp .env.example .env
# Edit .env -- fill Overmind base template, AMR Hub base + token
claude
# Claude opens, reads CLAUDE.md, confirms the operating loop
# In session:
#   > kilroy handoff gftx-cybercab-2m-b3-agv
```

That is the entire install story. No package manager, no service setup, no MCP wiring for v1.

### Repo layout (post-fork)

```
~/repos/kilroy/
├── CLAUDE.md                       # Kilroy identity + operating loop (rewritten from starter-pack)
├── README.md                       # Public-facing "what is Kilroy"
├── .env.example                    # committed
├── .env                            # gitignored
├── .gitignore
├── Skills/
│   ├── Skills.md                   # index
│   ├── skill-creator/              # inherited from starter-pack
│   ├── session-recap/              # inherited from starter-pack
│   ├── fleet-commissioning-handoff/
│   │   └── SKILL.md
│   └── arriving-amr-progress/
│       └── SKILL.md
├── Knowledge/
│   ├── Personal/
│   │   ├── voice.md                # copy of Jordan's voice + Kilroy persona layer
│   │   └── preferences.md          # copy of Jordan's preferences
│   ├── Sources/
│   │   └── overmind-fleets.md      # cached fleet-name list from global_values.yaml
│   └── Lessons/                    # populated by session-recap over time
├── Projects/
│   ├── handoffs/                   # generated handoff packages land here
│   └── progress/                   # per-day gate-progress snapshots
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-07-02-kilroy-design.md   # this file
└── log.md                          # Kilroy's own worklog (not Jordan's vault log)
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Overmind GraphQL auth breaks off-corp | High off-prem | `.env` timeout + explicit error, not silent fail. Kilroy is expected-corp-network for v1. |
| AMR Hub schema drift while it's still being built | High | Kilroy consumes a minimal 5-field surface. On schema change, fix the one query. Documented in the connector doc. |
| Kilroy's Knowledge drifts from Jordan's vault | High over time | Accept it. Kilroy is meant to be portable and self-contained. Sync tools deferred until a second machine actually runs it. |
| Skill sprawl after skill #1 works | Medium | Follow starter-pack anti-pattern. Only add skill #2 when Jordan hits the same manual task 3+ times. |
| Master Tracker CSV export drifts stale | Medium | v1 reads a local CSV file. If Jordan forgets to re-export, output has old `pipelineStatus`. Mitigation: Kilroy checks the file's `mtime` and warns if the CSV is more than 24h old. Phase 2 (Graph API auto-fetch) eliminates this. |
| The "was here" persona feels gimmicky over time | Low | Signature is one line in the handoff template. Delete it if it stops earning its space. |

## Verification of success

1. `~/repos/kilroy/` exists. `claude` opens it. `CLAUDE.md` is read and the operating loop is confirmed.
2. `kilroy handoff gftx-cybercab-2m-b3-agv` produces a real markdown file at `Projects/handoffs/2026-07-<dd>-gftx-cybercab-2m-b3-agv-handoff.md` with populated Overmind, AMR Hub, and Master Tracker fields, plus at least one cross-reference finding (unit in one source and not the other, or a stale-CSV warning).
3. Every open item in the handoff traces to a real source row (Verify step passes).
4. Second-machine test: fresh clone + `.env` fill + same command produces an equivalent artifact within 5 minutes of `git clone`.
5. Jordan hands the handoff doc to one real line-side ops recipient and gets useful feedback.

## Out of scope for this spec (future work)

- Nova/novacode deployment path.
- Sharing Kilroy across a team (multi-user, secrets management beyond `.env`).
- Additional skills: `fleet-triage`, `fleet-status-daily`, `preflight-check-generator`.
- MCP server wiring (Confluence, Jira, SharePoint).
- Cross-fleet handoff (batch multiple fleets in one package).
- Persona expansion beyond the "was here" signature (avatar, intro doc, public post like Atlas's).
- Fill in the truncated third data source and rewire step 4 to use it.

## Decisions locked (2026-07-02)

| Decision | Answer |
|---|---|
| Repo visibility | Private on github.tesla.com as `jocasias/kilroy` (matches `gftx-amr-fleet-tools`). |
| AMR Hub target | Local dev instance at `http://localhost:5000`. Unauthenticated (dev mode per `amrtracker` middleware). |
| Third data source | Sonic AMR Master Tracker CSV export from `$MASTER_TRACKER_CSV_PATH`. |
| 290 schema gap | Ship v1 against the current 4-gate schema. Kilroy reports 290 as the derived "all 4 complete" state. Follow-up PR to add `buyoff290Status` to `amrtracker` is tracked separately, not blocking. |

## Ready to scaffold

All open decisions resolved. On approval, next actions in order:

1. Copy `~/2nd Brain/Projects/agentic-os/starter-pack/` to `~/repos/kilroy/`.
2. Rewrite `CLAUDE.md` as Kilroy's identity + operating loop.
3. Write `.env.example` with the 3 vars above.
4. Write `Skills/fleet-commissioning-handoff/SKILL.md` and `Skills/arriving-amr-progress/SKILL.md` per this doc.
5. Move this design doc from the temporary scaffold location into the forked repo's `docs/superpowers/specs/`.
6. `git init` + first commit + `gh repo create jocasias/kilroy --private --source=. --push`.
