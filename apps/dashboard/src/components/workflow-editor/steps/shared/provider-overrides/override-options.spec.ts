import { ChannelTypeEnum, ChatProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  type ActiveOverrideIntegration,
  buildProviderOverrideOptions,
  isEscapeHatchProvider,
} from './override-options';
import { integrationSource, providerSource } from './override-source';

const WEBHOOK = ToolProviderIdEnum.Webhook;

function webhookIntegration(identifier: string, name: string): ActiveOverrideIntegration {
  return { providerId: WEBHOOK, identifier, name };
}

function buildToolOptions(overrides: Partial<Parameters<typeof buildProviderOverrideOptions>[0]> = {}) {
  return buildProviderOverrideOptions({
    channel: ChannelTypeEnum.TOOL,
    activeIntegrations: [],
    providerOverrides: undefined,
    integrationOverrides: undefined,
    includeIntegrationOptions: true,
    ...overrides,
  });
}

describe('isEscapeHatchProvider', () => {
  it('separates schema-backed providers from free-form passthroughs', () => {
    expect(isEscapeHatchProvider(ToolProviderIdEnum.PagerDuty)).toBe(false);
    expect(isEscapeHatchProvider(ChatProviderIdEnum.Slack)).toBe(false);
    expect(isEscapeHatchProvider(ToolProviderIdEnum.Webhook)).toBe(true);
    expect(isEscapeHatchProvider(ChatProviderIdEnum.Discord)).toBe(true);
  });
});

describe('buildProviderOverrideOptions', () => {
  it('lists configured overrides first, then schema-backed before escape-hatch, then alphabetically', () => {
    const options = buildProviderOverrideOptions({
      channel: ChannelTypeEnum.CHAT,
      activeIntegrations: [
        ChatProviderIdEnum.Telegram,
        ChatProviderIdEnum.Discord,
        ChatProviderIdEnum.Slack,
        ChatProviderIdEnum.Mattermost,
        ChatProviderIdEnum.WhatsAppBusiness,
      ].map((providerId) => ({ providerId, identifier: `${providerId}-1`, name: providerId })),
      providerOverrides: {
        [ChatProviderIdEnum.Discord]: { text: 'hi' },
        [ChatProviderIdEnum.Telegram]: { text: 'hi' },
      },
      integrationOverrides: undefined,
      includeIntegrationOptions: true,
    });

    expect(options.map((option) => option.providerId)).toEqual([
      ChatProviderIdEnum.Telegram,
      ChatProviderIdEnum.Discord,
      ChatProviderIdEnum.Slack,
      ChatProviderIdEnum.WhatsAppBusiness,
      ChatProviderIdEnum.Mattermost,
    ]);
    expect(options.map((option) => option.hasOverride)).toEqual([true, true, false, false, false]);
    expect(options.map((option) => option.isEscapeHatch)).toEqual([false, true, false, false, true]);
  });

  it('keeps a provider with a single active integration as one row', () => {
    const [webhookOption] = buildToolOptions({ activeIntegrations: [webhookIntegration('prod', 'Prod')] });

    expect(webhookOption).toMatchObject({
      source: providerSource(WEBHOOK),
      providerId: WEBHOOK,
      isConnected: true,
      integrations: [],
      soleIntegrationIdentifier: 'prod',
    });
  });

  it('nests a row per integration once a provider has two active integrations', () => {
    const [webhookOption] = buildToolOptions({
      activeIntegrations: [webhookIntegration('staging', 'Staging'), webhookIntegration('prod', 'Prod')],
    });

    expect(webhookOption.soleIntegrationIdentifier).toBeUndefined();
    expect(webhookOption.integrations).toEqual([
      { source: integrationSource(WEBHOOK, 'prod'), name: 'Prod', hasOverride: false, isConnected: true },
      { source: integrationSource(WEBHOOK, 'staging'), name: 'Staging', hasOverride: false, isConnected: true },
    ]);
  });

  it('shows no integration rows while integration overrides are disabled', () => {
    const [webhookOption] = buildToolOptions({
      activeIntegrations: [webhookIntegration('staging', 'Staging'), webhookIntegration('prod', 'Prod')],
      integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' } } },
      includeIntegrationOptions: false,
    });

    expect(webhookOption.integrations).toEqual([]);
  });

  it('shows integration rows when an integration override exists, flagging overrides without an active integration', () => {
    const [webhookOption] = buildToolOptions({
      activeIntegrations: [webhookIntegration('prod', 'Prod')],
      integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' }, legacy: {} } },
    });

    expect(webhookOption.integrations).toEqual([
      { source: integrationSource(WEBHOOK, 'legacy'), name: 'legacy', hasOverride: true, isConnected: false },
      { source: integrationSource(WEBHOOK, 'prod'), name: 'Prod', hasOverride: true, isConnected: true },
    ]);
  });

  it('keeps a provider row that only holds a disconnected integration override', () => {
    const options = buildToolOptions({ integrationOverrides: { [WEBHOOK]: { legacy: {} } } });

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ providerId: WEBHOOK, hasOverride: false, isConnected: false });
    expect(options[0].integrations.map((integration) => integration.source)).toEqual([
      integrationSource(WEBHOOK, 'legacy'),
    ]);
  });

  it('sorts integration rows with overrides first, then by name', () => {
    const [webhookOption] = buildToolOptions({
      activeIntegrations: [
        webhookIntegration('beta', 'Beta'),
        webhookIntegration('zeta', 'Zeta'),
        webhookIntegration('alpha', 'alpha'),
      ],
      integrationOverrides: { [WEBHOOK]: { zeta: {} } },
    });

    expect(webhookOption.integrations.map((integration) => integration.name)).toEqual(['Zeta', 'alpha', 'Beta']);
  });
});
