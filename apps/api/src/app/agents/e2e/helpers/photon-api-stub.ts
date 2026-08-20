import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordedPhotonCall {
  method: string;
  path: string;
  payload: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
}

export interface PhotonApiStub {
  url: string;
  calls: RecordedPhotonCall[];
  /**
   * Device code the next `/api/auth/device/code` responses issue. Poll outcomes
   * are keyed off the code (`pending-device-code`, `denied-device-code`, else
   * complete), and the API only redeems codes its own start leg issued — so
   * tests choose the outcome here and run the full start → poll flow.
   */
  setNextDeviceCode(code: string): void;
  reset(): void;
  close(): Promise<void>;
}

const DEFAULT_DEVICE_CODE = 'stub-device-code';
let nextDeviceCode = DEFAULT_DEVICE_CODE;

let stub: PhotonApiStub | undefined;

// Registered webhooks per project id, so GET /webhooks reflects earlier creates within a test.
const webhooksByProject = new Map<string, Array<{ id: string; webhookUrl: string }>>();
let webhookIdCounter = 0;

const succeed = (data: unknown) => ({ succeed: true, data });

function buildResponse(method: string, path: string, payload: Record<string, unknown>): Record<string, unknown> {
  // Spectrum Cloud control-plane surface (enveloped responses).
  const platformsMatch = path.match(/^\/projects\/([^/]+)\/platforms$/);
  if (platformsMatch && method === 'PATCH') {
    return succeed({ platform: payload.platform, enabled: payload.enabled });
  }

  const webhooksMatch = path.match(/^\/projects\/([^/]+)\/webhooks$/);
  if (webhooksMatch) {
    const projectId = webhooksMatch[1];
    const registered = webhooksByProject.get(projectId) ?? [];

    if (method === 'GET') {
      return succeed(registered);
    }

    if (method === 'POST') {
      webhookIdCounter += 1;
      const entry = { id: `stub-webhook-${webhookIdCounter}`, webhookUrl: payload.webhookUrl as string };
      webhooksByProject.set(projectId, [...registered, entry]);

      return succeed({
        ...entry,
        schemaVersion: payload.schemaVersion ?? 'normalized-events.v1',
        // Mirrors production: both secrets returned, but only the v0 `signingSecret`
        // is ever used for signing (Standard Webhooks is a future Spectrum refactor).
        standardSigningSecret: `whsec_stub-secret-${webhookIdCounter}`,
        signingSecret: `v0-stub-secret-${webhookIdCounter}`,
      });
    }
  }

  const webhookDeleteMatch = path.match(/^\/projects\/([^/]+)\/webhooks\/([^/]+)$/);
  if (webhookDeleteMatch && method === 'DELETE') {
    const projectId = webhookDeleteMatch[1];
    const registered = webhooksByProject.get(projectId) ?? [];
    webhooksByProject.set(
      projectId,
      registered.filter((entry) => entry.id !== webhookDeleteMatch[2])
    );

    return succeed({ deleted: true });
  }

  if (path.match(/^\/projects\/[^/]+\/users$/) && method === 'POST') {
    return succeed({
      id: 'stub-user-id',
      type: 'shared',
      phoneNumber: payload.phoneNumber,
      assignedPhoneNumber: '+15550001111',
    });
  }

  if (path.match(/^\/projects\/[^/]+\/imessage\/tokens$/) && method === 'POST') {
    return succeed({ type: 'shared', token: 'stub-messaging-token', expiresIn: 900 });
  }

  // imessage-http REST transcoder surface (bare proto3-JSON responses).
  if (path === '/v1/messages:sendText' && method === 'POST') {
    return { messageGuid: `stub-message-${Date.now()}` };
  }

  // Photon Dashboard API surface (better-auth device flow + projects).
  if (path === '/api/auth/device/code' && method === 'POST') {
    return {
      device_code: nextDeviceCode,
      user_code: 'STUB-CODE',
      verification_uri: '/sign-in/device',
      verification_uri_complete: '/sign-in/device?code=STUB-CODE',
      interval: 1,
      expires_in: 1800,
    };
  }

  if (path === '/api/auth/device/token' && method === 'POST') {
    // Deterministic by device_code so tests choose the outcome per request.
    if (payload.device_code === 'pending-device-code') {
      return { __status: 400, error: 'authorization_pending' };
    }
    if (payload.device_code === 'denied-device-code') {
      return { __status: 400, error: 'access_denied' };
    }

    return { access_token: 'stub-access-token' };
  }

  if (path === '/api/projects' && method === 'POST') {
    return { id: 'stub-project-id' };
  }

  if (path.match(/^\/api\/projects\/[^/]+$/) && method === 'GET') {
    return { id: path.split('/').pop(), projectSecret: 'stub-project-secret' };
  }

  return succeed({});
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Boots a minimal in-process Photon API stub and publishes its base URL via
 * `PHOTON_SPECTRUM_URL` (read by both the `PhotonImessageChatProvider` and the
 * API-side photon-webhook-client as a base-URL override) and
 * `PHOTON_DASHBOARD_API_URL` (device flow + project provisioning). It fakes the
 * Spectrum Cloud REST control plane (platform enable, webhooks CRUD, shared
 * users — enveloped `{succeed, data}` responses). The spectrum-ts gRPC send
 * path reads no env vars — tests exercising an outbound send must fake the
 * module graph via `__setPhotonSpectrumImportForTests` instead.
 */
export async function startPhotonApiStub(): Promise<PhotonApiStub> {
  if (stub) return stub;

  const calls: RecordedPhotonCall[] = [];

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? 'GET';
    const path = (req.url ?? '').split('?')[0];
    const payload = await readJsonBody(req);
    calls.push({ method, path, payload, headers: req.headers });

    const { __status, ...body } = buildResponse(method, path, payload) as { __status?: number } & Record<
      string,
      unknown
    >;
    res.writeHead(__status ?? 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  process.env.PHOTON_SPECTRUM_URL = url;
  // Device flow + project provisioning (photon-account-client).
  process.env.PHOTON_DASHBOARD_API_URL = url;

  stub = {
    url,
    calls,
    setNextDeviceCode: (code: string) => {
      nextDeviceCode = code;
    },
    reset: () => {
      calls.length = 0;
      webhooksByProject.clear();
      nextDeviceCode = DEFAULT_DEVICE_CODE;
    },
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      stub = undefined;
      delete process.env.PHOTON_SPECTRUM_URL;
      delete process.env.PHOTON_DASHBOARD_API_URL;
    },
  };

  return stub;
}
