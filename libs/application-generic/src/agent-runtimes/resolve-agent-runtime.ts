import { AgentRuntimeProviderIdEnum, type ICredentialsDto } from '@novu/shared';

import { decryptCredentials } from '../encryption/encrypt-provider';
import { getAgentRuntimeProvider } from './agent-runtime.factory';
import type { IAgentRuntimeProvider } from './i-agent-runtime-provider';
import { areNovuManagedClaudeCredentialsSet, getNovuManagedClaudeApiKey } from '../utils/novu-integrations';

export type ResolvedAgentRuntime = {
  apiKey: string;
  credentials: ReturnType<typeof decryptCredentials>;
  provider: IAgentRuntimeProvider;
};

export function resolveAgentRuntime(
  providerId: AgentRuntimeProviderIdEnum | string,
  credentials: ICredentialsDto | undefined
): ResolvedAgentRuntime | null {
  if (providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
    if (!areNovuManagedClaudeCredentialsSet()) {
      return null;
    }

    const apiKey = getNovuManagedClaudeApiKey();
    const decrypted = decryptCredentials(credentials ?? {});

    return {
      apiKey,
      credentials: decrypted,
      provider: getAgentRuntimeProvider(providerId as AgentRuntimeProviderIdEnum, apiKey),
    };
  }

  const decrypted = decryptCredentials(credentials ?? {});
  const apiKey = decrypted.apiKey as string | undefined;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    credentials: decrypted,
    provider: getAgentRuntimeProvider(providerId as AgentRuntimeProviderIdEnum, apiKey),
  };
}
