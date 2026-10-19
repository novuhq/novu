import { APPLICATION_IDENTIFIER_PLACEHOLDER } from '@novu/shared';
import { requestApiJson } from '../../shared/novu-http';
import type { ResolvedConnectAuth } from './resolve-connect-auth';

export async function resolveConnectApplicationIdentifier(auth: ResolvedConnectAuth): Promise<string> {
  const keyless = auth.keylessApplicationIdentifier?.trim();
  if (keyless) {
    return keyless;
  }

  const secretKey = auth.secretKey?.trim();
  if (!secretKey) {
    return APPLICATION_IDENTIFIER_PLACEHOLDER;
  }

  try {
    const environment = await requestApiJson<{ identifier: string }>(auth.apiUrl, '/environments/me', {
      headers: { Authorization: `ApiKey ${secretKey}` },
    });

    return environment.identifier?.trim() || APPLICATION_IDENTIFIER_PLACEHOLDER;
  } catch {
    return APPLICATION_IDENTIFIER_PLACEHOLDER;
  }
}
