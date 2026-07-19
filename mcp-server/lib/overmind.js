import { findSyscallCode } from './errors.js';

// UNVERIFIED against the real Overmind schema: this sandbox has no corp-network
// access, so the exact GraphQL query (and even the /graphql path convention)
// cannot be confirmed from here. The field set mirrors what
// fleet-commissioning-handoff step 2 needs and what the fixture provides. The
// first corp-network session must verify this query against the live endpoint
// and correct it -- same policy as Knowledge/Sources/overmind-fleets.md's
// UNVERIFIED fleet ids and their refresh procedure.
const FLEET_STATE_QUERY = `{
  fleet {
    fleetId
    imageTag
    robotCount
    robotCountNote
    tracerEventsActive
    mfsWiring
    robotConfigsYamlDelta
  }
}`;

const REQUIRED_FIELDS = ['imageTag', 'robotCount', 'tracerEventsActive', 'mfsWiring', 'robotConfigsYamlDelta'];

// Core Overmind pull. Two modes:
//
// - reachabilityOnly: check-connectors' semantics -- a bare GET to the fleet
//   base URL; ANY HTTP response (auth-rejected included) proves reachability,
//   only network-level failure throws. Uses the base URL, not /graphql, so the
//   probe doesn't depend on the UNVERIFIED query path existing.
// - full (default): fleet-commissioning-handoff's data pull -- POST the
//   GraphQL query, require 2xx + parseable JSON + the required fields, fail
//   loud (with the field names) on anything else.
export async function pullOvermindFleetState({
  baseUrlTemplate,
  fleetId,
  reachabilityOnly = false,
  fetchImpl = fetch,
  timeoutSec,
}) {
  if (typeof fleetId !== 'string' || fleetId.trim() === '') {
    throw new Error('fleetId must be a non-empty string (e.g. gftx-cybercab-2m-b3-agv).');
  }
  if (!baseUrlTemplate) {
    throw new Error('OVERMIND_BASE_URL_TEMPLATE is not set or empty. Fill it in .env (see .env.example).');
  }
  if (!baseUrlTemplate.includes('{fleet}')) {
    throw new Error(`OVERMIND_BASE_URL_TEMPLATE has no {fleet} placeholder: "${baseUrlTemplate}". Fix it in .env (see .env.example).`);
  }

  let timeoutMs = 15000;
  if (timeoutSec !== undefined && timeoutSec !== '') {
    const parsed = Number(timeoutSec);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`OVERMIND_TIMEOUT_SEC is not a positive number: "${timeoutSec}". Fix it in .env or unset it for the default.`);
    }
    timeoutMs = parsed * 1000;
  }

  const base = baseUrlTemplate.replaceAll('{fleet}', fleetId).replace(/\/+$/, '');
  try {
    new URL(base);
  } catch (cause) {
    throw new Error(`OVERMIND_BASE_URL_TEMPLATE produced an invalid URL for fleet "${fleetId}": "${base}". Fix the template in .env.`, { cause });
  }

  if (reachabilityOnly) {
    let res;
    try {
      res = await fetchImpl(base, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      const code = findSyscallCode(cause) ?? cause.message;
      throw new Error(`Overmind unreachable at ${base} (fleet=${fleetId}): ${code}.`, { cause });
    }
    // Any HTTP response -- auth-rejected included -- proves reachability;
    // v1 is on-corp-network-open, so data access is not what's being tested.
    return { reachable: true, httpStatus: res.status, url: base, fleetId };
  }

  const gqlUrl = `${base}/graphql`;
  let res;
  try {
    res = await fetchImpl(gqlUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: FLEET_STATE_QUERY }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    const code = findSyscallCode(cause) ?? cause.message;
    throw new Error(`Overmind unreachable at ${gqlUrl} (fleet=${fleetId}): ${code}. No fleet state was pulled.`, { cause });
  }

  if (!res.ok) {
    throw new Error(`Overmind returned HTTP ${res.status} for ${gqlUrl} (fleet=${fleetId}). Not treating this as empty fleet state. If this is an auth rejection off corp network, that is expected -- v1 Overmind pulls require the corp network.`);
  }

  const body = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (cause) {
    throw new Error(`Overmind response at ${gqlUrl} is not valid JSON (${cause.message}). Refusing to guess.`, { cause });
  }

  if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
    const first = parsed.errors[0]?.message ?? 'unnamed GraphQL error';
    throw new Error(`Overmind GraphQL error for fleet "${fleetId}": ${first}. The query in mcp-server/lib/overmind.js is UNVERIFIED against the real schema -- if this is a schema mismatch, verify and correct it on a corp-network session (see the file's header note).`);
  }

  // Accept the GraphQL envelope ({data:{fleet:{...}}}) or a flat object -- the
  // flat form is what the fixture file contains, so tool-level dry-runs can
  // serve the fixture bytes directly.
  const state = parsed?.data?.fleet ?? parsed;
  const missing = REQUIRED_FIELDS.filter((f) => state?.[f] === undefined);
  if (missing.length > 0) {
    throw new Error(`Overmind response at ${gqlUrl} is missing required field(s): ${missing.join(', ')}. Unexpected shape -- refusing to guess. The query is UNVERIFIED against the real schema; see mcp-server/lib/overmind.js.`);
  }

  return {
    fleetId: state.fleetId ?? fleetId,
    imageTag: state.imageTag,
    robotCount: state.robotCount,
    robotCountNote: state.robotCountNote ?? null,
    tracerEventsActive: state.tracerEventsActive,
    mfsWiring: state.mfsWiring,
    robotConfigsYamlDelta: state.robotConfigsYamlDelta,
    url: gqlUrl,
  };
}
