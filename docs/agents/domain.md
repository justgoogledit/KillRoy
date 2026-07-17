# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists -- it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** -- read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (this one -- no monorepo signals found: no `pnpm-workspace.yaml`, no `package.json` workspaces field, no populated `packages/*`):

```
/
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
