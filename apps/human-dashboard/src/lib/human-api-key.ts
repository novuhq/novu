import 'server-only';

import { cache } from 'react';

import { type JsonBody, unwrapData } from './api-response';
import type { HumanAccount } from './human-account';
import type { HumanRegion } from './human-accounts-api';
import { type HumanApiRequest, requestWithDashboardSecret, requestWithSecretKey } from './human-api';

type SecretKeyResponse = { environmentId: string; secretKey: string };

/**
 * The backing organization's Development secret key, the one `human login` hands to the CLI. It's read
 * once per request. The helpers below call the API with it and return only the answer, so the key stays
 * in this file for every page but Settings, which shows it to the operator (`readApiKey`).
 */
const loadBackingSecretKey = cache(async (region: HumanRegion, humanUserId: string): Promise<string> => {
  const body = await requestWithDashboardSecret(region, secretKeyPath(humanUserId));

  return unwrapData<SecretKeyResponse>(body).secretKey;
});

function secretKeyPath(humanUserId: string): string {
  return `/v1/human/accounts/${encodeURIComponent(humanUserId)}/secret-key`;
}

/** Calls the regular Novu API as the operator's backing organization and unwraps `{ data }`. */
export async function requestForAccount<T>(account: HumanAccount, path: string, init?: HumanApiRequest): Promise<T> {
  return unwrapData<T>(await send(account, path, init));
}

/** Same call, with the body left as sent, for lists that carry a `next` cursor beside `data`. */
export async function requestPageForAccount<T>(
  account: HumanAccount,
  path: string,
  init?: HumanApiRequest
): Promise<T | null> {
  return (await send(account, path, init)) as T | null;
}

async function send(account: HumanAccount, path: string, init?: HumanApiRequest): Promise<JsonBody> {
  const secretKey = await loadBackingSecretKey(account.region, account.humanUserId);

  return requestWithSecretKey(account.region, secretKey, path, init);
}

/** The key itself, for the Settings page: the operator copies it into CI, cloud VMs and automations. */
export function readApiKey(account: HumanAccount): Promise<string> {
  return loadBackingSecretKey(account.region, account.humanUserId);
}

/**
 * Replaces the key and returns the new one. The old key stops working at once, everywhere it was pasted
 * and in the copy `human login` saved on the operator's computer.
 */
export async function regenerateApiKey(account: HumanAccount): Promise<string> {
  const body = await requestWithDashboardSecret(account.region, `${secretKeyPath(account.humanUserId)}/regenerate`, {
    method: 'POST',
  });

  return unwrapData<SecretKeyResponse>(body).secretKey;
}
