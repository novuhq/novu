/** Increment when Novu-owned managed-agent config changes (e.g. platform tools). Agents below this version are re-synced to the provider on the next message. */
export const AGENT_MANAGED_DEFINITION_VERSION = 2;

/**
 * Legacy wire name for the tool catalog. Still treated as Novu-owned so definition
 * refresh strips stale copies, and pending-tool dispatch accepts in-flight calls.
 */
export const NOVU_TOOL_CATALOG_LEGACY_NAME = 'novu_tools' as const;

/**
 * Provider-agnostic schema for the novu_tool_catalog custom tool.
 * Each runtime provider wraps this with its own type tag
 * (e.g. Anthropic adds `type: 'custom'`, OpenAI wraps as `type: 'function'`).
 *
 * Scope: browse / request access to third-party tools (MCP) for this agent.
 * Conversation lifecycle actions live on dedicated platform tools (e.g. novu_resolve).
 */
export const NOVU_TOOL_CATALOG_SCHEMA = {
  name: 'novu_tool_catalog',
  description:
    "Browse and request access to third-party tools for this agent. Use 'list_available' to see tools the user hasn't connected yet. Use 'request_connect' when you need one of those tools.",
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list_available', 'request_connect'],
        description:
          "list_available: returns tools the user hasn't connected yet. request_connect: triggers OAuth for a specific tool.",
      },
      service_id: {
        type: 'string',
        description: 'Required for request_connect. The id of the service to connect (from list results).',
      },
    },
    required: ['action'],
  },
} as const;

/**
 * Provider-agnostic schema for the novu_resolve custom tool.
 * Marks the conversation resolved (managed equivalent of self-hosted `ctx.resolve()`).
 */
export const NOVU_RESOLVE_SCHEMA = {
  name: 'novu_resolve',
  description:
    "Mark this conversation as resolved when the user's request is fully handled. Optionally include a short summary of the resolution. Do not call while still troubleshooting or waiting on the user.",
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'Optional short summary of how the conversation was resolved.',
      },
    },
  },
} as const;

export const NOVU_INTERNAL_TOOLS: readonly string[] = [
  NOVU_TOOL_CATALOG_SCHEMA.name,
  NOVU_TOOL_CATALOG_LEGACY_NAME,
  NOVU_RESOLVE_SCHEMA.name,
];

export function isNovuInternalToolName(name: unknown): boolean {
  return typeof name === 'string' && (NOVU_INTERNAL_TOOLS as readonly string[]).includes(name);
}

export function isNovuToolCatalogName(toolName: string): boolean {
  return toolName === NOVU_TOOL_CATALOG_SCHEMA.name || toolName === NOVU_TOOL_CATALOG_LEGACY_NAME;
}

export function isNovuResolveToolName(toolName: string): boolean {
  return toolName === NOVU_RESOLVE_SCHEMA.name;
}
