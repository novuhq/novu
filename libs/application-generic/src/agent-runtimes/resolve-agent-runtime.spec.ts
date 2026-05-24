import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';

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

    expect(resolved).to.not.equal(null);
    expect(resolved?.apiKey).to.equal('sk-ant-demo');
    expect(resolved?.provider).to.not.equal(undefined);
  });

  it('reads apiKey from integration credentials for user-owned Anthropic integrations', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.Anthropic, {
      apiKey: 'sk-user-key',
    });

    expect(resolved).to.not.equal(null);
    expect(resolved?.apiKey).to.equal('sk-user-key');
  });

  it('returns null when user-owned integration has no api key', () => {
    const resolved = resolveAgentRuntime(AgentRuntimeProviderIdEnum.Anthropic, {});

    expect(resolved).to.equal(null);
  });
});
