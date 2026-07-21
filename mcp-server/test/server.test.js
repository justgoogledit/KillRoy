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

test('server: lists exactly the one remaining connector tool', async () => {
  const mcp = startMcp('/nonexistent/.env');
  try {
    await mcp.handshake();
    mcp.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const { result } = await mcp.recv();
    assert.deepEqual(
      result.tools.map((t) => t.name),
      ['overmind_get_fleet_state'],
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
    const { result } = await mcp.callTool(3, 'overmind_get_fleet_state', { fleetId: 'gftx-cybercab-2m-b3-agv' });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /\.env not found/);
    assert.match(result.content[0].text, /cp \.env\.example \.env/);
  } finally {
    mcp.stop();
  }
});

test('server: pull failure surfaces as isError FAIL text, never an empty result', async () => {
  // A just-freed ephemeral port: guaranteed refusable, unlike low ports that
  // some sandboxes reject with other codes.
  const httpd = createServer(() => {});
  await new Promise((r) => httpd.listen(0, '127.0.0.1', r));
  const deadPort = httpd.address().port;
  await new Promise((r) => httpd.close(r));
  const envFile = join(mkdtempSync(join(tmpdir(), 'kilroy-mcp-')), '.env');
  writeFileSync(envFile, `OVERMIND_BASE_URL_TEMPLATE=http://127.0.0.1:${deadPort}/fleets/{fleet}\n`);
  const mcp = startMcp(envFile);
  try {
    await mcp.handshake();
    const { result } = await mcp.callTool(7, 'overmind_get_fleet_state', { fleetId: 'gftx-cybercab-2m-b3-agv' });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /^FAIL: /);
  } finally {
    mcp.stop();
  }
});
