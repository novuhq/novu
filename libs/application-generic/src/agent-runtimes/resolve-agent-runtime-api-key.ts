import { AgentRuntimeProviderIdEnum, type ICredentialsDto } from '@novu/shared';

import { decryptCredentials } from '../encryption/encrypt-provider';
import { getNovuManagedClaudeApiKey } from '../utils/novu-integrations';

export function resolveAgentRuntimeApiKey(
  providerId: AgentRuntimeProviderIdEnum | string,
  credentials: ICredentialsDto | undefined
): string {
  if (providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
    return getNovuManagedClaudeApiKey();
  }

  const decrypted = decryptCredentials(credentials ?? {});
  const apiKey = decrypted.apiKey as string | undefined;

  if (!apiKey) {
    throw new Error('Integration has no API key configured');
  }

  return apiKey;
}
