import { ChannelTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { buildOverrideInheritance } from './override-inheritance';
import { type ActiveOverrideIntegration, buildProviderOverrideOptions } from './override-options';
import { DEFAULT_CONTENT_SOURCE, integrationSource, providerSource } from './override-source';
import { describeOverrideSource, getContentSourceLabel } from './override-source-description';

const WEBHOOK = ToolProviderIdEnum.Webhook;

function webhookIntegration(identifier: string, name: string): ActiveOverrideIntegration {
  return { providerId: WEBHOOK, identifier, name };
}

function buildToolOptions(activeIntegrations: ActiveOverrideIntegration[] = []) {
  return buildProviderOverrideOptions({
    channel: ChannelTypeEnum.TOOL,
    activeIntegrations,
    providerOverrides: undefined,
    integrationOverrides: undefined,
    includeIntegrationOptions: true,
  });
}

const groupedOptions = buildToolOptions([webhookIntegration('staging', 'Staging'), webhookIntegration('prod', 'Prod')]);

describe('describeOverrideSource', () => {
  it('names an ungrouped provider after itself, with its sole integration as the identifier', () => {
    expect(
      describeOverrideSource(providerSource(WEBHOOK), buildToolOptions([webhookIntegration('prod', 'Prod')]))
    ).toEqual({
      providerName: 'Tool webhook',
      ownerLabel: 'Tool webhook',
      qualifiedLabel: 'Tool webhook',
      isGrouped: false,
      ownerIdentifier: 'prod',
    });
    expect(describeOverrideSource(providerSource(ToolProviderIdEnum.PagerDuty), [])).toMatchObject({
      providerName: 'PagerDuty',
      qualifiedLabel: 'PagerDuty',
      isGrouped: false,
    });
  });

  it('names a grouped provider "All integrations"', () => {
    expect(describeOverrideSource(providerSource(WEBHOOK), groupedOptions)).toEqual({
      providerName: 'Tool webhook',
      ownerLabel: 'All integrations',
      qualifiedLabel: 'Tool webhook · All integrations',
      isGrouped: true,
      ownerIdentifier: undefined,
    });
  });

  it('names an integration after its integration, falling back to the identifier once it is gone', () => {
    expect(describeOverrideSource(integrationSource(WEBHOOK, 'prod'), groupedOptions)).toEqual({
      providerName: 'Tool webhook',
      ownerLabel: 'Prod',
      qualifiedLabel: 'Tool webhook · Prod',
      isGrouped: true,
      ownerIdentifier: 'prod',
    });
    expect(describeOverrideSource(integrationSource(WEBHOOK, 'gone'), groupedOptions)).toMatchObject({
      ownerLabel: 'gone',
      qualifiedLabel: 'Tool webhook · gone',
    });
  });
});

describe('getContentSourceLabel', () => {
  it('labels default content and override sources', () => {
    expect(getContentSourceLabel(DEFAULT_CONTENT_SOURCE, groupedOptions)).toBe('Default content');
    expect(getContentSourceLabel(integrationSource(WEBHOOK, 'prod'), groupedOptions)).toBe('Tool webhook · Prod');
  });
});

describe('buildOverrideInheritance', () => {
  it('chains an integration over its provider override, labelled like the selector', () => {
    const inheritance = buildOverrideInheritance(integrationSource(WEBHOOK, 'prod'), groupedOptions, {
      providerOverrides: { [WEBHOOK]: { env: 'all' } },
    });

    expect(inheritance.mergesOver).toEqual([
      { label: 'Default content', source: DEFAULT_CONTENT_SOURCE },
      { label: 'Tool webhook · All integrations', source: providerSource(WEBHOOK) },
    ]);
    expect(inheritance.ownerLabel).toBe('Prod');
    expect(inheritance.ownerIdentifier).toBe('prod');
    expect(inheritance.inheritedOverride).toEqual({ env: 'all' });
  });

  it('labels the root keys a provider override has replaced in its integrations', () => {
    const inheritance = buildOverrideInheritance(providerSource(WEBHOOK), groupedOptions, {
      providerOverrides: { [WEBHOOK]: { env: 'all' } },
      integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' }, staging: { env: 'staging', team: 'x' } } },
    });

    expect(inheritance.ownerLabel).toBe('Tool webhook · All integrations');
    expect(inheritance.overriddenKeyLabels).toEqual({
      env: 'Overridden in 2 integrations',
      team: 'Overridden in Staging',
    });
  });
});
