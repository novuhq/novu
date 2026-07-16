/**
 * Server-side helpers for provisioning per-subscriber PagerDuty endpoints in Novu.
 *
 * WHY THIS MUST BE SERVER-SIDE
 * Creating a ChannelEndpoint requires the Novu secret key (sk_...) which must
 * never be exposed to the browser. Use this from a Next.js API route or any
 * server-side handler running under the customer's control.
 *
 * WHY RAW FETCH INSTEAD OF `@novu/api`
 * The `pagerduty_service` endpoint type is new. The auto-generated internal SDK
 * has not been regenerated for it yet, so its `CreateChannelEndpointRequestBody`
 * union does not include `CreatePagerDutyServiceEndpointDto`. We call the raw
 * REST endpoint here to sidestep the stale SDK types — once the OpenAPI regen
 * runs, this helper can be swapped for `novu.channelEndpoints.create(...)`
 * without any behaviour change.
 *
 * MODEL
 * PagerDuty is routed per subscriber. Each subscriber owns exactly one
 * `pagerduty_service` endpoint per integration. The Novu API persists the
 * routing key encrypted on the linked ChannelConnection; on read it hydrates
 * the wire shape `{ routingKey, region }` back into the response so the caller
 * can display or rotate it (dashboards typically mask client-side).
 *
 * REQUIRED ENV VARS
 *   NOVU_SECRET_KEY                              Novu API secret key (sk_...)
 *   NOVU_API_BASE_URL                            Optional Novu API base URL (falls back to
 *                                                NEXT_PUBLIC_NOVU_BACKEND_URL, then https://api.novu.co)
 *   NOVU_CONNECT_PAGERDUTY_INTEGRATION_IDENTIFIER  Novu integration identifier for the PagerDuty integration
 */

const PAGERDUTY_SERVICE_TYPE = 'pagerduty_service' as const;
const PAGERDUTY_ROUTING_KEY_LENGTH = 32;

export type PagerDutyRegion = 'us' | 'eu';

export type PagerDutyEndpoint = {
  identifier: string;
  subscriberId: string | null;
  integrationIdentifier: string | null;
  connectionIdentifier: string | null;
  type: typeof PAGERDUTY_SERVICE_TYPE;
  endpoint: { routingKey: string; region: PagerDutyRegion };
  updatedAt: string;
};

export type EnsurePagerDutyEndpointResult =
  | { ok: true; endpoint: PagerDutyEndpoint; rotated: boolean }
  | { ok: false; error: string; status?: number };

export type ListPagerDutyEndpointsResult =
  | { ok: true; endpoints: PagerDutyEndpoint[] }
  | { ok: false; error: string; status?: number };

export type DeletePagerDutyEndpointResult = { ok: true } | { ok: false; error: string; status?: number };

type NovuAuthContext = {
  baseUrl: string;
  secretKey: string;
};

function getNovuAuthContext(): NovuAuthContext {
  const secretKey = process.env.NOVU_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error('NOVU_SECRET_KEY is required');
  }

  const baseUrl = (
    process.env.NOVU_API_BASE_URL ??
    process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ??
    'https://api.novu.co'
  ).replace(/\/+$/, '');

  return { baseUrl, secretKey };
}

function isPagerDutyRegion(value: unknown): value is PagerDutyRegion {
  return value === 'us' || value === 'eu';
}

/**
 * Basic format check — mirrors the API-side validator so we can surface a
 * useful error message client-side without a network roundtrip. The API also
 * enforces this, so a client bypassing this check still gets a 400.
 */
export function isValidRoutingKey(value: string): boolean {
  return /^[a-zA-Z0-9]{32}$/.test(value);
}

