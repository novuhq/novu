import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import type { IntegrationRecord } from './integrations';
import { findActiveDemoAgentIntegration, hasActiveDemoAgentIntegration } from './demo-agent-integration';

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

describe('demo agent integration helpers', () => {
  it('finds an active NovuAnthropic agent integration', () => {
    const integrations = [demoIntegration()];

    expect(findActiveDemoAgentIntegration(integrations)?.identifier).toBe('novu-anthropic');
    expect(hasActiveDemoAgentIntegration(integrations)).toBe(true);
  });

  it('ignores inactive or non-demo integrations', () => {
    const integrations = [
      { ...demoIntegration(), active: false },
      { ...demoIntegration(), providerId: AgentRuntimeProviderIdEnum.Anthropic },
      { ...demoIntegration(), kind: 'chat' },
    ];

    expect(findActiveDemoAgentIntegration(integrations)).toBeUndefined();
    expect(hasActiveDemoAgentIntegration(integrations)).toBe(false);
  });
});
