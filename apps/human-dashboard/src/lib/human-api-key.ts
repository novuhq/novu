import 'server-only';

import { cache } from 'react';

import { type JsonBody, unwrapData } from './api-response';
import type { HumanAccount } from './human-account';
import type { HumanRegion } from './human-accounts-api';
import { type HumanApiRequest, notAvailableYet, requestWithDashboardSecret, requestWithSecretKey } from './human-api';

/**
 * The backing organization's Development secret key, the one `human login` hands to the CLI. It's read
 * once per request and stays in this file: the helpers below call the API with it and return only the
 * answer, so no page or client component ever holds the key.
 */
const loadBackingSecretKey = cache(async (region: HumanRegion, humanUserId: string): Promise<string> => {
  const body = await requestWithDashboardSecret(
    region,
    `/v1/human/accounts/${encodeURIComponent(humanUserId)}/secret-key`
  );

  return unwrapData<{ environmentId: string; secretKey: string }>(body).secretKey;
});

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

/** Not in the API yet: a new key has to reach the operator's CLI too, or `human` stops working there. */
export async function regenerateApiKey(_account: HumanAccount): Promise<void> {
  notAvailableYet('Making a new API key');
}
