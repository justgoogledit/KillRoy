#!/usr/bin/env node
// Kilroy's typed MCP connector server. Read-only, stdio transport, .env-driven.
// One tool per data source: AMR Hub now; Overmind, Master Tracker CSV, and
// Planner follow (tickets #8-#10).
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
];

const server = new Server(
  { name: 'kilroy-connectors', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== 'amr_hub_get_units') {
    throw new Error(`Unknown tool: ${name}`);
  }

  const env = loadEnv(envPath);
  if (env === null) {
    // Same message shape the session-start hook and check-connectors use.
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `FAIL: .env not found at ${envPath} -- cp .env.example .env, then fill it in.`,
        },
      ],
    };
  }

  const fleetId = args?.fleetId;
  if (fleetId !== undefined && (typeof fleetId !== 'string' || fleetId.trim() === '')) {
    // An empty/blank fleetId is a caller bug, not "no filter" -- silently
    // widening the query to every unit would be the quiet-fallback behavior
    // this server exists to eliminate.
    return {
      isError: true,
      content: [
        { type: 'text', text: 'FAIL: fleetId, when provided, must be a non-empty string. Omit it entirely to get every unit.' },
      ],
    };
  }

  try {
    const result = await pullAmrUnits({
      baseUrl: env.AMR_HUB_BASE_URL,
      fleetId,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (err) {
    // Loud, specific, and unmistakably not data: the calling skill's fail-loud
    // steps key off this being an error, never an empty result.
    return { isError: true, content: [{ type: 'text', text: `FAIL: ${err.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
