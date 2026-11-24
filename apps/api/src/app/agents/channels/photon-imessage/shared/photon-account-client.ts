import axios, { AxiosError } from 'axios';
import { env } from '../../../../../config/env';

const PHOTON_API_TIMEOUT_MS = 10_000;
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
const DEVICE_SCOPE = 'openid profile email';

export interface PhotonDeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  /** Poll cadence in seconds. */
  interval: number;
  /** Device-code lifetime in seconds. */
  expiresIn: number;
}

export type PhotonDeviceTokenPoll =
  | { status: 'complete'; accessToken: string }
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'denied' }
  | { status: 'expired' };

export interface PhotonProjectCredentials {
  projectId: string;
  projectSecret: string;
}

function dashboardApiUrl(): string {
  return env.PHOTON_DASHBOARD_API_URL.replace(/\/$/, '');
}

function deviceClientId(): string {
  return env.PHOTON_DEVICE_CLIENT_ID;
}

/** Connect is on by default (all endpoints are live in production); opt out with PHOTON_CONNECT_ENABLED=false. */
export function isPhotonConnectEnabled(): boolean {
  return env.PHOTON_CONNECT_ENABLED;
}

function absolutizeVerificationUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;

  return uri.startsWith('/') ? `${dashboardApiUrl()}${uri}` : uri;
}

/** Starts the OAuth 2.0 device authorization flow (better-auth `/api/auth/device/code`). */
export async function startPhotonDeviceAuthorization(): Promise<PhotonDeviceAuthorization> {
  const { data } = await axios.post<{
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    interval?: number;
    expires_in?: number;
  }>(
    `${dashboardApiUrl()}/api/auth/device/code`,
    { client_id: deviceClientId(), scope: DEVICE_SCOPE },
    { timeout: PHOTON_API_TIMEOUT_MS }
  );

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: absolutizeVerificationUri(data.verification_uri) as string,
    verificationUriComplete: absolutizeVerificationUri(data.verification_uri_complete),
    interval: data.interval ?? 5,
    expiresIn: data.expires_in ?? 1800,
  };
}

/**
 * One poll of the device token endpoint. OAuth poll errors are normal flow
 * control (RFC 8628); HTTP 429 is server rate limiting and is treated like
 * `slow_down`. Anything else is a genuine failure and throws.
 */
export async function pollPhotonDeviceToken(deviceCode: string): Promise<PhotonDeviceTokenPoll> {
  try {
    const { data } = await axios.post<{ access_token?: string }>(
      `${dashboardApiUrl()}/api/auth/device/token`,
      { grant_type: DEVICE_GRANT_TYPE, device_code: deviceCode, client_id: deviceClientId() },
      { timeout: PHOTON_API_TIMEOUT_MS }
    );

    if (data?.access_token) {
      return { status: 'complete', accessToken: data.access_token };
    }

    return { status: 'pending' };
  } catch (error) {
    const axiosError = error as AxiosError<{ error?: string }>;
    if (axiosError.response?.status === 429) {
      return { status: 'slow_down' };
    }

    switch (axiosError.response?.data?.error) {
      case 'authorization_pending':
        return { status: 'pending' };
      case 'slow_down':
        return { status: 'slow_down' };
      case 'access_denied':
        return { status: 'denied' };
      case 'expired_token':
        return { status: 'expired' };
      default:
        throw error;
    }
  }
}

/**
 * Creates a Photon project with the iMessage platform enabled, using the
 * device-flow access token. Project-create warnings (e.g.
 * `shared_line_unavailable`) are non-fatal and returned for surfacing.
 */
export async function createPhotonProject(
  accessToken: string,
  name: string
): Promise<{ projectId: string; warning?: string }> {
  const { data } = await axios.post<{ id?: string; error?: string; warning?: { message?: string } | string }>(
    `${dashboardApiUrl()}/api/projects`,
    { name, platforms: ['imessage'] },
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: PHOTON_API_TIMEOUT_MS }
  );

  if (data?.error || !data?.id) {
    throw new Error(data?.error ?? 'Photon did not return a project id');
  }

  const warning = typeof data.warning === 'string' ? data.warning : data.warning?.message;

  return { projectId: data.id, ...(warning ? { warning } : {}) };
}

/**
 * Reads the project's Spectrum credentials. `projectSecret` is only returned
 * to first-party sessions (device-flow tokens qualify; third-party OAuth apps
 * get it blanked server-side).
 */
export async function getPhotonProjectCredentials(
  accessToken: string,
  projectId: string
): Promise<PhotonProjectCredentials> {
  const { data } = await axios.get<{ id?: string; projectSecret?: string | null }>(
    `${dashboardApiUrl()}/api/projects/${projectId}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: PHOTON_API_TIMEOUT_MS }
  );

  if (!data?.projectSecret) {
    throw new Error('Photon did not return the project secret for this session');
  }

  return { projectId, projectSecret: data.projectSecret };
}
