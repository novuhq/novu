import 'server-only';

import { unwrapData } from './api-response';
import { type HumanApiRequest, requestWithDashboardSecret } from './human-api';

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

/**
 * Approves the `human login` waiting for this code, so that CLI gets the account's Development key. With the
 * claim token of the CLI's keyless setup, the setup moves into the account first. Creates the backing
 * organization when the account has none yet.
 */
export function approveCliLogin(
  region: HumanRegion,
  identity: Identity & { email?: string | null },
  login: { userCode: string; claimToken?: string }
): Promise<BackingAccount & { keptSetup: boolean }> {
  return request(region, '/v1/human/accounts/cli-login', {
    method: 'POST',
    body: {
      ...toIdentityBody(identity),
      ...(identity.email ? { email: identity.email } : {}),
      userCode: login.userCode,
      ...(login.claimToken ? { claimToken: login.claimToken } : {}),
    },
  });
}

/** A `human login` that is still waiting to be approved or denied. */
export type PendingCliLogin = {
  userCode: string;
  /** Name of the computer the CLI runs on, as the CLI reported it. Not verified: only ever render it as text. */
  machineName?: string;
};

/**
 * The `human login` waiting for this code. Throws a `HumanApiError` with the code `cli_login_not_found`
 * once it was approved, denied or ran out.
 */
export function findCliLogin(region: HumanRegion, userCode: string): Promise<PendingCliLogin> {
  return request(region, '/v1/human/accounts/cli-login/lookup', { method: 'POST', body: { userCode } });
}

/**
 * Ends the `human login` waiting for this code. `denied` is false when it was already gone, which says nothing
 * about how: it may have been approved. Throws `cli_login_being_approved` while an approval is at work on it.
 */
export function denyCliLogin(region: HumanRegion, userCode: string): Promise<{ denied: boolean }> {
  return request(region, '/v1/human/accounts/cli-login/deny', { method: 'POST', body: { userCode } });
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

async function request<T>(region: HumanRegion, path: string, init: HumanApiRequest): Promise<T> {
  return unwrapData<T>(await requestWithDashboardSecret(region, path, init));
}
