import { IVerifyCredentialsResponse } from '@novu/stateless';
import { createProviderHttpClient } from './http';
import { resolveSafeInfobipBaseUrl } from './safe-infobip-base-url';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from './verify-credentials';

/**
 * Infobip's email and SMS providers share an account and API key: reads the account balance
 * (`GET /account/1/balance`) on the same safe-checked base URL the sends use. Read-only; nothing is sent.
 */
export function verifyInfobipCredentials(config: {
  baseUrl: string;
  apiKey?: string;
}): Promise<IVerifyCredentialsResponse> {
  const baseUrl = resolveSafeInfobipBaseUrl(config.baseUrl).replace(/\/+$/, '');

  return verifyCredentialsWith(() =>
    createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get(`${baseUrl}/account/1/balance`, {
      headers: { Authorization: `App ${config.apiKey}` },
    })
  );
}
