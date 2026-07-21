#!/usr/bin/env node
// Kilroy's typed MCP connector server. Read-only, stdio transport, .env-driven.
// One tool per data source: Overmind (the only remaining typed connector after
// the 2026-07-21 consolidation -- AMR Hub, Master Tracker CSV, and the
// Graph-API Planner tool were retired; Planner now goes through Nova's
// general-purpose `planner` MCP).
//
// Uses the SDK's low-level Server API with plain JSON Schema tool definitions
// rather than the zod-based helper, to keep this repo's direct dependency
// surface at exactly one package.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from './lib/env.js';
import { pullOvermindFleetState } from './lib/overmind.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Overridable for tests only (test/server.test.js points it at temp files so
// the suite never touches a real repo-root .env). Normal operation: unset.
const envPath = process.env.KILROY_ENV_PATH || join(repoRoot, '.env');

const TOOLS = [
  {
    name: 'overmind_get_fleet_state',
    description:
      'Read Overmind fleet state for one fleet: image tag, robot count, active tracer events, ' +
      'MFS wiring summary, RobotConfigs.yaml deltas. Read-only, corp-network-only in v1. ' +
      'With reachabilityOnly=true, just probes the fleet base URL and reports any HTTP response ' +
      '(auth-rejected included) as reachable -- check-connectors uses that mode. Fails loudly ' +
      'on network failure, non-2xx (full mode), unparseable body, or missing fields.',
    inputSchema: {
      type: 'object',
      properties: {
        fleetId: {
          type: 'string',
          description: 'Required fleet id (e.g. gftx-cybercab-2m-b3-agv) -- fills {fleet} in OVERMIND_BASE_URL_TEMPLATE.',
        },
        reachabilityOnly: {
          type: 'boolean',
          description: 'If true, only probe reachability of the fleet base URL; no data pull.',
        },
      },
      required: ['fleetId'],
      additionalProperties: false,
    },
  },
];

const server = new Server(
  { name: 'kilroy-connectors', version: '0.2.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

const fail = (text) => ({ isError: true, content: [{ type: 'text', text }] });

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!TOOLS.some((t) => t.name === name)) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const env = loadEnv(envPath);
  if (env === null) {
    // Same message shape the session-start hook and check-connectors use.
    return fail(`FAIL: .env not found at ${envPath} -- cp .env.example .env, then fill it in.`);
  }

  try {
    // overmind_get_fleet_state -- fleetId is required; the lib validates it
    // (and the template, and the timeout) and throws with specific reasons.
    const reachabilityOnly = args?.reachabilityOnly;
    if (reachabilityOnly !== undefined && typeof reachabilityOnly !== 'boolean') {
      // The SDK does not enforce inputSchema types. A string "true" here would
      // silently run the FULL pull instead of the probe -- opposite semantics,
      // failing off-corp where check-connectors expected a reachability pass.
      return fail('FAIL: reachabilityOnly, when provided, must be a boolean (true/false), not a string.');
    }
    const result = await pullOvermindFleetState({
      baseUrlTemplate: env.OVERMIND_BASE_URL_TEMPLATE,
      fleetId: args?.fleetId,
      reachabilityOnly: reachabilityOnly === true,
      timeoutSec: env.OVERMIND_TIMEOUT_SEC,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (err) {
    // Loud, specific, and unmistakably not data: the calling skill's fail-loud
    // steps key off this being an error, never an empty result.
    return fail(`FAIL: ${err.message}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
