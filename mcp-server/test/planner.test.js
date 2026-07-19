import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pullPlannerTasks } from '../lib/planner.js';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..',
  'Knowledge', 'Sources', 'fixtures', 'planner-tasks-response.json',
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));

const JORDAN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const PLAN_A = 'FIXTURE-planId-8xQg5FS2LkCpPLNA';
const PLAN_B = 'FIXTURE-planId-8xQg5FS2LkCpPLNB';
// The fixture's baked-in reference date (see fixtures/README.md); midday UTC
// keeps this comfortably inside the America/Chicago 2026-07-18 calendar day.
const TODAY_MS = Date.parse('2026-07-18T12:00:00Z');

// Serves a minimal stand-in for the three real Graph endpoints the tool
// calls: the AAD token endpoint, /me, and per-plan title + tasks. Task data
// is sliced straight out of the real fixture file by planId, so the tests
// exercise the tool against the same data planner-tasks-response.json ships,
// just split the way the real (multi-call) Graph API actually returns it
// rather than the single bundled convenience blob the fixture documents
// itself as (see that file's own "_note" field).
function serveGraph({ tokenStatus = 200, tokenError = null, meStatus = 200 } = {}) {
  const byPlan = {
    [PLAN_A]: fixture.value.filter((t) => t.planId === PLAN_A),
    [PLAN_B]: fixture.value.filter((t) => t.planId === PLAN_B),
  };
  const httpd = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname.endsWith('/oauth2/v2.0/token')) {
      res.writeHead(tokenStatus, { 'content-type': 'application/json' });
      res.end(tokenStatus === 200
        ? JSON.stringify({ access_token: 'fixture-token', token_type: 'Bearer', expires_in: 3600 })
        : JSON.stringify({ error: 'invalid_client', error_description: tokenError ?? 'bad secret' }));
      return;
    }
    if (url.pathname === '/v1.0/me') {
      res.writeHead(meStatus, { 'content-type': 'application/json' });
      res.end(meStatus === 200 ? JSON.stringify({ id: JORDAN }) : JSON.stringify({ error: 'forbidden' }));
      return;
    }
    const tasksMatch = url.pathname.match(/^\/v1\.0\/planner\/plans\/([^/]+)\/tasks$/);
    if (tasksMatch) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ value: byPlan[tasksMatch[1]] ?? [] }));
      return;
    }
    const planMatch = url.pathname.match(/^\/v1\.0\/planner\/plans\/([^/]+)$/);
    if (planMatch) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ title: fixture.plans[planMatch[1]] }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => {
    httpd.listen(0, '127.0.0.1', () => {
      const { port } = httpd.address();
      resolve({
        graphBaseUrl: `http://127.0.0.1:${port}/v1.0`,
        tokenUrlBase: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => httpd.close(r)),
      });
    });
  });
}

test('full pull with GRAPH_API_USER_OBJECT_ID override: due-today tasks grouped by plan, wrong-assignee and future tasks excluded, null-due-date flagged', async () => {
  const srv = await serveGraph();
  try {
    const result = await pullPlannerTasks({
      tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
      planIdsRaw: `${PLAN_A},${PLAN_B}`,
      userObjectId: JORDAN,
      graphBaseUrl: srv.graphBaseUrl,
      tokenUrlBase: srv.tokenUrlBase,
      now: TODAY_MS,
    });
    assert.equal(result.userObjectId, JORDAN);
    assert.equal(result.userObjectIdSource, 'override');
    assert.equal(result.today, '2026-07-18');
    assert.equal(result.taskCount, 2);

    const ids = result.groups.flatMap((g) => g.tasks.map((t) => t.id)).sort();
    assert.deepEqual(ids, ['FIXTURE-taskId-0001', 'FIXTURE-taskId-0005']);

    const planA = result.groups.find((g) => g.planId === PLAN_A);
    assert.equal(planA.planName, 'MFA Controls -- Daily Ops');
    const planB = result.groups.find((g) => g.planId === PLAN_B);
    assert.equal(planB.planName, 'GFTX AMR Acceptance -- Cross-team');

    assert.equal(result.dataQualityFlags.length, 1);
    assert.equal(result.dataQualityFlags[0].id, 'FIXTURE-taskId-0004');
    assert.match(result.dataQualityFlags[0].reason, /null\/missing/);
  } finally {
    await srv.close();
  }
});

test('full pull resolves the AAD object id via /me when GRAPH_API_USER_OBJECT_ID is unset', async () => {
  const srv = await serveGraph();
  try {
    const result = await pullPlannerTasks({
      tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
      planIdsRaw: PLAN_A,
      graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      now: TODAY_MS,
    });
    assert.equal(result.userObjectId, JORDAN);
    assert.equal(result.userObjectIdSource, 'me');
  } finally {
    await srv.close();
  }
});

