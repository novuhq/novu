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
  reset(): void;
  close(): Promise<void>;
}

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
        standardSigningSecret: `whsec_stub-secret-${webhookIdCounter}`,
        signingSecret: `legacy-stub-secret-${webhookIdCounter}`,
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
      device_code: 'stub-device-code',
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
 * `PHOTON_SPECTRUM_URL` and `PHOTON_MESSAGING_URL`, which both the
 * `PhotonImessageChatProvider` and the API-side photon-webhook-client read as
 * base-URL overrides. One server fakes both the Spectrum Cloud control plane
 * (platform enable, webhooks CRUD, shared users, token mint — enveloped
 * `{succeed, data}` responses) and the imessage-http send transcoder.
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
  process.env.PHOTON_MESSAGING_URL = url;
  // spectrum-ts (used by @photon-ai/chat-adapter-imessage) reads this for its
  // own Spectrum Cloud calls (e.g. token minting on first send).
  process.env.SPECTRUM_CLOUD_URL = url;
  // Device flow + project provisioning (photon-account-client).
  process.env.PHOTON_DASHBOARD_API_URL = url;

  stub = {
    url,
    calls,
    reset: () => {
      calls.length = 0;
      webhooksByProject.clear();
    },
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      stub = undefined;
      delete process.env.PHOTON_SPECTRUM_URL;
      delete process.env.PHOTON_MESSAGING_URL;
      delete process.env.SPECTRUM_CLOUD_URL;
      delete process.env.PHOTON_DASHBOARD_API_URL;
    },
  };

  return stub;
}
