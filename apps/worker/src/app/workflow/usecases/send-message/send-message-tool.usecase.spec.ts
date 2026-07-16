import { ToolProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { filterToolIntegrationsByEnabledIdentifiers, isEndpointRoutedToolProvider } from './send-message-tool.usecase';

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

describe('SendMessageTool - endpoint-routed providers', () => {
  /*
   * PagerDuty is per-subscriber only — with no env-level apiKey, the send loop
   * must skip PagerDuty (SKIPPED status + execution detail) when no channel
   * endpoint is resolved for the subscriber, rather than attempting a legacy
   * credential-based send that would throw.
   */
  it('classifies PagerDuty as endpoint-routed', () => {
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.PagerDuty)).to.equal(true);
  });

  /*
   * Opsgenie + tool webhook remain credential-routed — they still route via
   * env-level integration credentials and MUST NOT be short-circuited when a
   * subscriber has no channel endpoint. This assertion protects those provider
   * paths from an accidental future addition to ENDPOINT_ROUTED_TOOL_PROVIDERS.
   */
  it('leaves Opsgenie and tool webhook as credential-routed', () => {
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Opsgenie)).to.equal(false);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook)).to.equal(false);
  });
});
