import 'server-only';

import { readErrorCode, readErrorMessage, safeJson, unwrapData } from './api-response';
import { resolveNovuApiUrl } from './novu-api';

export type HumanRegion = 'us' | 'eu';

export const REGION_NAMES: Record<HumanRegion, string> = { us: 'US', eu: 'EU' };

/** Where a Human account's backing organization lives in Novu. */
export type BackingAccount = {
  organizationId: string;
  userId: string;
  environmentId: string;
  region: HumanRegion;
};

type Identity = {
  humanUserId: string;
  firstName?: string | null;
  lastName?: string | null;
};

export class HumanAccountsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string
  ) {
    super(message);
  }
}

/**
 * Private Novu endpoints behind Human accounts. They trust the secret shared with the Novu API,
 * so only this server may call them; the browser never sees the secret or the keys they return.
 */
export function ensureBackingAccount(region: HumanRegion, identity: Identity): Promise<BackingAccount> {
  return request(region, '/v1/human/accounts', { method: 'POST', body: toIdentityBody(identity) });
}

export function claimKeylessSetup(
  region: HumanRegion,
  identity: Identity,
  token: string
): Promise<{ environmentId: string; agentIdentifier?: string }> {
  return request(region, '/v1/human/accounts/claim', {
    method: 'POST',
    body: { ...toIdentityBody(identity), token },
  });
}

/** Approves a `human login` request, so the waiting CLI gets the account's Development key. */
export function approveCliLogin(
  region: HumanRegion,
  identity: Identity & { email?: string | null },
  deviceCode: string
): Promise<{ environmentId: string }> {
  return request(region, '/v1/human/accounts/cli-login', {
    method: 'POST',
    body: { ...toIdentityBody(identity), ...(identity.email ? { email: identity.email } : {}), deviceCode },
  });
}

export function getBackingSecretKey(
  region: HumanRegion,
  humanUserId: string
): Promise<{ environmentId: string; secretKey: string }> {
  return request(region, `/v1/human/accounts/${encodeURIComponent(humanUserId)}/secret-key`, { method: 'GET' });
}

export async function deleteBackingAccount(region: HumanRegion, humanUserId: string): Promise<void> {
  await request(region, `/v1/human/accounts/${encodeURIComponent(humanUserId)}`, { method: 'DELETE' });
}

function toIdentityBody({ humanUserId, firstName, lastName }: Identity) {
  return {
    humanUserId,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  };
}

async function request<T>(
  region: HumanRegion,
  path: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; body?: Record<string, string> }
): Promise<T> {
  const response = await fetch(`${resolveNovuApiUrl(region)}${path}`, {
    method: init.method,
    headers: {
      'Content-Type': 'application/json',
      'x-human-website-secret': process.env.HUMAN_WEBSITE_API_SECRET ?? '',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const body = await safeJson(response);

  if (!response.ok) {
    throw new HumanAccountsApiError(
      response.status,
      readErrorCode(body),
      readErrorMessage(body) ?? `Human account request failed (${response.status})`
    );
  }

  return unwrapData<T>(body);
}
