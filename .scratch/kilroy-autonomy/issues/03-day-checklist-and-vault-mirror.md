# 03 — Day checklist generator + Obsidian vault mirror

Blockers: 01, 02. Blocks: 07.

Two pieces, both consumed by the morning phase:

**Checklist generator** (lives in run-daily-workflow's morning phase steps):
- Input: gathered assignments + mentions from ticket 02's morning phase.
- Tier rules (static, tunable via weekly reflection):
  - Tier 1 — assigned tasks from Teams + Loop
  - Tier 2 — AMR repairs + commissioning work
  - Tier 3 — assigned tasks, no due date
  - Tier 4 — mentions needing a reply
  - Tier 5 — FYI / light admin (end of day)
- Ties within tier: due date, then age.
- Output: markdown checkbox list in the day's brief, heavy-first ordering, each item
  citing its source (chat/task link or id).
- Tier rules documented in one place the reflection step can point at when proposing
  changes (a `## Tier rules` section in the skill, not scattered prose).

**Vault mirror:**
- All daily outputs (brief, checklist, deltas, close-out) written to `Projects/daily/`
  (authoritative) AND mirrored to `$OBSIDIAN_VAULT_PATH/<subfolder>` when the env var is
  set. Var absent → skip mirror with a note in the marker, not an error (Mac dev runs
  won't have it).
- `OBSIDIAN_VAULT_PATH` added to `.env.example` with comment. Never hardcoded.

Acceptance:
- Fixture dry-run: synthetic assignment/mention set produces correctly tier-ordered
  checklist (verify-fixtures pairing added).
- Mirror behavior verified both with and without the env var set.
