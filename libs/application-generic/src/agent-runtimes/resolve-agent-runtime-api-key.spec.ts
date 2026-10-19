import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';

import { resolveAgentRuntimeApiKey } from './resolve-agent-runtime-api-key';

describe('resolveAgentRuntimeApiKey', () => {
  let previousApiKey: string | undefined;

  beforeEach(() => {
    previousApiKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = 'sk-ant-demo';
  });

  afterEach(() => {
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = previousApiKey;
  });

  it('uses the Novu master key for novu-anthropic integrations', () => {
    const apiKey = resolveAgentRuntimeApiKey(AgentRuntimeProviderIdEnum.NovuAnthropic, {});

    expect(apiKey).to.equal('sk-ant-demo');
  });

  it('reads apiKey from integration credentials for user-owned Anthropic integrations', () => {
    const apiKey = resolveAgentRuntimeApiKey(AgentRuntimeProviderIdEnum.Anthropic, {
      apiKey: 'sk-user-key',
    });

    expect(apiKey).to.equal('sk-user-key');
  });
});
