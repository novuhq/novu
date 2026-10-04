import { ChannelTypeEnum, ChatProviderIdEnum, ContentIssueEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  type ActiveOverrideIntegration,
  buildProviderOverrideOptions,
  DEFAULT_CONTENT_SOURCE,
  getContentSourceLabel,
  getOverrideFormField,
  getOverrideIssueOwnerPath,
  getOverridePath,
  getProviderOptionLabel,
  getSourceOverride,
  getUnsupportedOverrideKeys,
  INTEGRATION_OVERRIDES_FIELD,
  isEscapeHatchProvider,
  isSameContentSource,
  isTopLevelOverrideIssuePath,
  PROVIDER_OVERRIDES_FIELD,
  shouldKeepServerOverrideIssue,
  updateSourceOverride,
} from './content-source';

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

describe('getUnsupportedOverrideKeys', () => {
  it('allows arbitrary webhook keys while preserving strict provider schemas', () => {
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.Webhook, { custom: true })).toEqual([]);
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.PagerDuty, { custom: true })).toEqual(['custom']);
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.Opsgenie, { custom: true })).toEqual(['custom']);
  });

  it('checks top-level keys for providers whose schema is loaded lazily', () => {
    expect(getUnsupportedOverrideKeys(ChatProviderIdEnum.Slack, { blocks: [], custom: true })).toEqual(['custom']);
  });
});

describe('isTopLevelOverrideIssuePath', () => {
  const prefix = `${PROVIDER_OVERRIDES_FIELD}.${ChatProviderIdEnum.WhatsAppBusiness}`;

  it('matches only a single segment under the provider path', () => {
    expect(isTopLevelOverrideIssuePath(`${prefix}.custom`, prefix)).toBe(true);
    expect(isTopLevelOverrideIssuePath(`${prefix}.document.link`, prefix)).toBe(false);
    expect(isTopLevelOverrideIssuePath(`${prefix}.document.id`, prefix)).toBe(false);
    expect(isTopLevelOverrideIssuePath(prefix, prefix)).toBe(false);
    expect(isTopLevelOverrideIssuePath(`${PROVIDER_OVERRIDES_FIELD}.slack.custom`, prefix)).toBe(false);
  });
});

describe('shouldKeepServerOverrideIssue', () => {
  const prefix = `${PROVIDER_OVERRIDES_FIELD}.${ChatProviderIdEnum.WhatsAppBusiness}`;

  it('drops mirrored top-level unsupported keys and keeps nested ones', () => {
    expect(
      shouldKeepServerOverrideIssue(
        { issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY, variableName: `${prefix}.custom` },
        prefix,
        prefix
      )
    ).toBe(false);
    expect(
      shouldKeepServerOverrideIssue(
        { issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY, variableName: `${prefix}.document.link` },
        `${prefix}.document.link`,
        prefix
      )
    ).toBe(true);
    expect(
      shouldKeepServerOverrideIssue(
        { issueType: ContentIssueEnum.MISSING_VALUE, variableName: `${prefix}.document.id` },
        `${prefix}.document.id`,
        prefix
      )
    ).toBe(true);
  });
});

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

  it('keeps a provider with a single active integration as one plainly labeled row', () => {
    const [webhookOption] = buildToolOptions({ activeIntegrations: [webhookIntegration('prod', 'Prod')] });

    expect(webhookOption).toMatchObject({ providerId: WEBHOOK, isConnected: true, integrations: [] });
    expect(getProviderOptionLabel(webhookOption)).toBe('Tool webhook');
  });

  it('nests a row per integration under an "(all)" provider row once a provider has two active integrations', () => {
    const [webhookOption] = buildToolOptions({
      activeIntegrations: [webhookIntegration('staging', 'Staging'), webhookIntegration('prod', 'Prod')],
    });

    expect(getProviderOptionLabel(webhookOption)).toBe('Tool webhook (all)');
    expect(webhookOption.integrations).toEqual([
      {
        providerId: WEBHOOK,
        integrationIdentifier: 'prod',
        name: 'Prod',
        hasOverride: false,
        isConnected: true,
      },
      {
        providerId: WEBHOOK,
        integrationIdentifier: 'staging',
        name: 'Staging',
        hasOverride: false,
        isConnected: true,
      },
    ]);
  });

  it('shows no integration rows while integration overrides are disabled', () => {
    const [webhookOption] = buildToolOptions({
      activeIntegrations: [webhookIntegration('staging', 'Staging'), webhookIntegration('prod', 'Prod')],
      integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' } } },
      includeIntegrationOptions: false,
    });

    expect(webhookOption.integrations).toEqual([]);
    expect(getProviderOptionLabel(webhookOption)).toBe('Tool webhook');
  });

  it('shows integration rows when an integration override exists, flagging overrides without an active integration', () => {
    const [webhookOption] = buildToolOptions({
      activeIntegrations: [webhookIntegration('prod', 'Prod')],
      integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' }, legacy: {} } },
    });

    expect(getProviderOptionLabel(webhookOption)).toBe('Tool webhook (all)');
    expect(
      webhookOption.integrations.map(({ integrationIdentifier, name, hasOverride, isConnected }) => ({
        integrationIdentifier,
        name,
        hasOverride,
        isConnected,
      }))
    ).toEqual([
      { integrationIdentifier: 'legacy', name: 'legacy', hasOverride: true, isConnected: false },
      { integrationIdentifier: 'prod', name: 'Prod', hasOverride: true, isConnected: true },
    ]);
  });

  it('keeps a provider row that only holds a disconnected integration override', () => {
    const options = buildToolOptions({ integrationOverrides: { [WEBHOOK]: { legacy: {} } } });

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ providerId: WEBHOOK, hasOverride: false, isConnected: false });
    expect(options[0].integrations.map((integration) => integration.integrationIdentifier)).toEqual(['legacy']);
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

