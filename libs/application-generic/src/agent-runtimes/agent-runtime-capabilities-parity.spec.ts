import { AGENT_RUNTIME_PROVIDERS, AgentRuntimeProviderIdEnum } from '@novu/shared';
import { createAnthropicProvider } from './anthropic/anthropic-agent-runtime.provider';
import type { IAgentRuntimeProvider } from './i-agent-runtime-provider';

/**
 * For each provider in the static AGENT_RUNTIME_PROVIDERS catalog, assert that the
 * concrete provider class reports identical capabilities.
 *
 * This test prevents the catalog (read by the dashboard to show/hide UI panels) from
 * drifting out of sync with the provider class (used by the API for actual calls).
 */

function getProviderInstance(id: AgentRuntimeProviderIdEnum): IAgentRuntimeProvider {
  switch (id) {
    case AgentRuntimeProviderIdEnum.Anthropic:
      return createAnthropicProvider('test-key');
    default:
      throw new Error(`No concrete provider registered for ${id}. Add it to this test.`);
  }
}

describe('Agent runtime capabilities parity', () => {
  for (const catalogEntry of AGENT_RUNTIME_PROVIDERS) {
    describe(`Provider: ${catalogEntry.providerId}`, () => {
      let instance: IAgentRuntimeProvider;

      beforeAll(() => {
        instance = getProviderInstance(catalogEntry.providerId as AgentRuntimeProviderIdEnum);
      });

      it('providerId matches the catalog', () => {
        expect(instance.providerId).toBe(catalogEntry.providerId);
      });

      it('capabilities.mcpServers matches the catalog', () => {
        expect(instance.capabilities.mcpServers).toBe(catalogEntry.capabilities.mcpServers);
      });

      it('capabilities.tools matches the catalog', () => {
        expect(instance.capabilities.tools).toBe(catalogEntry.capabilities.tools);
      });

      it('capabilities.model matches the catalog', () => {
        expect(instance.capabilities.model).toBe(catalogEntry.capabilities.model);
      });

      it('capabilities.systemPrompt matches the catalog', () => {
        expect(instance.capabilities.systemPrompt).toBe(catalogEntry.capabilities.systemPrompt);
      });
    });
  }
});