test('an empty-string GRAPH_API_USER_OBJECT_ID is treated as unset, not a literal empty override', async () => {
  const srv = await serveGraph();
  try {
    const result = await pullPlannerTasks({
      tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
      planIdsRaw: PLAN_A, userObjectId: '',
      graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      now: TODAY_MS,
    });
    assert.equal(result.userObjectIdSource, 'me');
  } finally {
    await srv.close();
  }
});

test('reachability mode: auth-rejected token still counts as reachable once the plan probe responds', async () => {
  const srv = await serveGraph({ tokenStatus: 401 });
  try {
    const r = await pullPlannerTasks({
      tenantId: 'tid', clientId: 'cid', clientSecret: 'wrong',
      planIdsRaw: `${PLAN_A},${PLAN_B}`,
      reachabilityOnly: true,
      graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
    });
    assert.equal(r.reachable, true);
    assert.equal(r.planId, PLAN_A);
    assert.equal(r.httpStatus, 200);
  } finally {
    await srv.close();
  }
});

test('reachability mode: a 401 on the plan probe itself still counts as reachable', async () => {
  const httpd = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname.endsWith('/oauth2/v2.0/token')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'tok' }));
      return;
    }
    res.writeHead(401);
    res.end('unauthorized');
  });
  await new Promise((resolve) => httpd.listen(0, '127.0.0.1', resolve));
  const { port } = httpd.address();
  try {
    const r = await pullPlannerTasks({
      tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
      planIdsRaw: PLAN_A, reachabilityOnly: true,
      graphBaseUrl: `http://127.0.0.1:${port}/v1.0`,
      tokenUrlBase: `http://127.0.0.1:${port}`,
    });
    assert.equal(r.reachable, true);
    assert.equal(r.httpStatus, 401);
  } finally {
    await new Promise((r) => httpd.close(r));
  }
});

test('reachability mode: network failure on the token endpoint throws with the syscall code', async () => {
  const srv = await serveGraph();
  const { graphBaseUrl, tokenUrlBase } = srv;
  await srv.close();
  await assert.rejects(
    pullPlannerTasks({
      tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
      planIdsRaw: PLAN_A, reachabilityOnly: true, graphBaseUrl, tokenUrlBase,
    }),
    /token endpoint unreachable .*ECONNREFUSED/,
  );
});

test('full pull fail loud: token request failure names the AAD error, not a raw HTTP status', async () => {
  const srv = await serveGraph({ tokenStatus: 401, tokenError: 'bad secret' });
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'wrong',
        planIdsRaw: PLAN_A, userObjectId: JORDAN,
        graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      }),
      /token request failed .*bad secret/s,
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: /me failure names the override as the fix', async () => {
  const srv = await serveGraph({ meStatus: 403 });
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
        planIdsRaw: PLAN_A,
        graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      }),
      /\/me returned HTTP 403 .*GRAPH_API_USER_OBJECT_ID/s,
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: a tasks response with no "value" array refuses to guess', async () => {
  const httpd = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname.endsWith('/oauth2/v2.0/token')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'tok' }));
      return;
    }
    if (url.pathname.endsWith('/tasks')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ notValue: [] }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ title: 'Some Plan' }));
  });
  await new Promise((resolve) => httpd.listen(0, '127.0.0.1', resolve));
  const { port } = httpd.address();
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
        planIdsRaw: PLAN_A, userObjectId: JORDAN,
        graphBaseUrl: `http://127.0.0.1:${port}/v1.0`,
        tokenUrlBase: `http://127.0.0.1:${port}`,
      }),
      /has no "value" array/,
    );
  } finally {
    await new Promise((r) => httpd.close(r));
  }
});

// A flexible single-endpoint server for exercising individual response
// bodies in isolation (a literal JSON `null`, an HTML SSO-redirect page,
// a malformed task) while every other endpoint stays on a valid default.
function serveGraphRaw({
  tokenBody = JSON.stringify({ access_token: 'tok' }),
  meBody = JSON.stringify({ id: JORDAN }),
  planBody = JSON.stringify({ title: 'Some Plan' }),
  tasksBody = JSON.stringify({ value: [] }),
} = {}) {
  const httpd = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.writeHead(200, { 'content-type': 'application/json' });
    if (req.method === 'POST' && url.pathname.endsWith('/oauth2/v2.0/token')) {
      res.end(tokenBody);
    } else if (url.pathname === '/v1.0/me') {
      res.end(meBody);
    } else if (url.pathname.endsWith('/tasks')) {
      res.end(tasksBody);
    } else {
      res.end(planBody);
    }
  });
  return new Promise((resolve) => {
    httpd.listen(0, '127.0.0.1', () => {
      const { port } = httpd.address();
      resolve({
        graphBaseUrl: `http://127.0.0.1:${port}/v1.0`,
        tokenUrlBase: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => httpd.close(r)),
      });
    });
  });
}

