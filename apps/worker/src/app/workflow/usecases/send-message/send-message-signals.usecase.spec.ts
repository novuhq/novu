import { expect } from 'chai';
import { filterSignalsIntegrationsByEnabledIdentifiers } from './send-message-signals.usecase';

describe('SendMessageSignals - enabledIntegrations filter', () => {
  const integrations = [
    { identifier: 'github-main', providerId: 'github' },
    { identifier: 'webhook-alerts', providerId: 'signals-webhook' },
    { identifier: 'github-secondary', providerId: 'github' },
  ];

  it('returns all integrations when enabledIntegrations is empty or undefined', () => {
    expect(filterSignalsIntegrationsByEnabledIdentifiers(integrations, undefined)).to.deep.equal(integrations);
    expect(filterSignalsIntegrationsByEnabledIdentifiers(integrations, [])).to.deep.equal(integrations);
  });

  it('filters integrations by step enabledIntegrations identifiers', () => {
    const filtered = filterSignalsIntegrationsByEnabledIdentifiers(integrations, [
      'webhook-alerts',
      'github-secondary',
    ]);

    expect(filtered.map((integration) => integration.identifier)).to.deep.equal(['webhook-alerts', 'github-secondary']);
  });
});
