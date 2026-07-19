import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

// End-to-end coverage of server.js itself -- the tool-list surface, argument
// plumbing, and both .env failure modes -- over real stdio JSON-RPC, so a
// breaking typo in the handler can't survive npm test. KILROY_ENV_PATH points
// the spawned server at temp .env files; the repo root is never touched.

const serverPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'server.js');
const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..',
  'Knowledge', 'Sources', 'fixtures', 'amr-hub-response.json',
);

function startMcp(envPath) {
  const proc = spawn('node', [serverPath], {
    env: { ...process.env, KILROY_ENV_PATH: envPath },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const lines = createInterface({ input: proc.stdout });
  const pending = [];
  const waiting = [];
  lines.on('line', (line) => {
    const msg = JSON.parse(line);
    const next = waiting.shift();
    if (next) next(msg);
    else pending.push(msg);
  });
  const recv = () =>
    new Promise((resolve) => {
      const msg = pending.shift();
      if (msg) resolve(msg);
      else waiting.push(resolve);
    });
  const send = (obj) => proc.stdin.write(`${JSON.stringify(obj)}\n`);

  return {
    proc,
    send,
    recv,
    async handshake() {
      send({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
      });
      await recv();
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    },
    async callTool(id, name, args) {
      send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
      return recv();
    },
    stop: () => proc.kill(),
  };
}

function serveFixture() {
  const body = readFileSync(fixturePath);
  const httpd = createServer((req, res) => {
    res.writeHead(req.url === '/api/amrs' ? 200 : 404, { 'content-type': 'application/json' });
    res.end(req.url === '/api/amrs' ? body : undefined);
  });
  return new Promise((resolve) => {
    httpd.listen(0, '127.0.0.1', () =>
      resolve({ port: httpd.address().port, close: () => new Promise((r) => httpd.close(r)) }),
    );
  });
}

test('server: lists exactly the three connector tools', async () => {
  const mcp = startMcp('/nonexistent/.env');
  try {
    await mcp.handshake();
    mcp.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const { result } = await mcp.recv();
    assert.deepEqual(
      result.tools.map((t) => t.name).sort(),
      ['amr_hub_get_units', 'master_tracker_get_rows', 'overmind_get_fleet_state'],
    );
  } finally {
    mcp.stop();
  }
});

test('server: overmind reachability + full-pull plumbing works end to end', async () => {
  const fixture = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'Knowledge', 'Sources', 'fixtures', 'overmind-fleet-state.json'),
    'utf8',
  );
  const httpd = createServer((req, res) => {
    if (req.url.endsWith('/graphql')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { fleet: JSON.parse(fixture) } }));
    } else {
      res.writeHead(403); // reachability probe hits the base URL; auth-rejected is fine
      res.end();
    }
  });
  await new Promise((r) => httpd.listen(0, '127.0.0.1', r));
  const { port } = httpd.address();
  const envFile = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(envFile, `OVERMIND_BASE_URL_TEMPLATE=http://127.0.0.1:${port}/fleets/{fleet}\n`);
  const mcp = startMcp(envFile);
  try {
    await mcp.handshake();

    const probe = await mcp.callTool(10, 'overmind_get_fleet_state', {
      fleetId: 'gftx-cybercab-2m-b3-agv', reachabilityOnly: true,
    });
    const probeData = JSON.parse(probe.result.content[0].text);
    assert.equal(probeData.reachable, true);
    assert.equal(probeData.httpStatus, 403);

    const full = await mcp.callTool(11, 'overmind_get_fleet_state', { fleetId: 'gftx-cybercab-2m-b3-agv' });
    assert.ok(!full.result.isError);
    const state = JSON.parse(full.result.content[0].text);
    assert.equal(state.imageTag, 'v2.24.1.0-42-gbc22f55275');
    assert.equal(state.robotCount, 9);

    const noFleet = await mcp.callTool(12, 'overmind_get_fleet_state', {});
    assert.equal(noFleet.result.isError, true);
    assert.match(noFleet.result.content[0].text, /fleetId must be a non-empty string/);

    // A string "true" must be rejected, not silently run the full pull.
    const stringTrue = await mcp.callTool(13, 'overmind_get_fleet_state', {
      fleetId: 'gftx-cybercab-2m-b3-agv', reachabilityOnly: 'true',
    });
    assert.equal(stringTrue.result.isError, true);
    assert.match(stringTrue.result.content[0].text, /reachabilityOnly, when provided, must be a boolean/);
  } finally {
    mcp.stop();
    await new Promise((r) => httpd.close(r));
  }
});

