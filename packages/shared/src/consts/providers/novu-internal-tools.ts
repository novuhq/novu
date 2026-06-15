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

export const NOVU_TOOLS_SYSTEM_PROMPT_ADDITION =
  "You have access to the novu_tools tool. If a user asks for something that requires a service you don't currently have tools for, call list_available to see what tools can be connected, then use request_connect to help the user set it up.";

export const NOVU_TOOLS_TOOL_NAME = NOVU_TOOLS_SCHEMA.name;

export const NOVU_INTERNAL_TOOLS: readonly string[] = [NOVU_TOOLS_TOOL_NAME];
