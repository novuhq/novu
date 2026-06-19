/** Increment when Novu-owned managed-agent config changes (e.g. novu_tools). Agents below this version are re-synced to the provider on the next message. */
export const AGENT_MANAGED_DEFINITION_VERSION = 1;

/**
 * Provider-agnostic schema for the novu_tools custom tool.
 * Each runtime provider wraps this with its own type tag
 * (e.g. Anthropic adds `type: 'custom'`, OpenAI wraps as `type: 'function'`).
 */
export const NOVU_TOOLS_SCHEMA = {
  name: 'novu_tools',
  description:
    "Manage third-party tools available to this agent. Use 'list_available' to see tools the user hasn't connected yet. Use 'request_connect' when you need one of those tools.",
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

const NOVU_TOOLS_TOOL_NAME = NOVU_TOOLS_SCHEMA.name;

export const NOVU_INTERNAL_TOOLS: readonly string[] = [NOVU_TOOLS_TOOL_NAME];
