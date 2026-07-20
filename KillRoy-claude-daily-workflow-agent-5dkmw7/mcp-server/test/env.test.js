import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { loadEnv } from '../lib/env.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('parses the real .env.example, preserving the unquoted-space CSV path', () => {
  const env = loadEnv(join(repoRoot, '.env.example'));
  assert.ok(env, '.env.example must exist and parse');
  assert.equal(env.AMR_HUB_BASE_URL, 'http://localhost:5000');
  // The value this parser exists for: an unquoted space that breaks naive `source`.
  assert.equal(
    env.MASTER_TRACKER_CSV_PATH,
    'C:/Users/jocasias/OneDrive - Tesla/AMR TRACKER/master-tracker.csv',
  );
  // Comment lines and blank lines never become keys.
  assert.ok(!Object.keys(env).some((k) => k.startsWith('#')));
});

test('returns null for a missing file (caller fails loud, not this layer)', () => {
  assert.equal(loadEnv('/nonexistent/definitely-not-here/.env'), null);
});

test('takes values verbatim after the first = and skips malformed lines', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kilroy-env-'));
  const p = join(dir, '.env');
  writeFileSync(
    p,
    ['A=1=2', 'B=', '  # comment', 'no_equals_line', '=nokey', 'C=has trailing space ', ''].join('\n'),
  );
  const env = loadEnv(p);
  assert.equal(env.A, '1=2');
  assert.equal(env.B, '');
  assert.equal(env.C, 'has trailing space ');
  assert.ok(!('no_equals_line' in env));
  assert.ok(!('' in env));
});