test('full pull fail loud: a literal JSON null token response body is refused, not a raw TypeError', async () => {
  const srv = await serveGraphRaw({ tokenBody: 'null' });
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
        planIdsRaw: PLAN_A, userObjectId: JORDAN,
        graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      }),
      (err) => {
        assert.match(err.message, /has no "access_token" field/);
        assert.doesNotMatch(err.message, /Cannot read propert/);
        return true;
      },
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: a literal JSON null /me response body is refused, not a raw TypeError', async () => {
  const srv = await serveGraphRaw({ meBody: 'null' });
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret', planIdsRaw: PLAN_A,
        graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      }),
      (err) => {
        assert.match(err.message, /\/me response .* has no "id" field/);
        assert.doesNotMatch(err.message, /Cannot read propert/);
        return true;
      },
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: a literal JSON null plan-lookup response body is refused, not a raw TypeError', async () => {
  const srv = await serveGraphRaw({ planBody: 'null' });
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
        planIdsRaw: PLAN_A, userObjectId: JORDAN,
        graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      }),
      (err) => {
        assert.match(err.message, /plan lookup .* has no "title" field/);
        assert.doesNotMatch(err.message, /Cannot read propert/);
        return true;
      },
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: a literal JSON null tasks-pull response body is refused, not a raw TypeError', async () => {
  const srv = await serveGraphRaw({ tasksBody: 'null' });
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
        planIdsRaw: PLAN_A, userObjectId: JORDAN,
        graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      }),
      (err) => {
        assert.match(err.message, /has no "value" array/);
        assert.doesNotMatch(err.message, /Cannot read propert/);
        return true;
      },
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: a task missing "id" or "title" is refused rather than silently serialized with a hole', async () => {
  const srv = await serveGraphRaw({
    tasksBody: JSON.stringify({
      value: [{ title: 'No id field', dueDateTime: '2026-07-18T05:00:00Z', assignments: { [JORDAN]: {} } }],
    }),
  });
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
        planIdsRaw: PLAN_A, userObjectId: JORDAN, now: TODAY_MS,
        graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      }),
      /missing "id" or "title" field/,
    );
  } finally {
    await srv.close();
  }
});

test('full pull fail loud: an HTML SSO-redirect body instead of JSON is refused, not silently guessed', async () => {
  const srv = await serveGraphRaw({ planBody: '<html>corp sso redirect</html>' });
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret',
        planIdsRaw: PLAN_A, userObjectId: JORDAN,
        graphBaseUrl: srv.graphBaseUrl, tokenUrlBase: srv.tokenUrlBase,
      }),
      /plan lookup .* is not valid JSON .*Refusing to guess/s,
    );
  } finally {
    await srv.close();
  }
});

test('fail loud: a hang-forever token endpoint times out rather than hanging', async () => {
  const httpd = createServer(() => {}); // never responds
  await new Promise((resolve) => httpd.listen(0, '127.0.0.1', resolve));
  const { port } = httpd.address();
  try {
    await assert.rejects(
      pullPlannerTasks({
        tenantId: 'tid', clientId: 'cid', clientSecret: 'secret', planIdsRaw: PLAN_A,
        graphBaseUrl: `http://127.0.0.1:${port}/v1.0`,
        tokenUrlBase: `http://127.0.0.1:${port}`,
        timeoutMs: 200,
      }),
      /token endpoint unreachable/,
    );
  } finally {
    httpd.closeAllConnections();
    await new Promise((r) => httpd.close(r));
  }
});

test('validation: missing tenantId, clientId, clientSecret, and planIdsRaw are each named', async () => {
  await assert.rejects(
    pullPlannerTasks({ tenantId: '', clientId: 'c', clientSecret: 's', planIdsRaw: 'p' }),
    /GRAPH_API_TENANT_ID is not set/,
  );
  await assert.rejects(
    pullPlannerTasks({ tenantId: 't', clientId: '', clientSecret: 's', planIdsRaw: 'p' }),
    /GRAPH_API_CLIENT_ID is not set/,
  );
  await assert.rejects(
    pullPlannerTasks({ tenantId: 't', clientId: 'c', clientSecret: '', planIdsRaw: 'p' }),
    /GRAPH_API_CLIENT_SECRET is not set/,
  );
  await assert.rejects(
    pullPlannerTasks({ tenantId: 't', clientId: 'c', clientSecret: 's', planIdsRaw: '' }),
    /PLANNER_PLAN_IDS is not set/,
  );
  await assert.rejects(
    pullPlannerTasks({ tenantId: 't', clientId: 'c', clientSecret: 's', planIdsRaw: ' , , ' }),
    /no usable plan ids/,
  );
});
