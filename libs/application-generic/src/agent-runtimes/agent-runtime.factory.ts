import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { createAnthropicProvider } from './anthropic/anthropic-agent-runtime.provider';
import type { IAgentRuntimeProvider } from './i-agent-runtime-provider';

/**
 * Returns an IAgentRuntimeProvider instance for the given providerId,
 * initialised with the supplied (decrypted) API key.
 *
 * Add new providers here as they are implemented.
 */
export function getAgentRuntimeProvider(providerId: string, apiKey: string): IAgentRuntimeProvider {
  switch (providerId) {
    case AgentRuntimeProviderIdEnum.Anthropic:
      return createAnthropicProvider(apiKey);
    default:
      throw new Error(`Unsupported agent runtime provider: ${providerId}`);
  }
}
