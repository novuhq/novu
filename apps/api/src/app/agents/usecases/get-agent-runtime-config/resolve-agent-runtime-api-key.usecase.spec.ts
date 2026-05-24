import { resolveAgentRuntimeApiKey } from '@novu/application-generic';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';

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
});
