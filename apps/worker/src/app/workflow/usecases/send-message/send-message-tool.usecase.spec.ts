import { expect } from 'chai';
import { filterToolIntegrationsByEnabledIdentifiers } from './send-message-tool.usecase';

describe('SendMessageTool - enabledIntegrations filter', () => {
  const integrations = [
    { identifier: 'pagerduty-main', providerId: 'pagerduty' },
    { identifier: 'webhook-alerts', providerId: 'tool-webhook' },
    { identifier: 'opsgenie-secondary', providerId: 'opsgenie' },
  ];

  it('returns all integrations when enabledIntegrations is empty or undefined', () => {
    expect(filterToolIntegrationsByEnabledIdentifiers(integrations, undefined)).to.deep.equal(integrations);
    expect(filterToolIntegrationsByEnabledIdentifiers(integrations, [])).to.deep.equal(integrations);
  });

  it('filters integrations by step enabledIntegrations identifiers', () => {
    const filtered = filterToolIntegrationsByEnabledIdentifiers(integrations, ['webhook-alerts', 'opsgenie-secondary']);

    expect(filtered.map((integration) => integration.identifier)).to.deep.equal([
      'webhook-alerts',
      'opsgenie-secondary',
    ]);
  });
});
