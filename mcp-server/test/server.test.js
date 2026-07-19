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

test('server: lists exactly the amr_hub_get_units tool', async () => {
  const mcp = startMcp('/nonexistent/.env');
  try {
    await mcp.handshake();
    mcp.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const { result } = await mcp.recv();
    assert.deepEqual(result.tools.map((t) => t.name), ['amr_hub_get_units']);
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
