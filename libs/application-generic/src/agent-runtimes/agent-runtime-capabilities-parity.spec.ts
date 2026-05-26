import { AGENT_RUNTIME_PROVIDERS, AgentRuntimeProviderIdEnum } from '@novu/shared';
import { createAnthropicProvider } from './anthropic/anthropic-agent-runtime.provider';
import { getAgentRuntimeProvider, listRegisteredAgentRuntimeProviders } from './agent-runtime.factory';
import { UnsupportedCapabilityError } from './errors';
import type { IAgentRuntimeProvider } from './i-agent-runtime-provider';

/**
 * For each provider in the static AGENT_RUNTIME_PROVIDERS catalog, assert that the
 * concrete provider class reports identical capabilities AND honours the
 * capability-bound contract (vault methods either work or throw the
 * documented `UnsupportedCapabilityError`).
 *
 * Cloud providers register in `agent-runtime.factory.ts`; AWS uses
 * `resolveAgentRuntime()` because credentials are multi-field.
 */

function getProviderInstance(id: AgentRuntimeProviderIdEnum): IAgentRuntimeProvider {
  if (id === AgentRuntimeProviderIdEnum.AnthropicAws) {
    return createAnthropicProvider(id, {
      awsCredentials: {
        region: 'us-east-1',
        workspaceId: 'wrkspc_test',
        apiKey: 'test-aws-key',
      },
    });
  }

  return getAgentRuntimeProvider(id, 'test-key');
}

describe('Agent runtime catalog ↔ registry parity', () => {
  it('every cloud catalog entry has a registered factory', () => {
    const registered = new Set(listRegisteredAgentRuntimeProviders());

    for (const entry of AGENT_RUNTIME_PROVIDERS) {
      if (entry.providerId === AgentRuntimeProviderIdEnum.AnthropicAws) {
        continue;
      }

      expect(registered.has(entry.providerId as AgentRuntimeProviderIdEnum)).toBe(true);
    }
  });
});

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

      it('capabilities.skills matches the catalog', () => {
        expect(instance.capabilities.skills).toBe(catalogEntry.capabilities.skills);
      });

      it('capabilities.tokenVault matches the catalog', () => {
        expect(instance.capabilities.tokenVault).toBe(catalogEntry.capabilities.tokenVault);
      });

      describe('parseMcpInitFailure', () => {
        it('returns null for an unrelated Error', () => {
          expect(instance.parseMcpInitFailure(new Error('completely unrelated'))).toBeNull();
        });

        it('returns null for non-Error values', () => {
          expect(instance.parseMcpInitFailure(undefined)).toBeNull();
          expect(instance.parseMcpInitFailure(null)).toBeNull();
          expect(instance.parseMcpInitFailure('string error')).toBeNull();
          expect(instance.parseMcpInitFailure(42)).toBeNull();
        });
      });

      describe('vault credential methods', () => {
        if (catalogEntry.capabilities.tokenVault) {
          it('overrides createVault (does not throw UnsupportedCapabilityError)', async () => {
            const probe = () => instance.createVault({ displayName: 'probe-vault' });

            await expect(probe()).rejects.not.toBeInstanceOf(UnsupportedCapabilityError);
          });

          it('overrides upsertVaultCredential (does not throw UnsupportedCapabilityError)', async () => {
            // We only assert the method was overridden — the upstream API call
            // itself is exercised by provider-specific integration tests.
            const probe = () =>
              instance.upsertVaultCredential({
                integrationCredentials: {},
                externalVaultId: 'vlt_test',
                mcpServerUrl: 'https://example.invalid',
                displayName: 'probe',
                auth: { accessToken: 'test-token' },
              });

            await expect(probe()).rejects.not.toBeInstanceOf(UnsupportedCapabilityError);
          });

          it('overrides deleteVaultCredential (does not throw UnsupportedCapabilityError)', async () => {
            const probe = () =>
              instance.deleteVaultCredential({
                integrationCredentials: {},
                externalVaultId: 'vlt_test',
                vaultCredentialId: 'probe',
              });

            await expect(probe()).rejects.not.toBeInstanceOf(UnsupportedCapabilityError);
          });
        } else {
          it('upsertVaultCredential throws UnsupportedCapabilityError when tokenVault is false', async () => {
            const probe = () =>
              instance.upsertVaultCredential({
                integrationCredentials: {},
                externalVaultId: 'vlt_test',
                mcpServerUrl: 'https://example.invalid',
                displayName: 'probe',
                auth: {},
              });

            await expect(probe()).rejects.toBeInstanceOf(UnsupportedCapabilityError);
          });

          it('deleteVaultCredential throws UnsupportedCapabilityError when tokenVault is false', async () => {
            const probe = () =>
              instance.deleteVaultCredential({
                integrationCredentials: {},
                externalVaultId: 'vlt_test',
                vaultCredentialId: 'probe',
              });

            await expect(probe()).rejects.toBeInstanceOf(UnsupportedCapabilityError);
          });
        }
      });
    });
  }
});
