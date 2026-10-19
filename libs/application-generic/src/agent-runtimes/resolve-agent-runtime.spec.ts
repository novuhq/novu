import { AgentRuntimeProviderIdEnum } from '@novu/shared';

import { resolveAgentRuntime } from './resolve-agent-runtime';

describe('resolveAgentRuntime', () => {
  let previousApiKey: string | undefined;

  beforeEach(() => {
    previousApiKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = 'sk-ant-demo';
  });

  afterEach(() => {
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = previousApiKey;
  });

  it('uses the Novu master key for novu-anthropic integrations', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.NovuAnthropic, {});

    expect(resolved).not.toBeNull();
    expect(resolved?.apiKey).toBe('sk-ant-demo');
    expect(resolved?.provider).toBeDefined();
  });

  it('reads apiKey from integration credentials for user-owned Anthropic integrations', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.Anthropic, {
      apiKey: 'sk-user-key',
    });

    expect(resolved).not.toBeNull();
    expect(resolved?.apiKey).toBe('sk-user-key');
    expect(resolved?.validateCredentialsInput).toEqual({ apiKey: 'sk-user-key' });
  });

  it('returns null when user-owned integration has no api key', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.Anthropic, {});

    expect(resolved).toBeNull();
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
    expect(resolved?.awsCredentials).toEqual({
      region: 'us-east-1',
      workspaceId: 'wrkspc_test',
      apiKey: 'aws-key',
    });
  });

  it('returns null when aws credentials are incomplete', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.AnthropicAws, {
      region: 'us-east-1',
    });

    expect(resolved).toBeNull();
  });
});
