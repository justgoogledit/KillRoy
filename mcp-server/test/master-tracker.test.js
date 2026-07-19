import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { readMasterTracker } from '../lib/master-tracker.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..',
  'Knowledge', 'Sources', 'fixtures',
);
const freshCsv = join(fixturesDir, 'master-tracker.csv');
const staleCsv = join(fixturesDir, 'master-tracker-stale.csv');

const OK_THRESHOLD = '24';

test('reads the real fixture: 13 rows, comment banner skipped, fields keyed by header', () => {
  const r = readMasterTracker({ csvPath: freshCsv, staleWarnHours: OK_THRESHOLD });
  assert.equal(r.totalRowCount, 13);
  assert.deepEqual(r.header.slice(0, 3), ['unitId', 'pipelineStatus', 'etaAtFactory']);
  const t51 = r.rows.find((row) => row.unitId === 'T3L2_051');
  assert.equal(t51.pipelineStatus, 'In-transit');
  // The cross-reference edge case: T3L2_047 is hub-only, so NOT in the CSV.
  assert.equal(r.rows.find((row) => row.unitId === 'T3L2_047'), undefined);
});

test('projectIdentifier filter keeps matching rows and reports both counts', () => {
  const match = readMasterTracker({
    csvPath: freshCsv, staleWarnHours: OK_THRESHOLD, projectIdentifier: 'gftx-cybercab-2m-b3-agv',
  });
  assert.equal(match.rowCount, 13);
  const none = readMasterTracker({
    csvPath: freshCsv, staleWarnHours: OK_THRESHOLD, projectIdentifier: 'gftx-kyle-2r-seats-agv',
  });
  assert.equal(none.rowCount, 0);
  assert.equal(none.totalRowCount, 13);
});

test('staleness: fresh mtime -> stale false; 48h-old mtime -> stale true with ageHours', () => {
  const now = Date.now();
  utimesSync(freshCsv, new Date(now), new Date(now));
  const fresh = readMasterTracker({ csvPath: freshCsv, staleWarnHours: OK_THRESHOLD, now });
  assert.equal(fresh.stale, false);
  assert.equal(fresh.ageHours, 0);

  const twoDaysAgo = new Date(now - 48 * 3600000);
  utimesSync(staleCsv, twoDaysAgo, twoDaysAgo);
  const stale = readMasterTracker({ csvPath: staleCsv, staleWarnHours: OK_THRESHOLD, now });
  assert.equal(stale.stale, true);
  assert.equal(stale.ageHours, 48);
  // Stale is a WARN-grade flag: the rows still came back in full.
  assert.equal(stale.totalRowCount, 13);
});

test('fail loud: missing file, missing path var, bad threshold, blank filter', () => {
  assert.throws(
    () => readMasterTracker({ csvPath: '/nonexistent/tracker.csv', staleWarnHours: OK_THRESHOLD }),
    /Master Tracker CSV not found or unreadable .*ENOENT/,
  );
  assert.throws(
    () => readMasterTracker({ csvPath: '', staleWarnHours: OK_THRESHOLD }),
    /MASTER_TRACKER_CSV_PATH is not set/,
  );
  assert.throws(
    () => readMasterTracker({ csvPath: freshCsv, staleWarnHours: 'soon' }),
    /MASTER_TRACKER_STALE_WARN_HOURS is not a positive number: "soon"/,
  );
  assert.throws(
    () => readMasterTracker({ csvPath: freshCsv, staleWarnHours: OK_THRESHOLD, projectIdentifier: ' ' }),
    /projectIdentifier, when provided, must be a non-empty string/,
  );
});

test('fail loud: empty and header-only-comment files refuse to guess', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kilroy-csv-'));
  const empty = join(dir, 'empty.csv');
  writeFileSync(empty, '');
  assert.throws(
    () => readMasterTracker({ csvPath: empty, staleWarnHours: OK_THRESHOLD }),
    /no header row/,
  );
  const onlyComments = join(dir, 'comments.csv');
  writeFileSync(onlyComments, '# banner line\n# another\n');
  assert.throws(
    () => readMasterTracker({ csvPath: onlyComments, staleWarnHours: OK_THRESHOLD }),
    /no header row/,
  );
});

test('quoted fields: commas and escaped quotes inside quotes parse correctly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kilroy-csv-'));
  const p = join(dir, 'quoted.csv');
  writeFileSync(
    p,
    'unitId,note,projectIdentifier\nT3L2_001,"backorder, vendor says ""Q3""",fleet-a\n',
  );
  const r = readMasterTracker({ csvPath: p, staleWarnHours: OK_THRESHOLD });
  assert.equal(r.rows[0].note, 'backorder, vendor says "Q3"');
  assert.equal(r.rows[0].projectIdentifier, 'fleet-a');
});
