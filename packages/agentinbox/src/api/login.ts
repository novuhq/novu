import { type ApiClient, ApiError, createPublicApiClient, unwrap } from './client';

/** Matches `CLI_DEVICE_SESSION_NAME_HUMAN_CLI` in `@novu/shared`, which this package doesn't depend on. */
export const CLI_SESSION_NAME = 'human-cli';

/** Matches the API's `KEYLESS_SETUP_CLAIMED_CODE`. */
const KEYLESS_SETUP_CLAIMED_CODE = 'keyless_setup_claimed';

/** A `npx @agentinbox/cli login` request, approved or denied by the operator on the Agent Inbox dashboard. */
export interface LoginRequest {
  deviceCode: string;
  expiresIn: number;
  interval: number;
  /** Missing on APIs without the Agent Inbox dashboard (self-hosted), where there's no browser login. */
  verificationUrl?: string;
  /**
   * Shown in the terminal and on that page, so the operator can check both belong to the same login before
   * approving. The device code the CLI polls with never leaves this computer.
   */
  userCode?: string;
}

export type LoginRequestStatus =
  | { status: 'pending'; expiresIn: number; interval: number }
  | { status: 'expired' }
  /** The operator pressed Deny on the page. Only newer APIs answer this; older ones let the request expire. */
  | { status: 'denied' }
  | {
      status: 'approved';
      apiKey: string;
      environmentId: string;
      user?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
    };

/**
 * `machineName` is this computer's name, which the page shows next to the code ("A terminal on ada-laptop…").
 * APIs that don't know it yet ignore it.
 */
export async function startLoginRequest(apiUrl: string, machineName?: string): Promise<LoginRequest> {
  const res = await createPublicApiClient(apiUrl).post<{ data?: LoginRequest } | LoginRequest>(
    '/v1/cli/device-sessions',
    { name: CLI_SESSION_NAME, ...(machineName ? { machineName } : {}) }
  );
  const request = unwrap(res.data);

  if (!request?.deviceCode) {
    throw new Error('The API did not start a login. Please try again.');
  }

  return request;
}

/** Reading an approved request hands over its key once; the request is gone after that. */
export async function checkLoginRequest(apiUrl: string, deviceCode: string): Promise<LoginRequestStatus> {
  const res = await createPublicApiClient(apiUrl).post<{ data?: LoginRequestStatus } | LoginRequestStatus>(
    `/v1/cli/device-sessions/${encodeURIComponent(deviceCode)}/poll`
  );

  return unwrap(res.data);
}

/**
 * The claim token of the keyless setup behind `client`, so logging in also moves that setup into the
 * Agent Inbox account. Null once the setup was claimed already (for example from the "free messages used" link).
 */
export async function getKeylessClaimToken(client: ApiClient): Promise<string | null> {
  try {
    const res = await client.axios.post<{ data?: { token: string } } | { token: string }>('/v1/human/claim-token');

    return unwrap(res.data).token;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && readCode(err.body) === KEYLESS_SETUP_CLAIMED_CODE) {
      return null;
    }

    throw err;
  }
}

/** Whether the environment behind `client` has this subscriber. Only a definite 404 counts as missing. */
export async function hasSubscriber(client: ApiClient, subscriberId: string): Promise<boolean> {
  try {
    await client.axios.get(`/v2/subscribers/${encodeURIComponent(subscriberId)}`);

    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return false;
    }

    throw err;
  }
}

/**
 * The contact the account behind `client` has for its owner: made by `npx @agentinbox/cli setup` on any computer, or on
 * the Agent Inbox dashboard. Undefined when the account has none yet. APIs from before it was recorded answer 404.
 */
export async function findOperator(client: ApiClient): Promise<string | undefined> {
  try {
    const res = await client.axios.get<{ data?: { subscriberId?: string } } | { subscriberId?: string }>(
      '/v1/human/operator'
    );

    return unwrap(res.data)?.subscriberId || undefined;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return undefined;
    }

    throw err;
  }
}

function readCode(body: unknown): string | undefined {
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined;

  return typeof code === 'string' ? code : undefined;
}
