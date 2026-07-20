#!/usr/bin/env node
// Kilroy's typed MCP connector server. Read-only, stdio transport, .env-driven.
// One tool per data source: AMR Hub, Overmind, Master Tracker CSV, Planner.
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
import { pullAmrUnits } from './lib/amr-hub.js';
import { pullOvermindFleetState } from './lib/overmind.js';
import { readMasterTracker } from './lib/master-tracker.js';
import { pullPlannerTasks } from './lib/planner.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Overridable for tests only (test/server.test.js points it at temp files so
// the suite never touches a real repo-root .env). Normal operation: unset.
const envPath = process.env.KILROY_ENV_PATH || join(repoRoot, '.env');

const TOOLS = [
  {
    name: 'amr_hub_get_units',
    description:
      'Read the AMR Hub (amrtracker) unit list: per-unit buyoff gate statuses ' +
      '(buyoff220Status through buyoff280Status), *BlockedReason fields, and updatedAt. ' +
      'Read-only. Fails loudly (never an empty list) when the Hub is unreachable, returns ' +
      'non-2xx, or the body is not the expected JSON shape. Optionally filters to one fleet.',
    inputSchema: {
      type: 'object',
      properties: {
        fleetId: {
          type: 'string',
          description:
            'Optional fleet id (e.g. gftx-cybercab-2m-b3-agv). Omit for every unit the Hub knows.',
        },
      },
      additionalProperties: false,
    },
  },
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
  {
    name: 'master_tracker_get_rows',
    description:
      'Read the Sonic AMR Master Tracker CSV export at MASTER_TRACKER_CSV_PATH: per-unit ' +
      'pipelineStatus, etaAtFactory, projectIdentifier, vendorRef, hardwareRevision. Read-only. ' +
      'The result carries mtime-based staleness info (stale=true past ' +
      'MASTER_TRACKER_STALE_WARN_HOURS) as a WARN-grade flag -- staleness never blocks the read. ' +
      'Fails loudly (never an empty row list) on a missing/unreadable file or headerless body. ' +
      'Optionally filters rows to one projectIdentifier (fleet).',
    inputSchema: {
      type: 'object',
      properties: {
        projectIdentifier: {
          type: 'string',
          description:
            'Optional fleet id to filter rows by the projectIdentifier column. Omit for every row.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'planner_get_tasks',
    description:
      'Read Jordan\'s due-today Planner tasks across every plan in PLANNER_PLAN_IDS: title, ' +
      'dueDateTime, percentComplete, grouped by plan name. Resolves the acting AAD object id from ' +
      'GRAPH_API_USER_OBJECT_ID if set, else GET /me. Read-only. With reachabilityOnly=true, just ' +
      'probes the first configured plan and reports any HTTP response (auth-rejected included) as ' +
      'reachable -- check-connectors uses that mode. Fails loudly on token/network failure, non-2xx, ' +
      'unparseable body, or missing fields; a task with a null/missing dueDateTime is never folded ' +
      'into the due-today list or silently dropped -- it comes back as its own data-quality flag.',
    inputSchema: {
      type: 'object',
      properties: {
        reachabilityOnly: {
          type: 'boolean',
          description: 'If true, only probe reachability of the first configured plan; no data pull.',
        },
      },
      additionalProperties: false,
    },
  },
];

const server = new Server(
  { name: 'kilroy-connectors', version: '0.1.0' },
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

  const fleetId = args?.fleetId;

  try {
    if (name === 'master_tracker_get_rows') {
      // The lib validates the path, threshold, and filter itself and throws
      // with specific reasons; staleness comes back as a flag, not an error.
      const result = readMasterTracker({
        csvPath: env.MASTER_TRACKER_CSV_PATH,
        staleWarnHours: env.MASTER_TRACKER_STALE_WARN_HOURS,
        projectIdentifier: args?.projectIdentifier,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }

    if (name === 'planner_get_tasks') {
      const plannerReachabilityOnly = args?.reachabilityOnly;
      if (plannerReachabilityOnly !== undefined && typeof plannerReachabilityOnly !== 'boolean') {
        // Same hazard as overmind_get_fleet_state's reachabilityOnly: the SDK
        // does not enforce inputSchema types, and a string "true" here would
        // silently run the full pull (and its /me + per-plan calls) instead
        // of the cheap probe.
        return fail('FAIL: reachabilityOnly, when provided, must be a boolean (true/false), not a string.');
      }
      const result = await pullPlannerTasks({
        tenantId: env.GRAPH_API_TENANT_ID,
        clientId: env.GRAPH_API_CLIENT_ID,
        clientSecret: env.GRAPH_API_CLIENT_SECRET,
        planIdsRaw: env.PLANNER_PLAN_IDS,
        userObjectId: env.GRAPH_API_USER_OBJECT_ID,
        reachabilityOnly: plannerReachabilityOnly === true,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }

    if (name === 'amr_hub_get_units') {
      if (fleetId !== undefined && (typeof fleetId !== 'string' || fleetId.trim() === '')) {
        // An empty/blank fleetId is a caller bug, not "no filter" -- silently
        // widening the query to every unit would be the quiet-fallback behavior
        // this server exists to eliminate.
        return fail('FAIL: fleetId, when provided, must be a non-empty string. Omit it entirely to get every unit.');
      }
      const result = await pullAmrUnits({ baseUrl: env.AMR_HUB_BASE_URL, fleetId });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }

    // overmind_get_fleet_state -- fleetId is required here; the lib validates
    // it (and the template, and the timeout) and throws with specific reasons.
    const reachabilityOnly = args?.reachabilityOnly;
    if (reachabilityOnly !== undefined && typeof reachabilityOnly !== 'boolean') {
      // The SDK does not enforce inputSchema types. A string "true" here would
      // silently run the FULL pull instead of the probe -- opposite semantics,
      // failing off-corp where check-connectors expected a reachability pass.
      return fail('FAIL: reachabilityOnly, when provided, must be a boolean (true/false), not a string.');
    }
    const result = await pullOvermindFleetState({
      baseUrlTemplate: env.OVERMIND_BASE_URL_TEMPLATE,
      fleetId,
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
