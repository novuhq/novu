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

export type HumanApi = {
  get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
};

/** The Human endpoints of the Novu API, called as the account. The same calls the `human` CLI makes. */
export function createHumanApi(account: Account): HumanApi {
  async function send<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${account.apiUrl}${path}`, {
        method,
        headers: { Authorization: `ApiKey ${account.secretKey}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
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
    get: (path, query) => send('GET', `${path}${toQueryString(query)}`),
    post: (path, body) => send('POST', path, body),
  };
}

function readMessage(message: unknown): string | undefined {
  if (typeof message === 'string') {
    return message;
  }

  return Array.isArray(message) ? message.filter((part) => typeof part === 'string').join(' ') || undefined : undefined;
}

function toQueryString(query: Record<string, string | number | undefined> = {}): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(name, String(value));
    }
  }

  return params.size ? `?${params}` : '';
}
