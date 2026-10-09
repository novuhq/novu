import type { Account } from './auth';

/** An answer from the Human API that isn't a success, with the API's own words for the tool to pass on. */
export class HumanApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** How long a call may take when the caller sets no limit of its own. */
const REQUEST_TIMEOUT_MS = 15_000;

type Query = Record<string, string | number | undefined>;

export type HumanApi = {
  /** `timeoutMs` gives up on the call sooner than the usual limit. */
  get<T>(path: string, query?: Query, timeoutMs?: number): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
};

/** The Human endpoints of the Novu API, called as the account. The same calls the `human` CLI makes. */
export function createHumanApi(account: Account): HumanApi {
  async function send<T>(method: 'GET' | 'POST', path: string, body?: unknown, timeoutMs?: number): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${account.apiUrl}${path}`, {
        method,
        headers: { Authorization: `ApiKey ${account.secretKey}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(Math.max(1, Math.min(timeoutMs ?? REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS))),
      });
    } catch {
      throw new HumanApiError(0, 'Could not reach the Human API. Try again in a moment.');
    }

    const json = (await response.json().catch(() => null)) as { data?: T; message?: unknown } | null;

    if (!response.ok) {
      throw new HumanApiError(
        response.status,
        readMessage(json?.message) ?? `The Human API answered ${response.status}.`
      );
    }

    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  }

  return {
    get: (path, query, timeoutMs) => send('GET', `${path}${toQueryString(query)}`, undefined, timeoutMs),
    post: (path, body) => send('POST', path, body),
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
