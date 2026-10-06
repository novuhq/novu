import 'server-only';

import { type JsonBody, readErrorCode, readErrorMessage, safeJson } from './api-response';
import type { HumanRegion } from './human-accounts-api';
import { HumanApiError, toHumanApiError } from './human-api-error';
import { resolveNovuApiUrl } from './novu-api';

export type HumanApiRequest = {
  method?: 'GET' | 'POST' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
};

/**
 * The private `/v1/human/accounts*` endpoints. They trust the secret shared with the Novu API,
 * so only this server may call them; the browser never sees the secret or the keys they return.
 */
export function requestWithDashboardSecret(region: HumanRegion, path: string, init?: HumanApiRequest): Promise<JsonBody> {
  return send(region, path, { 'x-human-dashboard-secret': process.env.HUMAN_DASHBOARD_API_SECRET ?? '' }, init);
}

/** The regular Novu API, as the backing organization's Development environment. Same calls the CLI makes. */
export function requestWithSecretKey(
  region: HumanRegion,
  secretKey: string,
  path: string,
  init?: HumanApiRequest
): Promise<JsonBody> {
  return send(region, path, { Authorization: `ApiKey ${secretKey}` }, init);
}

/** For what the API can't do yet, so the pages can be built against the final function names. */
export function notAvailableYet(what: string): never {
  throw new HumanApiError(501, 'not_available_yet', `${what} isn’t available yet.`);
}

/** Returns the body as the API sent it; callers unwrap `{ data }` or read a page's `next` themselves. */
async function send(
  region: HumanRegion,
  path: string,
  authHeaders: Record<string, string>,
  { method = 'GET', query, body }: HumanApiRequest = {}
): Promise<JsonBody> {
  const request = `${method} ${path}`;
  let response: Response;

  try {
    response = await fetch(`${resolveNovuApiUrl(region)}${path}${toQueryString(query)}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    const unreachable = toHumanApiError(0, undefined, undefined, request);
    unreachable.cause = error;

    throw unreachable;
  }

  const responseBody = await safeJson(response);

  if (!response.ok) {
    throw toHumanApiError(response.status, readErrorCode(responseBody), readErrorMessage(responseBody), request);
  }

  return responseBody;
}

function toQueryString(query: HumanApiRequest['query']): string {
  const params = new URLSearchParams();

  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      params.set(name, String(value));
    }
  }

  return params.size > 0 ? `?${params}` : '';
}
