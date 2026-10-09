import type { Env } from './env';

/** The AI tools the Human dashboard has tiles for. */
export type ToolId = 'cursor' | 'claude' | 'chatgpt';

/** Which tool a client is, from the name it gives when it connects. `null` for any other client. */
export function toolOf(clientName: unknown): ToolId | null {
  const name = typeof clientName === 'string' ? clientName.toLowerCase() : '';

  if (name.includes('cursor')) {
    return 'cursor';
  }

  if (name.includes('claude')) {
    return 'claude';
  }

  return name.includes('chatgpt') || name.includes('openai') ? 'chatgpt' : null;
}

const TOOLS: ToolId[] = ['cursor', 'claude', 'chatgpt'];

type Connections = Partial<Record<ToolId, string>>;

/** Each tool of an account has its own entry, so two tools signing in at once can't undo each other. */
function keyOf(humanUserId: string, tool: ToolId): string {
  return `tool:${humanUserId}:${tool}`;
}

/** Remembers that a tool signed in to the account, so its tile in the dashboard can say "Connected". */
export async function recordConnection(env: Env, humanUserId: string, tool: ToolId): Promise<void> {
  await env.CONNECTIONS?.put(keyOf(humanUserId, tool), new Date().toISOString());
}

/** The tools that have signed in to the account, each with when it last connected. */
export async function listConnections(env: Env, humanUserId: string): Promise<Connections> {
  const connections: Connections = {};
  if (!env.CONNECTIONS) {
    return connections;
  }

  const store = env.CONNECTIONS;
  const connectedAt = await Promise.all(TOOLS.map((tool) => store.get(keyOf(humanUserId, tool))));
  for (const [index, tool] of TOOLS.entries()) {
    const at = connectedAt[index];
    if (at) {
      connections[tool] = at;
    }
  }

  return connections;
}

/** The name a client gives in its `initialize` request, when this request is one. */
export function clientNameOf(body: unknown): string | null {
  const messages = Array.isArray(body) ? body : [body];

  for (const message of messages) {
    const { method, params } = (message ?? {}) as { method?: unknown; params?: { clientInfo?: { name?: unknown } } };
    if (method === 'initialize' && typeof params?.clientInfo?.name === 'string') {
      return params.clientInfo.name;
    }
  }

  return null;
}
