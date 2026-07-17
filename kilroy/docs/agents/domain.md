# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**Note on this repo's layout:** the true git root is one level above `kilroy/` (a stray top-level `README.md` sits there -- see the open thread in `Knowledge/Lessons/2026-07-17-session-start-hook.md`). Everywhere below, "repo root" means `kilroy/`, not the true git root -- that's where `CLAUDE.md` and the rest of Kilroy's own three-folder framework (`Skills/`, `Knowledge/`, `Projects/`) already live, and where this setup skill's own config landed.

## Before exploring, read these

- **`CONTEXT.md`** at `kilroy/`, or
- **`CONTEXT-MAP.md`** at `kilroy/` if it exists -- it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** (i.e. `kilroy/docs/adr/`) -- read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (this one -- no monorepo signals found: no `pnpm-workspace.yaml`, no `package.json` workspaces field, no populated `packages/*`):

```
kilroy/
├── CLAUDE.md
├── CONTEXT.md              (created lazily by /domain-modeling)
├── docs/
│   ├── adr/                (created lazily)
│   ├── agents/              <- this skill's output
│   └── superpowers/specs/   <- Kilroy's own design docs, pre-existing
├── Skills/
├── Knowledge/
└── Projects/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

For this repo specifically, also check `Knowledge/Sources/2026-07-02-pc-amr-gates.md` (the buyoff-gate ownership map) and `docs/superpowers/specs/2026-07-02-kilroy-design.md` (the founding design doc) -- these predate `CONTEXT.md` and already define the domain vocabulary (buyoff gates, fleet ids, the gate-ownership map). Don't duplicate or contradict them; `/domain-modeling` should treat them as existing sources to fold in, not overwrite.

If the concept you need isn't in the glossary yet, that's a signal -- either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) -- but worth reopening because..._
