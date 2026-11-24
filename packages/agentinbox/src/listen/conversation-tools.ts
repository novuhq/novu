import type { Readable, Writable } from 'node:stream';
import type { ApiClient } from '../api/client';
import { getConversation } from '../api/inbox';
import { formatConversationView } from '../output';
import { isRecord } from './host-program';
import { METHOD_NOT_FOUND, RpcError, RpcPeer } from './json-rpc';

/**
 * The tools a contact's run gets for its own conversation: a small MCP server the host starts over stdio
 * (`agentinbox conversation-tools`). Each run starts its own, for its one conversation, so runs side by side never
 * share one, and no tool takes a conversation: none can reach another. It reads the key itself; the agent only sees
 * what the tools give back.
 *
 * Answering needs no tool: the run's last words are posted. Resolving is the listener's, after it posts them,
 * since a message into a resolved conversation opens it again: `resolve` only says it is wanted, and the listener
 * sees the call.
 */
export const CONVERSATION_TOOLS_SERVER = 'this_conversation';
export const READ_TOOL = 'read';
export const RESOLVE_TOOL = 'resolve';

/** The MCP versions this server speaks, newest first: a host asking for another gets the newest. */
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_LIMIT = 50;

export interface ConversationToolsOptions {
  client: ApiClient;
  conversationId: string;
  agentIdentifier?: string;
  version: string;
}

const TOOLS = [
  {
    name: READ_TOOL,
    description:
      'Reads this conversation: its newest messages, or older ones with `before`. Only this conversation, the one you are answering.',
    inputSchema: {
      type: 'object',
      properties: {
        before: { type: 'string', description: 'A message id: the messages before it.' },
        limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, description: 'How many messages, 20 by default.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: RESOLVE_TOOL,
    description:
      'Resolves this conversation once nothing more is owed. It happens after your reply is sent; the next message starts a fresh session.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
];

/** Serves the tools on `input` and `output` until the host closes `input`. */
export function serveConversationTools(
  input: Readable,
  output: Writable,
  options: ConversationToolsOptions
): Promise<void> {
  new RpcPeer(
    input,
    output,
    {
      request: (method, params) => answer(method, params, options),
      notification: () => undefined,
    },
    { jsonrpc: true }
  );

  return new Promise((resolve) => {
    input.once('end', resolve);
    input.once('close', resolve);
  });
}

/** What a tool call gives back, as MCP has it. */
interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/** What this server answers a host's request with. */
type Answer =
  | {
      protocolVersion: string;
      capabilities: { tools: Record<string, never> };
      serverInfo: { name: string; version: string };
      instructions: string;
    }
  | { tools: typeof TOOLS }
  | ToolResult
  | Record<string, never>;

async function answer(method: string, params: unknown, options: ConversationToolsOptions): Promise<Answer> {
  switch (method) {
    case 'initialize': {
      const asked = isRecord(params) && typeof params.protocolVersion === 'string' ? params.protocolVersion : '';

      return {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'agentinbox-conversation', version: options.version },
        instructions:
          'Tools for the one conversation this run answers: read it, and resolve it once nothing more is owed.',
      };
    }
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call':
      return call(isRecord(params) ? params : {}, options);
    default:
      throw new RpcError(METHOD_NOT_FOUND, `${method} isn’t something this server does.`);
  }
}

async function call(params: Record<string, unknown>, options: ConversationToolsOptions): Promise<ToolResult> {
  const args = isRecord(params.arguments) ? params.arguments : {};

  try {
    switch (params.name) {
      case READ_TOOL: {
        const limit = typeof args.limit === 'number' ? Math.min(Math.max(Math.floor(args.limit), 1), MAX_LIMIT) : 20;
        const view = await getConversation(options.client, options.conversationId, {
          limit,
          ...(typeof args.before === 'string' && args.before ? { before: args.before } : {}),
          ...(options.agentIdentifier ? { agentIdentifier: options.agentIdentifier } : {}),
        });

        return text(formatConversationView(view));
      }
      case RESOLVE_TOOL:
        return text('Done: this conversation is resolved once your reply is sent.');
      default:
        return { ...text(`There is no tool ${String(params.name)} here.`), isError: true };
    }
  } catch (err) {
    return { ...text(`It didn’t work: ${err instanceof Error ? err.message : String(err)}`), isError: true };
  }
}

function text(value: string): ToolResult {
  return { content: [{ type: 'text', text: value }] };
}
