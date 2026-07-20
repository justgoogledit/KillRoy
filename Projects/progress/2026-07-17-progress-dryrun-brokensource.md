> DRY-RUN ARTIFACT -- SYNTHETIC FIXTURE DATA. Execution test of Kilroy's fail-loud behavior when
> the AMR Hub source is unreachable/malformed. See `Knowledge/Sources/fixtures/README.md`.

# Fail-loud test -- `arriving-amr-progress` against a broken AMR Hub response -- 2026-07-17

## What was run

`kilroy progress gftx-cybercab-2m-b3-agv`, with `Knowledge/Sources/fixtures/amr-hub-response-broken.json` substituted for a live `GET $AMR_HUB_BASE_URL/api/amrs` call (step 1 of `arriving-amr-progress`).

## What happened

Step 1 of the skill requires reading the AMR Hub response before anything else can run. Attempting to parse `amr-hub-response-broken.json` as JSON fails:

```
$ python3 -c "import json; json.load(open('Knowledge/Sources/fixtures/amr-hub-response-broken.json'))"
JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

Confirmed this isn't just the fixture's leading comment lines masking a parseable body -- stripping those and parsing the remaining JSON still fails, on the truncated `"buyoff280Status": "Compl` string:

```
Invalid control character at: line 13 column 32 (char 382)
```

So the failure is real and unavoidable by any reasonable JSON parser, matching the "connection cut / proxy error mid-response" failure mode the fixture is meant to simulate.

## Result

Per `CLAUDE.md`'s non-negotiable ("Fail loud, never default to safe... If AMR Hub... is unreachable or returns an incomplete field for a unit, say so and exclude that unit from `production-ready` counts. Never let a missing or errored field silently resolve to `Complete`"), the correct behavior is:

- **Stop before step 2.** No gate board can be bucketed from an unparseable source.
- **Report the failure explicitly**, e.g.:

  > Kilroy could not reach the AMR Hub. The response at `$AMR_HUB_BASE_URL/api/amrs` did not parse as valid JSON (error: unterminated string / invalid control character). No gate-progress board was produced. This is not a zero-unit fleet -- the source is unreadable. Check that `amrtracker` is running at `$AMR_HUB_BASE_URL` and retry.

- **Do not** produce a board showing `0 units`, `production-ready: 0`, or any other value that looks like real output. A silent-zero result is indistinguishable from "the fleet genuinely has 0 units incoming," which is the exact failure mode `CLAUDE.md` calls out as unacceptable -- it would read to Jordan as real data.

## Verify

- **Confirmed this is a hard failure, not a degraded-but-plausible one.** A parser that silently recovered a partial/empty unit list here would be the actual bug -- checked that Python's stdlib `json` module (representative of what a normal read/parse step would use) refuses the file outright rather than returning `[]` or a partial structure.
- **No fabricated output was produced.** This file documents the refusal; it does not contain a fake gate board.

## Finding

None of Kilroy's three skills (`arriving-amr-progress`, `fleet-commissioning-handoff`, `run-daily-workflow`) currently spell out **where** to render an unreachable-source failure -- `CLAUDE.md` states the non-negotiable but the skills' `## Steps` and `## Output template` sections assume a successful read and jump straight to bucketing/rendering. Recommend each skill's Steps section gain an explicit "Step 0: confirm the source parsed/responded before proceeding; if not, stop and report per `CLAUDE.md`'s fail-loud rule" -- see follow-up commit for `arriving-amr-progress` (the one this test exercised). The same gap likely exists in the other two skills; flagged for the same fix if a future session hits it, per session-recap's drift-detection threshold (3rd recurrence).
