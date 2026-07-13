import { expect } from 'chai';
import { filterSignalsIntegrationsByProviders } from './send-message-signals.usecase';

describe('SendMessageSignals - providers filter', () => {
  const integrations = [
    { identifier: 'github-main', providerId: 'github' },
    { identifier: 'webhook-alerts', providerId: 'signals-webhook' },
    { identifier: 'github-secondary', providerId: 'github' },
  ];

  it('returns all integrations when providers is empty or undefined', () => {
    expect(filterSignalsIntegrationsByProviders(integrations, undefined)).to.deep.equal(integrations);
    expect(filterSignalsIntegrationsByProviders(integrations, [])).to.deep.equal(integrations);
  });

  it('filters integrations by step providers identifiers', () => {
    const filtered = filterSignalsIntegrationsByProviders(integrations, ['webhook-alerts', 'github-secondary']);

    expect(filtered.map((integration) => integration.identifier)).to.deep.equal(['webhook-alerts', 'github-secondary']);
  });
});
