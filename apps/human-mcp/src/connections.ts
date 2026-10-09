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

type Connections = Partial<Record<ToolId, string>>;

function keyOf(humanUserId: string): string {
  return `tools:${humanUserId}`;
}

/** Remembers that a tool signed in to the account, so its tile in the dashboard can say "Connected". */
export async function recordConnection(env: Env, humanUserId: string, tool: ToolId): Promise<void> {
  if (!env.CONNECTIONS) {
    return;
  }

  const known = (await env.CONNECTIONS.get<Connections>(keyOf(humanUserId), 'json')) ?? {};
  await env.CONNECTIONS.put(keyOf(humanUserId), JSON.stringify({ ...known, [tool]: new Date().toISOString() }));
}

/** The tools that have signed in to the account, each with when it last connected. */
export async function listConnections(env: Env, humanUserId: string): Promise<Connections> {
  return (await env.CONNECTIONS?.get<Connections>(keyOf(humanUserId), 'json')) ?? {};
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
