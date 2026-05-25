import { decryptCredentials } from '@novu/application-generic';
import * as ResolveAgentRuntimeModule from '@novu/application-generic/build/main/agent-runtimes/resolve-agent-runtime';
import { AgentRuntimeProviderIdEnum, type ICredentialsDto } from '@novu/shared';
import sinon from 'sinon';

type ResolvedAgentRuntimeStub = {
  apiKey: string;
  credentials: Record<string, unknown>;
  provider: unknown;
  validateCredentialsInput: Record<string, unknown>;
};

type ResolveAgentRuntimeStubOptions = {
  defaultApiKey?: string;
  resolve?: (providerId: string, credentials?: ICredentialsDto) => ResolvedAgentRuntimeStub | null;
};

function buildResolved(
  mockProvider: unknown,
  apiKey: string,
  credentials: Record<string, unknown> = {}
): ResolvedAgentRuntimeStub {
  return {
    apiKey,
    credentials,
    provider: mockProvider,
    validateCredentialsInput: { apiKey },
  };
}

export function stubResolveAgentRuntime(
  mockProvider: unknown,
  options: ResolveAgentRuntimeStubOptions = {}
): sinon.SinonStub {
  const defaultApiKey = options.defaultApiKey ?? 'sk-fake-anthropic-key-for-e2e';

  return sinon.stub(ResolveAgentRuntimeModule, 'resolveAgentRuntime').callsFake((providerId: string, credentials?: ICredentialsDto) => {
    if (options.resolve) {
      return options.resolve(providerId, credentials);
    }

    const decrypted = decryptCredentials(credentials ?? {});

    if (providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
      const masterKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;

      if (!masterKey) {
        return null;
      }

      return buildResolved(mockProvider, masterKey, decrypted);
    }

    const apiKey = (decrypted.apiKey as string | undefined) ?? defaultApiKey;

    return buildResolved(mockProvider, apiKey, decrypted);
  });
}
