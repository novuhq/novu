import axios, { AxiosInstance } from 'axios';

const PHOTON_API_TIMEOUT_MS = 10_000;
const DEFAULT_SPECTRUM_URL = 'https://spectrum.photon.codes';
const NORMALIZED_EVENTS_SCHEMA_VERSION = 'normalized-events.v1';

export interface PhotonWebhookClientCredentials {
  projectId: string;
  projectSecret: string;
}

export type PhotonWebhookEntry = {
  id: string;
  webhookUrl: string;
};

export type PhotonCreatedWebhook = PhotonWebhookEntry & {
  /**
   * `whsec_` Standard Webhooks secret. Returned by the API but NOT yet used
   * for signing — Standard Webhooks support is a future Spectrum refactor.
   */
  standardSigningSecret: string;
  /**
   * The native `X-Spectrum-Signature` v0 secret — the scheme Spectrum
   * production actually signs deliveries with. Photon returns both secrets
   * exactly once, at registration — they cannot be recovered from the list
   * endpoint later.
   */
  signingSecret: string;
};

interface PhotonEnvelope<T> {
  succeed: boolean;
  data: T | null;
  code?: string;
  message?: string;
}

function spectrumUrl(): string {
  return (process.env.PHOTON_SPECTRUM_URL ?? DEFAULT_SPECTRUM_URL).replace(/\/$/, '');
}

function buildClient(credentials: PhotonWebhookClientCredentials): AxiosInstance {
  return axios.create({
    baseURL: `${spectrumUrl()}/projects/${credentials.projectId}`,
    auth: { username: credentials.projectId, password: credentials.projectSecret },
    timeout: PHOTON_API_TIMEOUT_MS,
  });
}

function unwrap<T>(envelope: PhotonEnvelope<T> | undefined, action: string): T {
  assertSucceeded(envelope, action);

  if (envelope.data === null || envelope.data === undefined) {
    throw new Error(envelope.message ?? envelope.code ?? `Photon rejected the ${action} request`);
  }

  return envelope.data;
}

/**
 * For calls whose success carries no payload (platform enable, webhook delete):
 * Photon may legitimately return `{succeed: true, data: null}` there, which
 * `unwrap` would misreport as a failure.
 */
function assertSucceeded(
  envelope: PhotonEnvelope<unknown> | undefined,
  action: string
): asserts envelope is PhotonEnvelope<unknown> {
  if (!envelope?.succeed) {
    throw new Error(envelope?.message ?? envelope?.code ?? `Photon rejected the ${action} request`);
  }
}

/**
 * Enables the iMessage platform on the project. Idempotent — enabling an
 * already-enabled platform succeeds. Token issuance (and therefore every
 * outbound send) 403s until this has been done once for the project.
 */
export async function enablePhotonImessagePlatform(credentials: PhotonWebhookClientCredentials): Promise<void> {
  const client = buildClient(credentials);
  const { data } = await client.patch<PhotonEnvelope<unknown>>('/platforms', { platform: 'imessage', enabled: true });
  assertSucceeded(data, 'platform enable');
}

/**
 * Lists the webhooks registered on the Photon project. Unlike Sendblue,
 * webhooks are project-scoped, and the list never includes signing secrets.
 */
export async function listPhotonWebhooks(credentials: PhotonWebhookClientCredentials): Promise<PhotonWebhookEntry[]> {
  const client = buildClient(credentials);
  const { data } = await client.get<PhotonEnvelope<Array<{ id: string; webhookUrl: string }>>>('/webhooks');

  return unwrap(data, 'webhook list').map((entry) => ({ id: entry.id, webhookUrl: entry.webhookUrl }));
}

/**
 * Registers a webhook for inbound message events on the `normalized-events.v1`
 * schema. Photon issues the signing secrets and returns them ONCE in this
 * response — the caller must persist `signingSecret` immediately.
 * Returns 409 when an active webhook with the same URL already exists.
 */
export async function createPhotonWebhook(
  credentials: PhotonWebhookClientCredentials,
  webhookUrl: string
): Promise<PhotonCreatedWebhook> {
  const client = buildClient(credentials);
  const { data } = await client.post<PhotonEnvelope<PhotonCreatedWebhook>>('/webhooks', {
    webhookUrl,
    schemaVersion: NORMALIZED_EVENTS_SCHEMA_VERSION,
  });

  return unwrap(data, 'webhook registration');
}

export interface PhotonSharedUser {
  id: string;
  phoneNumber: string;
  /** The shared-pool number Photon allocated for this recipient — the number they text. */
  assignedPhoneNumber?: string;
}

/**
 * Registers a recipient on the project's shared iMessage line (idempotent per
 * phone number; plan caps apply). Supplying `email` makes Photon send an
 * opt-in invite (rate-limited to one per user per 24h). The recipient still
 * has to opt in — text the assigned number or accept the invite — before
 * outbound sends to them succeed.
 */
export async function createPhotonSharedUser(
  credentials: PhotonWebhookClientCredentials,
  user: { phoneNumber: string; email?: string; firstName?: string; lastName?: string }
): Promise<PhotonSharedUser> {
  const client = buildClient(credentials);
  const { data } = await client.post<PhotonEnvelope<PhotonSharedUser>>('/users', { type: 'shared', ...user });

  return unwrap(data, 'shared user registration');
}

/** Removes webhooks by id. Deletion invalidates the webhook's signing secrets. No-ops when `ids` is empty. */
export async function deletePhotonWebhooks(credentials: PhotonWebhookClientCredentials, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const client = buildClient(credentials);
  for (const id of ids) {
    const { data } = await client.delete<PhotonEnvelope<unknown>>(`/webhooks/${id}`);
    assertSucceeded(data, 'webhook removal');
  }
}
