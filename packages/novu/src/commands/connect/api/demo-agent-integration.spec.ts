import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import type { IntegrationRecord } from './integrations';
import { findActiveDemoAgentIntegration } from './demo-agent-integration';

function demoIntegration(): IntegrationRecord {
  return {
    _id: 'demo-1',
    identifier: 'novu-anthropic',
    name: 'Novu Demo Claude',
    providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
    kind: 'agent',
    active: true,
  };
}

describe('findActiveDemoAgentIntegration', () => {
  it('returns an active NovuAnthropic agent integration', () => {
    expect(findActiveDemoAgentIntegration([demoIntegration()])?.identifier).toBe('novu-anthropic');
  });

  it('returns undefined for inactive or non-demo integrations', () => {
    const integrations = [
      { ...demoIntegration(), active: false },
      { ...demoIntegration(), providerId: AgentRuntimeProviderIdEnum.Anthropic },
      { ...demoIntegration(), kind: 'chat' },
    ];

    expect(findActiveDemoAgentIntegration(integrations)).toBeUndefined();
  });
});
