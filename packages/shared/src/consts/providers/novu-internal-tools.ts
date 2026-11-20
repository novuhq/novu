/** Increment when Novu-owned managed-agent config changes (e.g. platform tools). Agents below this version are re-synced to the provider on the next message. */
export const AGENT_MANAGED_DEFINITION_VERSION = 6;

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

/**
 * Managed-agent HITL tool — analogue of framework `ctx.ask` / `approve` / `choose` / `tell`.
 * One tool with a `kind` enum so the skill stays short (same shape as `novu_tool_catalog` + `action`).
 */
export const NOVU_HUMAN_SCHEMA = {
  name: 'novu_human',
  description:
    'Ask the human in this conversation to decide. Use kind=ask for a freeform question, approve for yes/no, choose for 2–10 options, tell for a one-way notice. Do not use for routine chat — reply instead. Do not use to re-approve an MCP tool that is already parked.',
  input_schema: {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        enum: ['ask', 'approve', 'choose', 'tell'],
        description:
          'ask: freeform question. approve: yes/no. choose: pick from options. tell: one-way notice, does not wait.',
      },
      card: {
        type: 'object',
        description:
          'Card shown to the human. title/subtitle/body show on every channel; icon is Slack-only. Approve may add approveLabel, denyLabel, extraActions. Choose must set options (2–10). Do not invent trust-tool or trust-server extras. Do not use this tool to re-gate a parked MCP / provider tool.',
        properties: {
          title: { type: 'string', description: 'Card title. Required. Shown on every channel.' },
          icon: {
            type: 'string',
            description:
              'Slack only. MCP catalog id (`stripe`, `github`) or display name (`Stripe`), or an https URL (32×32). Ignored on Telegram, Teams, WhatsApp, email, and web chat. Do not use emoji names.',
          },
          subtitle: {
            type: 'string',
            description: 'Secondary line under the title. Shown on every channel.',
          },
          body: {
            type: 'string',
            description: 'Optional details under the subtitle. Markdown is ok. Shown on every channel.',
          },
          approveLabel: {
            type: 'string',
            description: 'Approve button label. Defaults to Approve.',
          },
          denyLabel: {
            type: 'string',
            description: 'Deny button label. Defaults to Deny.',
          },
          extraActions: {
            type: 'array',
            description:
              'Extra approve buttons after Approve / Deny (max 4). String label or { id, label }. Do not invent trust-tool or trust-server — Novu injects those on parked tool cards.',
            items: {
              anyOf: [
                { type: 'string', description: 'Button label. An id is minted as opt_N.' },
                {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Stable option id. Cannot be approve or deny.' },
                    label: { type: 'string', description: 'Button label shown to the human.' },
                  },
                  required: ['id', 'label'],
                },
              ],
            },
          },
          options: {
            type: 'array',
            description: 'Choose options (2–10). String label or { id, label }.',
            items: {
              anyOf: [
                { type: 'string', description: 'Option label. An id is minted as opt_N.' },
                {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Stable option id returned in the verdict.' },
                    label: { type: 'string', description: 'Option label shown to the human.' },
                  },
                  required: ['id', 'label'],
                },
              ],
            },
          },
        },
        required: ['title'],
      },
      from: {
        type: 'string',
        description: 'Optional attribution label shown on the card (defaults to the agent name).',
      },
      ttlSeconds: {
        type: 'number',
        description: 'How long the request stays answerable. Default 24h, max 72h.',
      },
    },
    required: ['kind', 'card'],
  },
} as const;

export const NOVU_HUMAN_REQUEST_ID_PREFIX = 'novu_human:' as const;

export const TOOL_APPROVAL_REQUEST_ID_PREFIX = 'tool_approval:' as const;

export type NovuHumanRequestCorrelation = {
  sessionId: string;
  toolUseId: string;
};

export function buildNovuHumanRequestId(sessionId: string, toolUseId: string): string {
  return `${NOVU_HUMAN_REQUEST_ID_PREFIX}${sessionId}:${toolUseId}`;
}

export function parseNovuHumanRequestId(requestId: string | undefined | null): NovuHumanRequestCorrelation | null {
  if (!requestId?.startsWith(NOVU_HUMAN_REQUEST_ID_PREFIX)) {
    return null;
  }

  const rest = requestId.slice(NOVU_HUMAN_REQUEST_ID_PREFIX.length);
  const separator = rest.indexOf(':');
  if (separator <= 0) {
    return null;
  }

  const sessionId = rest.slice(0, separator);
  const toolUseId = rest.slice(separator + 1);
  if (!sessionId || !toolUseId) {
    return null;
  }

  return { sessionId, toolUseId };
}

export function buildToolApprovalRequestId(approvalId: string): string {
  return `${TOOL_APPROVAL_REQUEST_ID_PREFIX}${approvalId}`;
}

export function parseToolApprovalRequestId(requestId: string | undefined | null): string | null {
  if (!requestId?.startsWith(TOOL_APPROVAL_REQUEST_ID_PREFIX)) {
    return null;
  }

  const approvalId = requestId.slice(TOOL_APPROVAL_REQUEST_ID_PREFIX.length);

  return approvalId.length > 0 ? approvalId : null;
}

export const NOVU_INTERNAL_TOOLS: readonly string[] = [
  NOVU_TOOL_CATALOG_SCHEMA.name,
  NOVU_TOOL_CATALOG_LEGACY_NAME,
  NOVU_RESOLVE_SCHEMA.name,
  NOVU_HUMAN_SCHEMA.name,
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

export function isNovuHumanToolName(toolName: string): boolean {
  return toolName === NOVU_HUMAN_SCHEMA.name;
}
