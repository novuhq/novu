import type { Account } from './auth';

/** An answer from the Agent Inbox API that isn't a success, with the API's own words for the tool to pass on. */
export class AgentInboxApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The API's own code when it sends one, such as `inbox_address_taken`. */
    readonly code?: string,
    /** A nearby free handle when a chosen address was taken. */
    readonly suggestion?: string
  ) {
    super(message);
  }
}

/** How long a call may take when the caller sets no limit of its own. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Matches the API's `AGENT_INBOX_VIA_HEADER`. The account's key is the same one the CLI holds, so this is
 * what tells the API that reading the inbox here is a host checking it through MCP.
 */
export const AGENT_INBOX_VIA_HEADER = 'Agent-Inbox-Via';

/** Matches Novu's `NOVU_ANALYTICS_SOURCE_HEADER`. Tells Novu's analytics the request comes from this server. */
export const ANALYTICS_SOURCE_HEADER = 'Novu-Analytics-Source';

type Query = Record<string, string | number | undefined>;

export type AgentInboxApi = {
  /** `timeoutMs` replaces the usual limit on how long the call may take. */
  get<T>(path: string, query?: Query, timeoutMs?: number): Promise<T>;
  /**
   * Like `get`, but keeps the JSON body as the API sent it. Use for paginated list responses that
   * already carry `{ data, next }`: unwrapping would throw `next` away.
   */
  getRaw<T>(path: string, query?: Query, timeoutMs?: number): Promise<T>;
  post<T>(path: string, body: unknown, timeoutMs?: number): Promise<T>;
};

/**
 * The Agent Inbox Dashboard API (`AGENT_INBOX_API_URL`), called as the account with its key: the same calls the
 * `agentinbox` CLI makes. The dashboard forwards them to the Novu API.
 */
export function createAgentInboxApi(account: Account): AgentInboxApi {
  async function send<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown | undefined,
    timeoutMs: number | undefined,
    unwrap: boolean
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${account.apiUrl}${path}`, {
        method,
        headers: {
          Authorization: `ApiKey ${account.secretKey}`,
          'Content-Type': 'application/json',
          [AGENT_INBOX_VIA_HEADER]: 'mcp',
          [ANALYTICS_SOURCE_HEADER]: 'mcp',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(Math.max(1, timeoutMs ?? REQUEST_TIMEOUT_MS)),
      });
    } catch {
      throw new AgentInboxApiError(0, 'Could not reach the Agent Inbox API. Try again in a moment.');
    }

    const json = (await response.json().catch(() => null)) as {
      data?: T;
      message?: unknown;
      code?: unknown;
      suggestion?: unknown;
    } | null;

    if (!response.ok) {
      throw new AgentInboxApiError(
        response.status,
        readMessage(json?.message) ?? `The Agent Inbox API answered ${response.status}.`,
        typeof json?.code === 'string' ? json.code : undefined,
        typeof json?.suggestion === 'string' ? json.suggestion : undefined
      );
    }

    if (!unwrap) {
      return json as T;
    }

    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  }

  return {
    get: (path, query, timeoutMs) => send('GET', `${path}${toQueryString(query)}`, undefined, timeoutMs, true),
    getRaw: (path, query, timeoutMs) => send('GET', `${path}${toQueryString(query)}`, undefined, timeoutMs, false),
    post: (path, body, timeoutMs) => send('POST', path, body, timeoutMs, true),
  };
}

function readMessage(message: unknown): string | undefined {
  if (typeof message === 'string') {
    return message;
  }

  return Array.isArray(message) ? message.filter((part) => typeof part === 'string').join(' ') || undefined : undefined;
}

function toQueryString(query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(name, String(value));
    }
  }

  return params.size ? `?${params}` : '';
}
