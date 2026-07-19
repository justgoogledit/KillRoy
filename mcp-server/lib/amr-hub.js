import { findSyscallCode } from './errors.js';

// Core AMR Hub pull, separated from the MCP wiring so node:test can drive it
// directly against fixture-serving HTTP servers.
//
// Fail-loud contract (CLAUDE.md safety tier): every abnormal condition throws
// with a specific reason. This function never maps a failure to an empty unit
// list -- an unreachable or unreadable AMR Hub must never look like a zero-unit
// fleet downstream.
export async function pullAmrUnits({ baseUrl, fleetId, fetchImpl = fetch, timeoutMs = 15000 }) {
  if (!baseUrl) {
    throw new Error('AMR_HUB_BASE_URL is not set or empty. Fill it in .env (see .env.example).');
  }

  let url;
  try {
    url = new URL('/api/amrs', baseUrl).toString();
  } catch (cause) {
    throw new Error(`AMR_HUB_BASE_URL is not a valid URL: "${baseUrl}". Fix it in .env (see .env.example).`, { cause });
  }

  let res;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (cause) {
    // undici buries the useful code (ECONNREFUSED, ETIMEDOUT, ...) somewhere
    // down the cause chain -- sometimes cause.cause.code, sometimes inside an
    // AggregateError's errors[]. Walk the whole chain so "fetch failed" never
    // eats the real reason.
    const code = findSyscallCode(cause) ?? cause.message;
    throw new Error(`AMR Hub unreachable at ${url}: ${code}. This is not a zero-unit fleet; the source could not be contacted.`, { cause });
  }

  if (!res.ok) {
    throw new Error(`AMR Hub returned HTTP ${res.status} for ${url}. Not treating this as an empty fleet.`);
  }

  const body = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (cause) {
    throw new Error(`AMR Hub response at ${url} is not valid JSON (${cause.message}). Refusing to guess: this is not a zero-unit fleet, the source is unreadable.`, { cause });
  }

  // The dev amrtracker wraps rows in an "amrs" key (the fixture mirrors this);
  // accept a bare array too so a schema simplification upstream doesn't break us.
  const units = Array.isArray(parsed) ? parsed : parsed?.amrs;
  if (!Array.isArray(units)) {
    throw new Error(`AMR Hub response at ${url} parsed as JSON but has no "amrs" array. Unexpected shape -- refusing to guess.`);
  }

  // Pass units through untouched: null/missing gate fields must reach the
  // skills intact so their own Data-quality-flag handling fires. Coercing or
  // dropping here would silently defeat that.
  const filtered = fleetId ? units.filter((u) => u?.fleetId === fleetId) : units;

  return {
    unitCount: filtered.length,
    totalUnitCount: units.length,
    fleetId: fleetId ?? null,
    units: filtered,
  };
}
