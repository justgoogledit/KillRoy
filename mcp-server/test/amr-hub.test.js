import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pullAmrUnits } from '../lib/amr-hub.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'Knowledge',
  'Sources',
  'fixtures',
);

// Serve raw bytes at /api/amrs on an ephemeral port; returns { baseUrl, close }.
// Real HTTP end to end -- the tool's fetch, timeout, and parse paths all run for real.
function serveBody(body, { status = 200 } = {}) {
  const server = createServer((req, res) => {
    if (req.url === '/api/amrs') {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(body);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

const happyBody = readFileSync(join(fixturesDir, 'amr-hub-response.json'), 'utf8');
const brokenBody = readFileSync(join(fixturesDir, 'amr-hub-response-broken.json'), 'utf8');

test('happy path: returns all 13 fixture units with gate fields intact', async () => {
  const srv = await serveBody(happyBody);
  try {
    const result = await pullAmrUnits({ baseUrl: srv.baseUrl });
    assert.equal(result.unitCount, 13);
    assert.equal(result.totalUnitCount, 13);
    assert.equal(result.fleetId, null);

    const ids = result.units.map((u) => u.unitId);
    assert.ok(ids.includes('T3L2_038'));
    assert.ok(ids.includes('T3L2_050'));

    const ready = result.units.find((u) => u.unitId === 'T3L2_038');
    assert.equal(ready.buyoff220Status, 'Complete');
    assert.equal(ready.buyoff280Status, 'Complete');

    const blocked = result.units.find((u) => u.unitId === 'T3L2_049');
    assert.equal(blocked.buyoff220BlockedReason, 'IPC replacement part on backorder, network config blocked');
  } finally {
    await srv.close();
  }
});

test('null gate fields pass through untouched (T3L2_050 edge case)', async () => {
  const srv = await serveBody(happyBody);
  try {
    const result = await pullAmrUnits({ baseUrl: srv.baseUrl });
    const edge = result.units.find((u) => u.unitId === 'T3L2_050');
    // Must be literal null -- not undefined, not 'Complete', not dropped.
    // The skills' Data-quality-flag handling depends on seeing the null.
    assert.equal(edge.buyoff250Status, null);
    assert.ok('buyoff250Status' in edge);
  } finally {
    await srv.close();
  }
});

test('fleetId filter keeps matching units and reports both counts', async () => {
  const srv = await serveBody(happyBody);
  try {
    const match = await pullAmrUnits({ baseUrl: srv.baseUrl, fleetId: 'gftx-cybercab-2m-b3-agv' });
    assert.equal(match.unitCount, 13);
    assert.equal(match.fleetId, 'gftx-cybercab-2m-b3-agv');

    const none = await pullAmrUnits({ baseUrl: srv.baseUrl, fleetId: 'gftx-kyle-2r-seats-agv' });
    assert.equal(none.unitCount, 0);
    // totalUnitCount lets a caller distinguish "filter matched nothing" from "Hub is empty".
    assert.equal(none.totalUnitCount, 13);
  } finally {
    await srv.close();
  }
});

test('fail loud: deliberately-broken fixture body rejects, never an empty list', async () => {
  const srv = await serveBody(brokenBody);
  try {
    await assert.rejects(
      pullAmrUnits({ baseUrl: srv.baseUrl }),
      (err) => {
        assert.match(err.message, /not valid JSON/);
        assert.match(err.message, /Refusing to guess/);
        return true;
      },
    );
  } finally {
    await srv.close();
  }
});

test('fail loud: non-2xx rejects with the status named', async () => {
  const srv = await serveBody('server error', { status: 500 });
  try {
    await assert.rejects(pullAmrUnits({ baseUrl: srv.baseUrl }), /HTTP 500/);
  } finally {
    await srv.close();
  }
});

test('fail loud: valid JSON with no amrs array rejects (shape check)', async () => {
  const srv = await serveBody('{"somethingElse": []}');
  try {
    await assert.rejects(pullAmrUnits({ baseUrl: srv.baseUrl }), /no "amrs" array/);
  } finally {
    await srv.close();
  }
});

test('bare-array body is accepted (schema-simplification tolerance)', async () => {
  const srv = await serveBody('[{"unitId": "T3L2_001", "fleetId": "f"}]');
  try {
    const result = await pullAmrUnits({ baseUrl: srv.baseUrl });
    assert.equal(result.unitCount, 1);
  } finally {
    await srv.close();
  }
});

test('fail loud: connection refused rejects with "unreachable"', async () => {
  const srv = await serveBody('{}');
  const deadBase = srv.baseUrl;
  await srv.close();
  await assert.rejects(pullAmrUnits({ baseUrl: deadBase }), /unreachable/);
});

test('fail loud: missing baseUrl rejects immediately, pointing at .env', async () => {
  await assert.rejects(pullAmrUnits({ baseUrl: '' }), /AMR_HUB_BASE_URL is not set/);
});

test('fail loud: timeout rejects as unreachable rather than hanging', async () => {
  const server = createServer(() => {
    /* accept and never respond */
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  try {
    await assert.rejects(
      pullAmrUnits({ baseUrl: `http://127.0.0.1:${port}`, timeoutMs: 200 }),
      /unreachable/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
