import 'server-only';

import { type JsonBody, readErrorCode, readErrorMessage, safeJson } from './api-response';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER, NOVU_ANALYTICS_SOURCE_HEADER } from './constants';
import type { HumanRegion } from './human-accounts-api';
import { HumanApiError, toHumanApiError } from './human-api-error';
import { resolveNovuApiUrl } from './novu-api';

export type HumanApiRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
};

/**
 * The private `/v1/human/accounts*` endpoints. They trust the secret shared with the Novu API,
 * so only this server may call them; the browser never sees the secret or the keys they return.
 */
export function requestWithDashboardSecret(
  region: HumanRegion,
  path: string,
  init?: HumanApiRequest
): Promise<JsonBody> {
  return send(region, path, dashboardSecretHeader(), init);
}

/**
 * The regular Novu API, as the backing organization's Development environment. Same calls the CLI makes,
 * plus the dashboard's secret: the key alone can't tell the operator from a host, and a paused agent's
 * hosts can't read its inbox while the operator still can.
 */
export function requestWithSecretKey(
  region: HumanRegion,
  secretKey: string,
  path: string,
  init?: HumanApiRequest
): Promise<JsonBody> {
  return send(region, path, { Authorization: `ApiKey ${secretKey}`, ...dashboardSecretHeader() }, init);
}

/** An endpoint anyone may call, such as an agent's public card: neither a key nor the secret goes along. */
export function requestPublic(region: HumanRegion, path: string, init?: HumanApiRequest): Promise<JsonBody> {
  return send(region, path, {}, init);
}

function dashboardSecretHeader(): Record<string, string> {
  return { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: process.env.AGENT_INBOX_DASHBOARD_API_SECRET ?? '' };
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
      headers: { 'Content-Type': 'application/json', [NOVU_ANALYTICS_SOURCE_HEADER]: 'dashboard', ...authHeaders },
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
    const suggestion = typeof responseBody?.suggestion === 'string' ? responseBody.suggestion : undefined;

    throw toHumanApiError(
      response.status,
      readErrorCode(responseBody),
      readErrorMessage(responseBody),
      request,
      suggestion
    );
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
