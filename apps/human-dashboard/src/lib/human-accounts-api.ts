import 'server-only';

import { unwrapData } from './api-response';
import { type HumanApiRequest, requestWithDashboardSecret } from './human-api';

/** Where a Human account's backing organization lives in Novu. */
export type BackingAccount = {
  organizationId: string;
  userId: string;
  environmentId: string;
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
export function ensureBackingAccount(identity: Identity): Promise<BackingAccount> {
  return request('/v1/human/accounts', { method: 'POST', body: toIdentityBody(identity) });
}

export function claimKeylessSetup(
  identity: Identity,
  token: string
): Promise<{ environmentId: string; agentIdentifier?: string }> {
  return request('/v1/human/accounts/claim', {
    method: 'POST',
    body: { ...toIdentityBody(identity), token },
  });
}

/**
 * Approves the `login` waiting for this code, so that CLI gets the account's Development key. With the
 * claim token of the CLI's keyless setup, the setup moves into the account first. Creates the backing
 * organization when the account has none yet.
 */
export function approveCliLogin(
  identity: Identity & { email?: string | null },
  login: { userCode: string; claimToken?: string }
): Promise<BackingAccount & { keptSetup: boolean }> {
  return request('/v1/human/accounts/cli-login', {
    method: 'POST',
    body: {
      ...toIdentityBody(identity),
      ...(identity.email ? { email: identity.email } : {}),
      userCode: login.userCode,
      ...(login.claimToken ? { claimToken: login.claimToken } : {}),
    },
  });
}

/** A `login` that is still waiting to be approved or denied. */
export type PendingCliLogin = {
  userCode: string;
  /** Name of the computer the CLI runs on, as the CLI reported it. Not verified: only ever render it as text. */
  machineName?: string;
};

/**
 * The `login` waiting for this code. Throws a `HumanApiError` with the code `cli_login_not_found`
 * once it was approved, denied or ran out.
 */
export function findCliLogin(userCode: string): Promise<PendingCliLogin> {
  return request('/v1/human/accounts/cli-login/lookup', { method: 'POST', body: { userCode } });
}

/**
 * Ends the `login` waiting for this code. `denied` is false when it was already gone, which says nothing
 * about how: it may have been approved. Throws `cli_login_being_approved` while an approval is at work on it.
 */
export function denyCliLogin(userCode: string): Promise<{ denied: boolean }> {
  return request('/v1/human/accounts/cli-login/deny', { method: 'POST', body: { userCode } });
}

export async function deleteBackingAccount(humanUserId: string): Promise<void> {
  await request(`/v1/human/accounts/${encodeURIComponent(humanUserId)}`, { method: 'DELETE' });
}

function toIdentityBody({ humanUserId, firstName, lastName }: Identity) {
  return {
    humanUserId,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  };
}

async function request<T>(path: string, init: HumanApiRequest): Promise<T> {
  return unwrapData<T>(await requestWithDashboardSecret(path, init));
}
