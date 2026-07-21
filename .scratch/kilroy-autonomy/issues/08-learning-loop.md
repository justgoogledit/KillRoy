# 08 — Learning loop: run journal + Thursday reflection

Blockers: 01, 02. Blocks: 09.

**Run journal:**
- Every autonomous phase appends one line to `Projects/daily/runs/journal.jsonl`:
  `{ "date": "YYYY-MM-DD", "phase": "morning|delta|closeout", "sources": {...same map
  as status marker...}, "itemsSurfaced": <n>, "checklistItems": <n>, "durationSeconds":
  <n>, "anomalies": ["<string>"] }`.
- Journal is append-only; nothing rewrites history.

**Thursday reflection (closeout phase, Thursdays only):**
- Reads the week's journal lines + any new `Knowledge/Lessons/` entries + the current
  day-checklist tier rules.
- Looks for: recurring source failures, noisy sources (surfaced but never acted on),
  checklist reorderings Jordan made (diff between generated checklist and its final
  checked/edited state in `Projects/daily/`), timing drift.
- Output: `Knowledge/Lessons/YYYY-MM-DD-weekly-reflection.md` — observations plus
  concrete improvement PROPOSALS (tier-rule tweaks, filter changes, skill-text edits)
  written as drafts for Jordan's approval. The reflection NEVER edits skills, hooks,
  CLAUDE.md, or settings itself — "no silent edits" applies with extra force unattended.
- Approved proposals get applied later, interactively, via the normal skill-creator
  process.

Acceptance:
- Journal line written by every phase in fixture dry-runs; schema stable.
- Reflection dry-run against a synthetic week of journal lines produces a draft with at
  least the required sections (observations, proposals, evidence citations).
- Grep confirms reflection step has no Edit/Write targets outside `Knowledge/Lessons/`.
