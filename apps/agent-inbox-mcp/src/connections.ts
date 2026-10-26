import type { Env } from './env';

/**
 * The hosts Agent Inbox tells apart, by the ids the API (`AGENT_HOST_IDS`) and the dashboard use. `general`
 * is any other app.
 */
export const HOST_IDS = [
  'claude-code',
  'codex',
  'opencode',
  'cursor',
  'hermes',
  'openclaw',
  'general',
  'claude',
  'chatgpt',
  'grok',
] as const;

export type HostId = (typeof HOST_IDS)[number];

/**
 * The names apps give when they connect (`clientInfo.name` in `initialize`), lowercased. A name is matched
 * whole, so `claude-code` is Claude Code and never Claude. Claude Code, Claude, Codex, Cursor, OpenCode,
 * Hermes and OpenClaw are as their own code or docs show them. ChatGPT's two are as people have seen them sent,
 * and `codex` as an MCP client list has it; nothing from OpenAI says. Grok's is not known yet.
 */
const CLIENT_NAMES: Readonly<Record<string, HostId>> = {
  'claude-code': 'claude-code',
  'claude-ai': 'claude',
  anthropic: 'claude',
  'codex-mcp-client': 'codex',
  codex: 'codex',
  'cursor-vscode': 'cursor',
  opencode: 'opencode',
  'hermes-agent': 'hermes',
  openclaw: 'openclaw',
  'openclaw-bundle-mcp': 'openclaw',
  'openclaw-node-host': 'openclaw',
  'openai-mcp': 'chatgpt',
  chatgpt: 'chatgpt',
};

/**
 * Where a name has more to it than the start: Claude's apps say `Anthropic`, sometimes with more after it, and
 * OpenClaw names each of its clients `openclaw-…`. Nothing else is matched by its start: a name like
 * `claude-desktop` that no app is known to send counts as General, not as Claude.
 */
const CLIENT_NAME_STARTS: ReadonlyArray<readonly [start: string, host: HostId]> = [
  ['anthropic', 'claude'],
  ['openclaw', 'openclaw'],
];

/** Which host an app is, from the name it gives when it connects, or `null` for one Agent Inbox doesn't know. */
export function hostOfClientName(clientName: string): HostId | null {
  const name = clientName.trim().toLowerCase();

  return CLIENT_NAMES[name] ?? CLIENT_NAME_STARTS.find(([start]) => name.startsWith(start))?.[1] ?? null;
}

/**
 * The apps that say who they are on every request, as their own code shows it: `claude-code/2.1.309 (cli)`,
 * `codex-mcp-client/0.160.0`, `Cursor/3.25.6 (darwin arm64)`.
 */
const USER_AGENTS: ReadonlyArray<readonly [start: string, host: HostId]> = [
  ['claude-code/', 'claude-code'],
  ['codex-mcp-client/', 'codex'],
  ['cursor/', 'cursor'],
];

/** Which host a request's `User-Agent` names, or `null` when it names none of them. */
export function hostOfUserAgent(userAgent: string | null): HostId | null {
  const agent = userAgent?.trim().toLowerCase() ?? '';

  return USER_AGENTS.find(([start]) => agent.startsWith(start))?.[1] ?? null;
}

function isHostId(value: unknown): value is HostId {
  return typeof value === 'string' && (HOST_IDS as readonly string[]).includes(value);
}

/**
 * The session an app gets on `initialize`: its host, then a random part. Every later request of the app
 * carries it (`Mcp-Session-Id`), so a request that isn't `initialize` still tells which host sent it, on
 * whichever Worker instance it lands. Nothing about the session is kept here.
 */
export function sessionIdFor(host: HostId): string {
  return `${host}.${crypto.randomUUID()}`;
}

/** The host a session id names (`sessionIdFor`), or `null` for none, such as one from before sessions had it. */
export function hostOfSession(sessionId: string | null): HostId | null {
  const host = sessionId?.split('.')[0];

  return isHostId(host) ? host : null;
}

/** The hosts whose sign-ins the dashboard is told about: every one but `general`. */
const SIGNED_IN_HOSTS = HOST_IDS.filter((host) => host !== 'general');

type Connections = Partial<Record<HostId, string>>;

/**
 * Each host of an account has its own entry, so two hosts signing in at once can't undo each other. Until
 * hosts were told apart, Claude Code's sign-ins were kept as Claude's; the chat app's are kept under a name
 * of their own since, so an old Claude Code sign-in doesn't read as Claude.
 */
function keyOf(agentInboxUserId: string, host: HostId): string {
  return `tool:${agentInboxUserId}:${host === 'claude' ? 'claude-chat' : host}`;
}

/** Remembers that a host signed in to the account, so the dashboard can say it's connected. */
export async function recordConnection(env: Env, agentInboxUserId: string, host: HostId): Promise<void> {
  await env.CONNECTIONS?.put(keyOf(agentInboxUserId, host), new Date().toISOString());
}

/** The hosts that have signed in to the account, each with when it last connected. */
export async function listConnections(env: Env, agentInboxUserId: string): Promise<Connections> {
  const connections: Connections = {};
  if (!env.CONNECTIONS) {
    return connections;
  }

  const store = env.CONNECTIONS;
  const connectedAt = await Promise.all(SIGNED_IN_HOSTS.map((host) => store.get(keyOf(agentInboxUserId, host))));
  for (const [index, host] of SIGNED_IN_HOSTS.entries()) {
    const at = connectedAt[index];
    if (at) {
      connections[host] = at;
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
