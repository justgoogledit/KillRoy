import { findSyscallCode } from './errors.js';

// Fixed Microsoft cloud endpoints -- unlike AMR_HUB_BASE_URL/OVERMIND_BASE_URL_TEMPLATE/
// MASTER_TRACKER_CSV_PATH, these do not vary per deployment (only the tenant id, which is
// embedded in the token URL's path, does). The graphBaseUrl/tokenUrlBase params below exist
// purely as a test seam, the same role fetchImpl already plays for the other tools -- server.js
// never overrides them.
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL_BASE = 'https://login.microsoftonline.com';

function chicagoDateString(epochMs) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochMs));
}

// Core Planner pull. Two modes, matching its two consumers exactly like Overmind's:
//
// - reachabilityOnly: check-connectors' semantics -- acquire a token, then probe the first
//   configured plan's tasks endpoint; ANY HTTP response (auth-rejected included) proves
//   reachability, only a network-level failure throws.
// - full (default): run-daily-workflow's morning-phase pull -- resolve Jordan's AAD object id
//   (GRAPH_API_USER_OBJECT_ID override, or GET /me), then for every configured plan pull its
//   title and tasks, filter to tasks assigned to that object id and due today (America/Chicago),
//   and group the result by plan name. A task with a null/missing/unparseable dueDateTime is
//   never folded into the due-today list and never silently dropped -- it comes back as its own
//   data-quality flag.
export async function pullPlannerTasks({
  tenantId,
  clientId,
  clientSecret,
  planIdsRaw,
  userObjectId,
  reachabilityOnly = false,
  fetchImpl = fetch,
  now = Date.now(),
  graphBaseUrl = GRAPH_BASE_URL,
  tokenUrlBase = TOKEN_URL_BASE,
  timeoutMs = 15000,
}) {
  if (!tenantId) {
    throw new Error('GRAPH_API_TENANT_ID is not set or empty. Fill it in .env (see .env.example).');
  }
  if (!clientId) {
    throw new Error('GRAPH_API_CLIENT_ID is not set or empty. Fill it in .env (see .env.example).');
  }
  if (!clientSecret) {
    throw new Error('GRAPH_API_CLIENT_SECRET is not set or empty. Fill it in .env (see .env.example).');
  }
  if (!planIdsRaw) {
    throw new Error('PLANNER_PLAN_IDS is not set or empty. Fill it in .env (see .env.example).');
  }
  const planIds = planIdsRaw.split(',').map((s) => s.trim()).filter((s) => s !== '');
  if (planIds.length === 0) {
    throw new Error(`PLANNER_PLAN_IDS has no usable plan ids after parsing: "${planIdsRaw}". Fix it in .env (see .env.example).`);
  }

  const tokenUrl = `${tokenUrlBase}/${tenantId}/oauth2/v2.0/token`;
  let tokenRes;
  try {
    tokenRes = await fetchImpl(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }).toString(),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    const code = findSyscallCode(cause) ?? cause.message;
    throw new Error(`Microsoft Graph token endpoint unreachable at ${tokenUrl}: ${code}.`, { cause });
  }

  if (reachabilityOnly) {
    let accessToken = null;
    if (tokenRes.ok) {
      try {
        accessToken = JSON.parse(await tokenRes.text()).access_token ?? null;
      } catch {
        accessToken = null;
      }
    } else {
      await tokenRes.body?.cancel().catch(() => {});
    }
    const probePlanId = planIds[0];
    const probeUrl = `${graphBaseUrl}/planner/plans/${encodeURIComponent(probePlanId)}/tasks`;
    let probeRes;
    try {
      probeRes = await fetchImpl(probeUrl, {
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      const code = findSyscallCode(cause) ?? cause.message;
      throw new Error(`Microsoft Graph Planner endpoint unreachable at ${probeUrl} (planId=${probePlanId}): ${code}.`, { cause });
    }
    // Any HTTP response -- auth-rejected included -- proves reachability, same
    // reasoning as Overmind's reachabilityOnly mode: this checks the network
    // path, not whether today's credentials are valid.
    await probeRes.body?.cancel().catch(() => {});
    return { reachable: true, httpStatus: probeRes.status, url: probeUrl, planId: probePlanId };
  }

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => '');
    let reason = `HTTP ${tokenRes.status}`;
    try {
      const parsed = JSON.parse(text);
      reason = parsed.error_description ?? parsed.error ?? reason;
    } catch {
      // keep the HTTP-status reason
    }
    throw new Error(`Microsoft Graph token request failed at ${tokenUrl}: ${reason}. Check GRAPH_API_TENANT_ID/GRAPH_API_CLIENT_ID/GRAPH_API_CLIENT_SECRET in .env.`);
  }

  let tokenBody;
  try {
    tokenBody = JSON.parse(await tokenRes.text());
  } catch (cause) {
    throw new Error(`Microsoft Graph token response at ${tokenUrl} is not valid JSON (${cause.message}). Refusing to guess.`, { cause });
  }
  const accessToken = tokenBody?.access_token;
  if (typeof accessToken !== 'string' || accessToken === '') {
    throw new Error(`Microsoft Graph token response at ${tokenUrl} has no "access_token" field. Unexpected shape -- refusing to guess.`);
  }
  const authHeaders = { authorization: `Bearer ${accessToken}` };

  const override = userObjectId && userObjectId.trim() !== '' ? userObjectId.trim() : null;
  let resolvedUserId = override;
  let userObjectIdSource = 'override';
  if (!resolvedUserId) {
    userObjectIdSource = 'me';
    const meUrl = `${graphBaseUrl}/me`;
    let meRes;
    try {
      meRes = await fetchImpl(meUrl, { headers: authHeaders, signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      const code = findSyscallCode(cause) ?? cause.message;
      throw new Error(`Microsoft Graph /me unreachable at ${meUrl}: ${code}. Set GRAPH_API_USER_OBJECT_ID in .env to skip this resolution.`, { cause });
    }
    if (!meRes.ok) {
      await meRes.body?.cancel().catch(() => {});
      throw new Error(`Microsoft Graph /me returned HTTP ${meRes.status} at ${meUrl}. Set GRAPH_API_USER_OBJECT_ID in .env to skip this resolution (an application-only token cannot call /me).`);
    }
    let meBody;
    try {
      meBody = JSON.parse(await meRes.text());
    } catch (cause) {
      throw new Error(`Microsoft Graph /me response at ${meUrl} is not valid JSON (${cause.message}). Refusing to guess.`, { cause });
    }
    if (typeof meBody?.id !== 'string' || meBody.id === '') {
      throw new Error(`Microsoft Graph /me response at ${meUrl} has no "id" field. Unexpected shape -- refusing to guess.`);
    }
    resolvedUserId = meBody.id;
  }

  const today = chicagoDateString(now);
  const groups = [];
  const dataQualityFlags = [];

  for (const planId of planIds) {
    const planUrl = `${graphBaseUrl}/planner/plans/${encodeURIComponent(planId)}`;
    let planRes;
    try {
      planRes = await fetchImpl(planUrl, { headers: authHeaders, signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      const code = findSyscallCode(cause) ?? cause.message;
      throw new Error(`Microsoft Graph plan lookup unreachable at ${planUrl} (planId=${planId}): ${code}.`, { cause });
    }
    if (!planRes.ok) {
      await planRes.body?.cancel().catch(() => {});
      throw new Error(`Microsoft Graph plan lookup returned HTTP ${planRes.status} for ${planUrl} (planId=${planId}).`);
    }
    let planBody;
    try {
      planBody = JSON.parse(await planRes.text());
    } catch (cause) {
      throw new Error(`Microsoft Graph plan lookup at ${planUrl} (planId=${planId}) is not valid JSON (${cause.message}). Refusing to guess.`, { cause });
    }
    if (typeof planBody?.title !== 'string' || planBody.title === '') {
      throw new Error(`Microsoft Graph plan lookup at ${planUrl} (planId=${planId}) has no "title" field. Unexpected shape -- refusing to guess.`);
    }

    const tasksUrl = `${graphBaseUrl}/planner/plans/${encodeURIComponent(planId)}/tasks`;
    let tasksRes;
    try {
      tasksRes = await fetchImpl(tasksUrl, { headers: authHeaders, signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      const code = findSyscallCode(cause) ?? cause.message;
      throw new Error(`Microsoft Graph tasks pull unreachable at ${tasksUrl} (planId=${planId}): ${code}.`, { cause });
    }
    if (!tasksRes.ok) {
      await tasksRes.body?.cancel().catch(() => {});
      throw new Error(`Microsoft Graph tasks pull returned HTTP ${tasksRes.status} for ${tasksUrl} (planId=${planId}). Not treating this as zero tasks.`);
    }
    let tasksBody;
    try {
      tasksBody = JSON.parse(await tasksRes.text());
    } catch (cause) {
      throw new Error(`Microsoft Graph tasks response at ${tasksUrl} (planId=${planId}) is not valid JSON (${cause.message}). Refusing to guess.`, { cause });
    }
    const tasks = tasksBody?.value;
    if (!Array.isArray(tasks)) {
      throw new Error(`Microsoft Graph tasks response at ${tasksUrl} (planId=${planId}) has no "value" array. Unexpected shape -- refusing to guess.`);
    }

    // Real Planner "assignments" are keyed by AAD object GUIDs, not a plain
    // assignee field -- membership, not value comparison.
    const mine = tasks.filter((t) => t?.assignments && Object.prototype.hasOwnProperty.call(t.assignments, resolvedUserId));

    const dueToday = [];
    for (const task of mine) {
      // id/title are the task's identifying fields -- a real plannerTask
      // always carries both. A hole here would otherwise serialize away
      // silently (JSON.stringify drops undefined keys), the opposite of the
      // dueDateTime handling below, which turns a defect into an explicit flag.
      if (typeof task.id !== 'string' || task.id === '' || typeof task.title !== 'string') {
        throw new Error(`Microsoft Graph tasks response at ${tasksUrl} (planId=${planId}) contains a task with a missing "id" or "title" field. Unexpected shape -- refusing to guess.`);
      }
      if (task.dueDateTime === null || task.dueDateTime === undefined) {
        dataQualityFlags.push({
          id: task.id, title: task.title, planId, planName: planBody.title,
          reason: 'dueDateTime is null/missing',
        });
        continue;
      }
      const dueMs = Date.parse(task.dueDateTime);
      if (Number.isNaN(dueMs)) {
        dataQualityFlags.push({
          id: task.id, title: task.title, planId, planName: planBody.title,
          reason: `dueDateTime "${task.dueDateTime}" is not a parseable date`,
        });
        continue;
      }
      if (chicagoDateString(dueMs) === today) {
        dueToday.push({
          id: task.id, title: task.title, dueDateTime: task.dueDateTime,
          percentComplete: task.percentComplete ?? null,
        });
      }
    }

    if (dueToday.length > 0) {
      groups.push({ planId, planName: planBody.title, tasks: dueToday });
    }
  }

  return {
    userObjectId: resolvedUserId,
    userObjectIdSource,
    today,
    planIds,
    groups,
    taskCount: groups.reduce((sum, g) => sum + g.tasks.length, 0),
    dataQualityFlags,
  };
}
