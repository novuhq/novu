/**
 * Server-side helpers for provisioning per-subscriber Grafana endpoints in Novu.
 *
 * WHY THIS MUST BE SERVER-SIDE
 * Creating a ChannelEndpoint requires the Novu secret key (sk_...) which must
 * never be exposed to the browser. Use this from a Next.js API route or any
 * server-side handler running under the customer's control.
 *
 * WHY RAW FETCH INSTEAD OF `@novu/api`
 * The `grafana_oncall_integration` endpoint type is new. The auto-generated
 * internal SDK has not been regenerated for it yet, so its
 * `CreateChannelEndpointRequestBody` union does not include
 * `CreateGrafanaOnCallIntegrationEndpointDto`. We call the raw REST endpoint
 * here to sidestep the stale SDK types. Once the OpenAPI regen runs, this
 * helper can be swapped for `novu.channelEndpoints.create(...)` without any
 * behaviour change.
 *
 * MODEL
 * Grafana is routed per subscriber. Each subscriber owns exactly one
 * `grafana_oncall_integration` endpoint per integration. The Novu API persists
 * the webhook URL (and optional bearer token) encrypted on the endpoint
 * document; on read it returns the wire shape `{ url, authToken? }` so the
 * caller can display or rotate it (dashboards typically mask client-side).
 *
 * REQUIRED ENV VARS
 *   NOVU_SECRET_KEY                             Novu API secret key (sk_...)
 *   NOVU_API_BASE_URL                           Optional Novu API base URL (falls back to
 *                                               NEXT_PUBLIC_NOVU_BACKEND_URL, then https://api.novu.co)
 *   NOVU_CONNECT_GRAFANA_INTEGRATION_IDENTIFIER Novu integration identifier for the Grafana integration
 */

const GRAFANA_ONCALL_INTEGRATION_TYPE = 'grafana_oncall_integration' as const;

export type GrafanaEndpoint = {
  identifier: string;
  subscriberId: string | null;
  integrationIdentifier: string | null;
  connectionIdentifier: string | null;
  type: typeof GRAFANA_ONCALL_INTEGRATION_TYPE;
  endpoint: { url: string; authToken?: string };
  updatedAt: string;
};

export type EnsureGrafanaEndpointResult =
  | { ok: true; endpoint: GrafanaEndpoint; rotated: boolean }
  | { ok: false; error: string; status?: number };

export type ListGrafanaEndpointsResult =
  | { ok: true; endpoints: GrafanaEndpoint[] }
  | { ok: false; error: string; status?: number };

export type DeleteGrafanaEndpointResult = { ok: true } | { ok: false; error: string; status?: number };

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

/**
 * Basic format check. Mirrors the API-side validator so we can surface a
 * useful error message client-side without a network roundtrip. The API also
 * enforces this, so a client bypassing this check still gets a 400.
 */
export function isValidGrafanaWebhookUrl(value: string): boolean {
  return /^https:\/\/[^\s/]+(?:\/[^\s]*)?\/integrations\/v1\/formatted_webhook\/[a-zA-Z0-9]+\/?$/.test(value);
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

function isGrafanaEndpoint(value: unknown): value is GrafanaEndpoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const endpoint = record.endpoint as Record<string, unknown> | undefined;

  return (
    record.type === GRAFANA_ONCALL_INTEGRATION_TYPE &&
    typeof record.identifier === 'string' &&
    !!endpoint &&
    typeof endpoint === 'object' &&
    typeof endpoint.url === 'string'
  );
}

/**
 * Provision (or rotate) the subscriber's Grafana webhook URL.
 *
 * The uniqueness invariant lives in Mongo: at most one
 * `grafana_oncall_integration` endpoint per (env, subscriber, integration).
 * If one exists, POST returns 409; we detect that and PATCH the existing
 * endpoint's url / authToken instead. Net effect: this helper is idempotent
 * for writes and doubles as a "rotate" primitive.
 */
export async function ensureGrafanaEndpoint(args: {
  subscriberId: string;
  integrationIdentifier: string;
  url: string;
  authToken?: string;
}): Promise<EnsureGrafanaEndpointResult> {
  const auth = getNovuAuthContext();
  const { subscriberId, integrationIdentifier, url, authToken } = args;

  if (!isValidGrafanaWebhookUrl(url)) {
    return {
      ok: false,
      error:
        'url must be an HTTPS Grafana IRM/OnCall Formatted Webhook URL ending in /integrations/v1/formatted_webhook/<token>/',
    };
  }

  const endpointPayload = { url, ...(authToken ? { authToken } : {}) };

  const createRes = await novuFetch(auth, '/v1/channel-endpoints', {
    method: 'POST',
    body: {
      type: GRAFANA_ONCALL_INTEGRATION_TYPE,
      subscriberId,
      // The connect surface is often the user's first touchpoint with Novu:
      // JIT-create the subscriber instead of requiring a prior identify call.
      createSubscriberIfMissing: true,
      integrationIdentifier,
      endpoint: endpointPayload,
    },
  });

  if (createRes.status >= 200 && createRes.status < 300) {
    const data = (createRes.body as { data?: unknown; endpoint?: unknown }) ?? {};
    const payload = ('data' in data ? data.data : data) as unknown;

    if (isGrafanaEndpoint(payload)) {
      return { ok: true, endpoint: payload, rotated: false };
    }

    return { ok: false, error: 'Unexpected response shape from POST /v1/channel-endpoints', status: createRes.status };
  }

  // 409 Conflict → an endpoint already exists for this (subscriber, integration).
  // Rotation is opt-in here because the helper's contract is "make this
  // subscriber's Grafana routing match the supplied values".
  if (createRes.status === 409) {
    const listResult = await listGrafanaEndpoints({ subscriberId, integrationIdentifier });

    if (!listResult.ok) {
      return { ok: false, error: listResult.error, status: listResult.status };
    }

    const existing = listResult.endpoints.find(
      (ep) => ep.integrationIdentifier === integrationIdentifier && ep.subscriberId === subscriberId
    );

    if (!existing) {
      return {
        ok: false,
        error: 'API reported a conflict but no existing Grafana endpoint was found on list',
        status: 409,
      };
    }

    const patchRes = await novuFetch(auth, `/v1/channel-endpoints/${encodeURIComponent(existing.identifier)}`, {
      method: 'PATCH',
      body: { endpoint: endpointPayload },
    });

    if (patchRes.status >= 200 && patchRes.status < 300) {
      const data = (patchRes.body as { data?: unknown }) ?? {};
      const payload = ('data' in data ? data.data : data) as unknown;

      if (isGrafanaEndpoint(payload)) {
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

export async function listGrafanaEndpoints(args: {
  subscriberId: string;
  integrationIdentifier?: string;
}): Promise<ListGrafanaEndpointsResult> {
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
  const endpoints = items.filter(isGrafanaEndpoint);

  return { ok: true, endpoints };
}

export async function deleteGrafanaEndpoint(identifier: string): Promise<DeleteGrafanaEndpointResult> {
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
