import { AgentRuntimeProviderIdEnum } from '@novu/shared';

import { resolveAgentRuntime } from './resolve-agent-runtime';

describe('resolveAgentRuntime', () => {
  it('resolves anthropic cloud credentials from apiKey', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.Anthropic, {
      apiKey: 'sk-test',
    });

    expect(resolved).not.toBeNull();
    expect(resolved?.apiKey).toBe('sk-test');
    expect(resolved?.validateCredentialsInput).toEqual({ apiKey: 'sk-test' });
  });

  it('resolves anthropic-aws api key credentials', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.AnthropicAws, {
      region: 'us-east-1',
      externalWorkspaceId: 'wrkspc_test',
      apiKey: 'aws-key',
    });

    expect(resolved).not.toBeNull();
    expect(resolved?.provider.providerId).toBe(AgentRuntimeProviderIdEnum.AnthropicAws);
    expect(resolved?.validateCredentialsInput.region).toBe('us-east-1');
    expect(resolved?.validateCredentialsInput.apiKey).toBe('aws-key');
  });

  it('returns null when aws credentials are incomplete', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.AnthropicAws, {
      region: 'us-east-1',
    });

    expect(resolved).toBeNull();
  });
});
