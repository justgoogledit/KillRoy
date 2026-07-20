import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pullOvermindFleetState } from '../lib/overmind.js';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..',
  'Knowledge', 'Sources', 'fixtures', 'overmind-fleet-state.json',
);
const fixtureRaw = readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureRaw);

// Serve a response at every path; returns { template, close }. The template
// embeds {fleet} in the path so substitution is genuinely exercised.
function serveOvermind(handler) {
  const httpd = createServer(handler);
  return new Promise((resolve) => {
    httpd.listen(0, '127.0.0.1', () => {
      const { port } = httpd.address();
      resolve({
        template: `http://127.0.0.1:${port}/fleets/{fleet}`,
        close: () => new Promise((r) => httpd.close(r)),
      });
    });
  });
}

const FLEET = 'gftx-cybercab-2m-b3-agv';

test('full pull: GraphQL envelope response maps every fixture field', async () => {
  let sawPath = null;
  let sawBody = null;
  const srv = await serveOvermind((req, res) => {
    sawPath = req.url;
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      sawBody = raw;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { fleet: fixture } }));
    });
  });
  try {
    const state = await pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET });
    assert.equal(sawPath, `/fleets/${FLEET}/graphql`);
    assert.match(sawBody, /imageTag/);
    assert.equal(state.imageTag, 'v2.24.1.0-42-gbc22f55275');
    assert.equal(state.robotCount, 9);
    assert.equal(state.tracerEventsActive, 3);
    assert.match(state.mfsWiring, /12\/12 stations/);
    assert.equal(state.robotConfigsYamlDelta.length, 3);
    assert.equal(state.fleetId, FLEET);
  } finally {
    await srv.close();
  }
});

test('full pull: flat fixture bytes are accepted (dry-run substitution shape)', async () => {
  const srv = await serveOvermind((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(fixtureRaw);
  });
  try {
    const state = await pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET });
    assert.equal(state.imageTag, 'v2.24.1.0-42-gbc22f55275');
    assert.equal(state.robotCount, 9);
  } finally {
    await srv.close();
  }
});

test('reachability mode: auth-rejected 403 still counts as reachable', async () => {
  const srv = await serveOvermind((req, res) => {
    res.writeHead(403);
    res.end('forbidden');
  });
  try {
    const r = await pullOvermindFleetState({
      baseUrlTemplate: srv.template, fleetId: FLEET, reachabilityOnly: true,
    });
    assert.equal(r.reachable, true);
    assert.equal(r.httpStatus, 403);
  } finally {
    await srv.close();
  }
});

test('reachability mode: network failure throws with the syscall code', async () => {
  const srv = await serveOvermind((req, res) => res.end());
  const deadTemplate = srv.template;
  await srv.close();
  await assert.rejects(
    pullOvermindFleetState({ baseUrlTemplate: deadTemplate, fleetId: FLEET, reachabilityOnly: true }),
    /Overmind unreachable .*ECONNREFUSED/,
  );
});

test('full pull fail loud: non-2xx names the status (auth rejection = expected off corp)', async () => {
  const srv = await serveOvermind((req, res) => {
    res.writeHead(401);
    res.end('unauthorized');
  });
  try {
    await assert.rejects(
      pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET }),
      /HTTP 401 .*corp network/s,
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: GraphQL errors array names the error and the UNVERIFIED query', async () => {
  const srv = await serveOvermind((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ errors: [{ message: 'Cannot query field "fleet"' }] }));
  });
  try {
    await assert.rejects(
      pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET }),
      /Cannot query field .*UNVERIFIED/s,
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: missing required fields are named', async () => {
  const partial = { ...fixture };
  delete partial.imageTag;
  delete partial.mfsWiring;
  const srv = await serveOvermind((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { fleet: partial } }));
  });
  try {
    await assert.rejects(
      pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET }),
      /missing required field\(s\): imageTag, mfsWiring/,
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: unparseable body refuses to guess', async () => {
  const srv = await serveOvermind((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('<html>corp sso redirect</html>');
  });
  try {
    await assert.rejects(
      pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET }),
      /not valid JSON .*Refusing to guess/s,
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: null data.fleet is diagnosed as unknown fleet, not a shape error', async () => {
  const srv = await serveOvermind((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { fleet: null } }));
  });
  try {
    await assert.rejects(
      pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET }),
      (err) => {
        assert.match(err.message, /no fleet data for "gftx-cybercab-2m-b3-agv"/);
        assert.match(err.message, /Unknown fleet id/);
        assert.doesNotMatch(err.message, /missing required field/);
        return true;
      },
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: returned fleetId contradicting the request is refused', async () => {
  const srv = await serveOvermind((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { fleet: { ...fixture, fleetId: 'gftx-ct-door-1m-agv' } } }));
  });
  try {
    await assert.rejects(
      pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET }),
      /returned state for fleet "gftx-ct-door-1m-agv" but "gftx-cybercab-2m-b3-agv" was requested/,
    );
  } finally {
    await srv.close();
  }
});

test('full pull: source omitting fleetId yields null, never an echoed request id', async () => {
  const anonymous = { ...fixture };
  delete anonymous.fleetId;
  const srv = await serveOvermind((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { fleet: anonymous } }));
  });
  try {
    const state = await pullOvermindFleetState({ baseUrlTemplate: srv.template, fleetId: FLEET });
    assert.equal(state.fleetId, null);
    assert.equal(state.requestedFleetId, FLEET);
  } finally {
    await srv.close();
  }
});

test('validation: empty fleetId, missing template, template without {fleet}, bad timeout', async () => {
  await assert.rejects(
    pullOvermindFleetState({ baseUrlTemplate: 'http://x/{fleet}', fleetId: '' }),
    /fleetId must be a non-empty string/,
  );
  await assert.rejects(
    pullOvermindFleetState({ baseUrlTemplate: '', fleetId: FLEET }),
    /OVERMIND_BASE_URL_TEMPLATE is not set/,
  );
  await assert.rejects(
    pullOvermindFleetState({ baseUrlTemplate: 'https://overmind.example.com', fleetId: FLEET }),
    /no \{fleet\} placeholder/,
  );
  await assert.rejects(
    pullOvermindFleetState({ baseUrlTemplate: 'http://x/{fleet}', fleetId: FLEET, timeoutSec: 'fast' }),
    /OVERMIND_TIMEOUT_SEC is not a positive number/,
  );
});