describe('getContentSourceLabel', () => {
  const groupedOptions = buildToolOptions({
    activeIntegrations: [webhookIntegration('staging', 'Staging'), webhookIntegration('prod', 'Prod')],
  });

  it('labels default content and provider sources', () => {
    expect(getContentSourceLabel(DEFAULT_CONTENT_SOURCE, groupedOptions)).toBe('Default content');
    expect(getContentSourceLabel({ providerId: WEBHOOK }, groupedOptions)).toBe('Tool webhook (all)');
    expect(
      getContentSourceLabel(
        { providerId: WEBHOOK },
        buildToolOptions({ activeIntegrations: [webhookIntegration('prod', 'Prod')] })
      )
    ).toBe('Tool webhook');
    expect(getContentSourceLabel({ providerId: ToolProviderIdEnum.PagerDuty }, [])).toBe('PagerDuty');
  });

  it('labels an integration source with its name, falling back to the identifier', () => {
    expect(getContentSourceLabel({ providerId: WEBHOOK, integrationIdentifier: 'prod' }, groupedOptions)).toBe(
      'Tool webhook · Prod'
    );
    expect(getContentSourceLabel({ providerId: WEBHOOK, integrationIdentifier: 'gone' }, groupedOptions)).toBe(
      'Tool webhook · gone'
    );
  });
});

describe('isSameContentSource', () => {
  it('compares sources by value', () => {
    expect(isSameContentSource(DEFAULT_CONTENT_SOURCE, DEFAULT_CONTENT_SOURCE)).toBe(true);
    expect(isSameContentSource({ providerId: WEBHOOK }, { providerId: WEBHOOK })).toBe(true);
    expect(
      isSameContentSource(
        { providerId: WEBHOOK, integrationIdentifier: 'prod' },
        { providerId: WEBHOOK, integrationIdentifier: 'prod' }
      )
    ).toBe(true);
    expect(isSameContentSource({ providerId: WEBHOOK }, { providerId: WEBHOOK, integrationIdentifier: 'prod' })).toBe(
      false
    );
    expect(isSameContentSource({ providerId: WEBHOOK }, DEFAULT_CONTENT_SOURCE)).toBe(false);
  });
});