test('server: master tracker plumbing works end to end (rows, staleness, filter, bad threshold)', async () => {
  const fixtureCsv = join(
    dirname(fileURLToPath(import.meta.url)), '..', '..', 'Knowledge', 'Sources', 'fixtures', 'master-tracker.csv',
  );
  const envFile = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(
    envFile,
    `MASTER_TRACKER_CSV_PATH=${fixtureCsv}\nMASTER_TRACKER_STALE_WARN_HOURS=24\n`,
  );
  const mcp = startMcp(envFile);
  try {
    await mcp.handshake();
    const all = await mcp.callTool(20, 'master_tracker_get_rows', {});
    assert.ok(!all.result.isError);
    const data = JSON.parse(all.result.content[0].text);
    assert.equal(data.totalRowCount, 13);
    assert.equal(typeof data.stale, 'boolean');
    assert.equal(data.staleWarnHours, 24);

    const filtered = await mcp.callTool(21, 'master_tracker_get_rows', {
      projectIdentifier: 'gftx-kyle-2r-seats-agv',
    });
    const fData = JSON.parse(filtered.result.content[0].text);
    assert.equal(fData.rowCount, 0);
    assert.equal(fData.totalRowCount, 13);
  } finally {
    mcp.stop();
  }

  const badEnv = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(badEnv, `MASTER_TRACKER_CSV_PATH=${fixtureCsv}\nMASTER_TRACKER_STALE_WARN_HOURS=soon\n`);
  const mcp2 = startMcp(badEnv);
  try {
    await mcp2.handshake();
    const { result } = await mcp2.callTool(22, 'master_tracker_get_rows', {});
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /MASTER_TRACKER_STALE_WARN_HOURS is not a positive number: "soon"/);
  } finally {
    mcp2.stop();
  }
});

test('server: bad OVERMIND_TIMEOUT_SEC in .env fails loud, never a silent default', async () => {
  const envFile = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(
    envFile,
    'OVERMIND_BASE_URL_TEMPLATE=http://127.0.0.1:9/fleets/{fleet}\nOVERMIND_TIMEOUT_SEC=fast\n',
  );
  const mcp = startMcp(envFile);
  try {
    await mcp.handshake();
    const { result } = await mcp.callTool(14, 'overmind_get_fleet_state', {
      fleetId: 'gftx-cybercab-2m-b3-agv', reachabilityOnly: true,
    });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /OVERMIND_TIMEOUT_SEC is not a positive number: "fast"/);
  } finally {
    mcp.stop();
  }
});

test('server: missing .env returns isError with the cp instruction, never data', async () => {
  const mcp = startMcp('/nonexistent/definitely/.env');
  try {
    await mcp.handshake();
    const { result } = await mcp.callTool(3, 'amr_hub_get_units', {});
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /\.env not found/);
    assert.match(result.content[0].text, /cp \.env\.example \.env/);
  } finally {
    mcp.stop();
  }
});

test('server: happy path through a temp .env returns all 13 fixture units', async () => {
  const srv = await serveFixture();
  const envFile = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(envFile, `AMR_HUB_BASE_URL=http://127.0.0.1:${srv.port}\n`);
  const mcp = startMcp(envFile);
  try {
    await mcp.handshake();
    const { result } = await mcp.callTool(4, 'amr_hub_get_units', {});
    assert.ok(!result.isError);
    const data = JSON.parse(result.content[0].text);
    assert.equal(data.unitCount, 13);
    assert.equal(data.units.find((u) => u.unitId === 'T3L2_050').buyoff250Status, null);
  } finally {
    mcp.stop();
    await srv.close();
  }
});

test('server: fleetId argument reaches the filter (counts prove it)', async () => {
  const srv = await serveFixture();
  const envFile = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(envFile, `AMR_HUB_BASE_URL=http://127.0.0.1:${srv.port}\n`);
  const mcp = startMcp(envFile);
  try {
    await mcp.handshake();
    const { result } = await mcp.callTool(5, 'amr_hub_get_units', { fleetId: 'gftx-kyle-2r-seats-agv' });
    const data = JSON.parse(result.content[0].text);
    assert.equal(data.unitCount, 0);
    assert.equal(data.totalUnitCount, 13);
    assert.equal(data.fleetId, 'gftx-kyle-2r-seats-agv');
  } finally {
    mcp.stop();
    await srv.close();
  }
});

test('server: empty-string fleetId is rejected, not silently widened to all units', async () => {
  const srv = await serveFixture();
  const envFile = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(envFile, `AMR_HUB_BASE_URL=http://127.0.0.1:${srv.port}\n`);
  const mcp = startMcp(envFile);
  try {
    await mcp.handshake();
    const { result } = await mcp.callTool(6, 'amr_hub_get_units', { fleetId: '' });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /fleetId, when provided, must be a non-empty string/);
  } finally {
    mcp.stop();
    await srv.close();
  }
});

test('server: pull failure surfaces as isError FAIL text, never an empty result', async () => {
  // A just-freed ephemeral port: guaranteed refusable, unlike low ports that
  // some sandboxes reject with other codes.
  const srv = await serveFixture();
  const deadPort = srv.port;
  await srv.close();
  const envFile = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(envFile, `AMR_HUB_BASE_URL=http://127.0.0.1:${deadPort}\n`);
  const mcp = startMcp(envFile);
  try {
    await mcp.handshake();
    const { result } = await mcp.callTool(7, 'amr_hub_get_units', {});
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /^FAIL: AMR Hub unreachable/);
    assert.match(result.content[0].text, /ECONNREFUSED/);
  } finally {
    mcp.stop();
  }
});
