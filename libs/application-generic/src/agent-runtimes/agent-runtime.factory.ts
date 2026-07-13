import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { createAnthropicProvider } from './anthropic/anthropic-agent-runtime.provider';
import type { IAgentRuntimeProvider } from './i-agent-runtime-provider';

type ProviderFactory = (apiKey: string) => IAgentRuntimeProvider;

/**
 * Per-runtime factory registry. Adding a new managed runtime is a single
 * registration here plus a concrete `BaseAgentRuntimeProvider` subclass — no
 * caller-side switch statements anywhere else in the codebase. The parity
 * spec walks `AGENT_RUNTIME_PROVIDERS` to assert that every catalog entry
 * has a matching factory and that capability flags line up with the
 * concrete class.
 */
const PROVIDER_REGISTRY = new Map<AgentRuntimeProviderIdEnum, ProviderFactory>([
  [AgentRuntimeProviderIdEnum.Anthropic, (apiKey) => createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey })],
  [AgentRuntimeProviderIdEnum.NovuAnthropic, (apiKey) =>
    createAnthropicProvider(AgentRuntimeProviderIdEnum.NovuAnthropic, { apiKey })],
]);

/**
 * Returns an `IAgentRuntimeProvider` instance for the given providerId,
 * initialised with the supplied (decrypted) API key.
 *
 * Throws `Error` when the providerId is not registered — this is a programmer
 * error (the catalog says the runtime exists but no factory was wired up).
 */
export function getAgentRuntimeProvider(providerId: string, apiKey: string): IAgentRuntimeProvider {
  const factory = PROVIDER_REGISTRY.get(providerId as AgentRuntimeProviderIdEnum);

  if (!factory) {
    throw new Error(`Unsupported agent runtime provider: ${providerId}`);
  }

  return factory(apiKey);
}

/**
 * Visible for tests / parity checks — should not be used outside the
 * `agent-runtimes` folder.
 */
export function listRegisteredAgentRuntimeProviders(): AgentRuntimeProviderIdEnum[] {
  return Array.from(PROVIDER_REGISTRY.keys());
}