describe('override paths', () => {
  it('namespaces provider and integration overrides like server control issues', () => {
    expect(getOverridePath({ providerId: ChatProviderIdEnum.Slack })).toBe(`${PROVIDER_OVERRIDES_FIELD}.slack`);
    expect(getOverridePath({ providerId: WEBHOOK, integrationIdentifier: 'prod.eu' })).toBe(
      `${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.eu`
    );
    expect(getOverrideFormField({ providerId: WEBHOOK })).toBe(PROVIDER_OVERRIDES_FIELD);
    expect(getOverrideFormField({ providerId: WEBHOOK, integrationIdentifier: 'prod' })).toBe(
      INTEGRATION_OVERRIDES_FIELD
    );
  });

  it('attributes a server issue to the override that owns its path', () => {
    const integrationPaths = [
      `${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod`,
      `${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.eu`,
    ];

    expect(getOverrideIssueOwnerPath(`${PROVIDER_OVERRIDES_FIELD}.slack.blocks.0.text`, integrationPaths)).toBe(
      `${PROVIDER_OVERRIDES_FIELD}.slack`
    );
    expect(getOverrideIssueOwnerPath(`${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.title`, integrationPaths)).toBe(
      `${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod`
    );
    expect(
      getOverrideIssueOwnerPath(`${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.eu.title`, integrationPaths)
    ).toBe(`${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.eu`);
    expect(getOverrideIssueOwnerPath(`${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.other.title`, integrationPaths)).toBe(
      undefined
    );
    expect(getOverrideIssueOwnerPath('body', integrationPaths)).toBe(undefined);
  });
});

describe('getSourceOverride', () => {
  it('reads the blob for a provider or integration source', () => {
    const values = {
      providerOverrides: { [WEBHOOK]: { env: 'all' } },
      integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' } } },
    };

    expect(getSourceOverride({ providerId: WEBHOOK }, values)).toEqual({ env: 'all' });
    expect(getSourceOverride({ providerId: WEBHOOK, integrationIdentifier: 'prod' }, values)).toEqual({ env: 'prod' });
    expect(getSourceOverride({ providerId: WEBHOOK, integrationIdentifier: 'staging' }, values)).toBe(undefined);
    expect(getSourceOverride({ providerId: WEBHOOK, integrationIdentifier: 'constructor' }, values)).toBe(undefined);
    expect(getSourceOverride({ providerId: ToolProviderIdEnum.PagerDuty }, { providerOverrides: null })).toBe(
      undefined
    );
  });
});

describe('updateSourceOverride', () => {
  const prod = { providerId: WEBHOOK, integrationIdentifier: 'prod' };
  const staging = { providerId: WEBHOOK, integrationIdentifier: 'staging' };

  it('sets and removes a provider override, saving an emptied map as null', () => {
    const added = updateSourceOverride({ providerId: WEBHOOK }, { providerOverrides: undefined }, {});
    expect(added).toEqual({ [WEBHOOK]: {} });
    expect(updateSourceOverride({ providerId: WEBHOOK }, { providerOverrides: added }, undefined)).toBe(null);
  });

  it('sets an integration override beside existing ones', () => {
    expect(updateSourceOverride(prod, { integrationOverrides: undefined }, {})).toEqual({ [WEBHOOK]: { prod: {} } });
    expect(
      updateSourceOverride(staging, { integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' } } } }, { a: 1 })
    ).toEqual({ [WEBHOOK]: { prod: { env: 'prod' }, staging: { a: 1 } } });
  });

  it('removes an integration override, pruning emptied provider maps and saving an emptied map as null', () => {
    const integrationOverrides = {
      [WEBHOOK]: { prod: { env: 'prod' }, staging: {} },
      [ToolProviderIdEnum.PagerDuty]: { pd: {} },
    };

    expect(updateSourceOverride(staging, { integrationOverrides }, undefined)).toEqual({
      [WEBHOOK]: { prod: { env: 'prod' } },
      [ToolProviderIdEnum.PagerDuty]: { pd: {} },
    });
    expect(
      updateSourceOverride(
        prod,
        { integrationOverrides: { [WEBHOOK]: { prod: {} }, pagerduty: { pd: {} } } },
        undefined
      )
    ).toEqual({ pagerduty: { pd: {} } });
    expect(updateSourceOverride(prod, { integrationOverrides: { [WEBHOOK]: { prod: {} } } }, undefined)).toBe(null);
  });
});
