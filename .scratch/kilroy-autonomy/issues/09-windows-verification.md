# 09 — Windows verification (green checklist)

Blockers: 07, 08. Blocks: nothing — this closes the effort.

Runs ON the work PC across ~1 week of real workdays. Working through the spec's
"Definition of done":

- [ ] 1. `cd mcp-server && npm test` green (post-consolidation).
- [ ] 2. `verify-fixtures` — all documented pairings pass.
- [ ] 3. `kilroy check` green on work PC.
- [ ] 4. Supervised bootstrap run done; permission list captured; scoped allowlist built
       (bootstrap doc steps 8–9).
- [ ] 5. One full unattended day: all four scheduled runs fire, each produces status
       marker + journal line + repo/vault outputs.
- [ ] 6. One approved Confluence post lands: correct day row, page otherwise untouched,
       confirm with Jordan/teammate that no watcher notification fired (never yet
       observed, only inferred).
- [ ] 7. Loop path resolved; UNVERIFIED markers removed from triage-personal-items.
- [ ] 8. Day checklist correctly tier-ordered against real data (Jordan eyeballs one
       morning's checklist vs the tier rules).
- [ ] 9. First Thursday reflection produces an improvement draft with evidence.

Each item checked off here with date + evidence pointer (marker file, journal line,
screenshot, or Jordan's confirmation). When all nine are checked: write closing lesson,
mark this ticket done, effort complete.
