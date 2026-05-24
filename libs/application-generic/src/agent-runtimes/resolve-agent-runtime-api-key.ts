import { AgentRuntimeProviderIdEnum, type ICredentialsDto } from '@novu/shared';

import { resolveAgentRuntime } from './resolve-agent-runtime';

export function resolveAgentRuntimeApiKey(
  providerId: AgentRuntimeProviderIdEnum | string,
  credentials: ICredentialsDto | undefined
): string {
  const resolved = resolveAgentRuntime(providerId, credentials);

  if (!resolved) {
    throw new Error('Integration has no API key configured');
  }

  return resolved.apiKey;
}