async function novuFetch(
  auth: NovuAuthContext,
  path: string,
  init: { method: string; body?: unknown; searchParams?: Record<string, string> } = { method: 'GET' }
): Promise<{ status: number; body: unknown }> {
  const url = new URL(`${auth.baseUrl}${path}`);

  for (const [key, value] of Object.entries(init.searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: init.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${auth.secretKey}`,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  // 204 responses on DELETE have no body.
  if (response.status === 204) {
    return { status: response.status, body: null };
  }

  const text = await response.text();
  const parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null;

  return { status: response.status, body: parsed };
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const asRecord = body as Record<string, unknown>;
    const message = asRecord.message ?? asRecord.error;

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.map(String).join('; ');
    }
  }

  return fallback;
}

function isPagerDutyEndpoint(value: unknown): value is PagerDutyEndpoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const endpoint = record.endpoint as Record<string, unknown> | undefined;

  return (
    record.type === PAGERDUTY_SERVICE_TYPE &&
    typeof record.identifier === 'string' &&
    !!endpoint &&
    typeof endpoint === 'object' &&
    typeof endpoint.routingKey === 'string' &&
    isPagerDutyRegion(endpoint.region)
  );
}

/**
 * Provision (or rotate) the subscriber's PagerDuty routing key.
 *
 * The uniqueness invariant lives in Mongo: at most one `pagerduty_service`
 * endpoint per (env, subscriber, integration). If one exists, POST returns 409
 * — we detect that and PATCH the existing endpoint's routingKey / region on
 * the linked connection instead. Net effect: this helper is idempotent for
 * writes and doubles as a "rotate" primitive.
 */
export async function ensurePagerDutyEndpoint(args: {
  subscriberId: string;
  integrationIdentifier: string;
  routingKey: string;
  region: PagerDutyRegion;
}): Promise<EnsurePagerDutyEndpointResult> {
  const auth = getNovuAuthContext();
  const { subscriberId, integrationIdentifier, routingKey, region } = args;

  if (!isValidRoutingKey(routingKey)) {
    return {
      ok: false,
      error: `routingKey must be a ${PAGERDUTY_ROUTING_KEY_LENGTH}-character alphanumeric PagerDuty Events API v2 integration key`,
    };
  }

  const createRes = await novuFetch(auth, '/v1/channel-endpoints', {
    method: 'POST',
    body: {
      type: PAGERDUTY_SERVICE_TYPE,
      subscriberId,
      // The connect surface is often the user's first touchpoint with Novu —
      // JIT-create the subscriber instead of requiring a prior identify call.
      createSubscriberIfMissing: true,
      integrationIdentifier,
      endpoint: { routingKey, region },
    },
  });

  if (createRes.status >= 200 && createRes.status < 300) {
    const data = (createRes.body as { data?: unknown; endpoint?: unknown }) ?? {};
    const payload = ('data' in data ? data.data : data) as unknown;

    if (isPagerDutyEndpoint(payload)) {
      return { ok: true, endpoint: payload, rotated: false };
    }

    return { ok: false, error: 'Unexpected response shape from POST /v1/channel-endpoints', status: createRes.status };
  }

  // 409 Conflict → an endpoint already exists for this (subscriber, integration).
  // The plan (Q3) chose 409 over upsert so callers make an explicit rotation
  // decision; here we opt into rotation because the helper's contract is
  // "make this subscriber's PagerDuty routing match the supplied values".
  if (createRes.status === 409) {
    const listResult = await listPagerDutyEndpoints({ subscriberId, integrationIdentifier });

    if (!listResult.ok) {
      return { ok: false, error: listResult.error, status: listResult.status };
    }

    const existing = listResult.endpoints.find(
      (ep) => ep.integrationIdentifier === integrationIdentifier && ep.subscriberId === subscriberId
    );

    if (!existing) {
      return {
        ok: false,
        error: 'API reported a conflict but no existing PagerDuty endpoint was found on list',
        status: 409,
      };
    }

    const patchRes = await novuFetch(auth, `/v1/channel-endpoints/${encodeURIComponent(existing.identifier)}`, {
      method: 'PATCH',
      body: { endpoint: { routingKey, region } },
    });

    if (patchRes.status >= 200 && patchRes.status < 300) {
      const data = (patchRes.body as { data?: unknown }) ?? {};
      const payload = ('data' in data ? data.data : data) as unknown;

      if (isPagerDutyEndpoint(payload)) {
        return { ok: true, endpoint: payload, rotated: true };
      }

      return {
        ok: false,
        error: 'Unexpected response shape from PATCH /v1/channel-endpoints/:identifier',
        status: patchRes.status,
      };
    }

    return {
      ok: false,
      status: patchRes.status,
      error: extractErrorMessage(patchRes.body, `Rotate failed with HTTP ${patchRes.status}`),
    };
  }

  return {
    ok: false,
    status: createRes.status,
    error: extractErrorMessage(createRes.body, `Create failed with HTTP ${createRes.status}`),
  };
}

export async function listPagerDutyEndpoints(args: {
  subscriberId: string;
  integrationIdentifier?: string;
}): Promise<ListPagerDutyEndpointsResult> {
  const auth = getNovuAuthContext();

  const searchParams: Record<string, string> = {
    subscriberId: args.subscriberId,
    limit: '100',
  };

  if (args.integrationIdentifier) {
    searchParams.integrationIdentifier = args.integrationIdentifier;
  }

  const res = await novuFetch(auth, '/v1/channel-endpoints', { method: 'GET', searchParams });

  if (res.status < 200 || res.status >= 300) {
    return {
      ok: false,
      status: res.status,
      error: extractErrorMessage(res.body, `List failed with HTTP ${res.status}`),
    };
  }

  const body = (res.body as { data?: unknown }) ?? {};
  const items = Array.isArray(body.data) ? body.data : [];
  const endpoints = items.filter(isPagerDutyEndpoint);

  return { ok: true, endpoints };
}

export async function deletePagerDutyEndpoint(identifier: string): Promise<DeletePagerDutyEndpointResult> {
  const auth = getNovuAuthContext();

  const res = await novuFetch(auth, `/v1/channel-endpoints/${encodeURIComponent(identifier)}`, { method: 'DELETE' });

  if (res.status >= 200 && res.status < 300) {
    return { ok: true };
  }

  return {
    ok: false,
    status: res.status,
    error: extractErrorMessage(res.body, `Delete failed with HTTP ${res.status}`),
  };
}
