import { decryptCredentials } from '@novu/application-generic';
import type { IAgentRuntimeProvider } from '@novu/application-generic/build/main/agent-runtimes/i-agent-runtime-provider';
import * as ResolveAgentRuntimeModule from '@novu/application-generic/build/main/agent-runtimes/resolve-agent-runtime';
import { AgentRuntimeProviderIdEnum, type ICredentialsDto } from '@novu/shared';
import sinon from 'sinon';

interface ResolvedAgentRuntimeStub {
  apiKey: string;
  credentials: ICredentialsDto;
  provider: IAgentRuntimeProvider;
  validateCredentialsInput: Record<string, unknown>;
}

interface ResolveAgentRuntimeStubOptions {
  resolve?: (providerId: string, credentials?: ICredentialsDto) => ResolvedAgentRuntimeStub | null;
}

function buildResolved(
  mockProvider: IAgentRuntimeProvider,
  apiKey: string,
  credentials: ICredentialsDto = {}
): ResolvedAgentRuntimeStub {
  return {
    apiKey,
    credentials,
    provider: mockProvider,
    validateCredentialsInput: { apiKey },
  };
}

export function stubResolveAgentRuntime(
  mockProvider: IAgentRuntimeProvider,
  options: ResolveAgentRuntimeStubOptions = {}
): sinon.SinonStub {
  return sinon.stub(ResolveAgentRuntimeModule, 'resolveAgentRuntime').callsFake((providerId: string, credentials?: ICredentialsDto) => {
    if (options.resolve) {
      return options.resolve(providerId, credentials);
    }

    const decrypted = decryptCredentials(credentials ?? {}) as ICredentialsDto;

    if (providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
      const masterKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;

      if (!masterKey) {
        return null;
      }

      return buildResolved(mockProvider, masterKey, decrypted);
    }

    const apiKey = decrypted.apiKey as string | undefined;

    if (!apiKey) {
      return null;
    }

    return buildResolved(mockProvider, apiKey, decrypted);
  }) as sinon.SinonStub;
}
