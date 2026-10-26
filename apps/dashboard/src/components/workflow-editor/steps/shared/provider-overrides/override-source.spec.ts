import { ChannelTypeEnum, ChatProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTENT_SOURCE,
  getOverrideFormField,
  getOverridePath,
  getParentSource,
  getSourceOverride,
  INTEGRATION_OVERRIDES_FIELD,
  integrationSource,
  isSameContentSource,
  listSourceOverrides,
  PROVIDER_OVERRIDES_FIELD,
  providerSource,
  updateSourceOverride,
} from './override-source';

const WEBHOOK = ToolProviderIdEnum.Webhook;

describe('isSameContentSource', () => {
  it('compares sources by value', () => {
    expect(isSameContentSource(DEFAULT_CONTENT_SOURCE, DEFAULT_CONTENT_SOURCE)).toBe(true);
    expect(isSameContentSource(providerSource(WEBHOOK), providerSource(WEBHOOK))).toBe(true);
    expect(isSameContentSource(integrationSource(WEBHOOK, 'prod'), integrationSource(WEBHOOK, 'prod'))).toBe(true);
    expect(isSameContentSource(providerSource(WEBHOOK), integrationSource(WEBHOOK, 'prod'))).toBe(false);
    expect(isSameContentSource(providerSource(WEBHOOK), DEFAULT_CONTENT_SOURCE)).toBe(false);
  });
});

describe('getParentSource', () => {
  it('returns the provider layer an integration merges over, and nothing for a provider', () => {
    expect(getParentSource(integrationSource(WEBHOOK, 'prod'))).toEqual(providerSource(WEBHOOK));
    expect(getParentSource(providerSource(WEBHOOK))).toBeUndefined();
  });
});

describe('override paths', () => {
  it('namespaces provider and integration overrides like server control issues', () => {
    expect(getOverridePath(providerSource(ChatProviderIdEnum.Slack))).toBe(`${PROVIDER_OVERRIDES_FIELD}.slack`);
    expect(getOverridePath(integrationSource(WEBHOOK, 'prod.eu'))).toBe(
      `${INTEGRATION_OVERRIDES_FIELD}.tool-webhook.prod.eu`
    );
    expect(getOverrideFormField(providerSource(WEBHOOK))).toBe(PROVIDER_OVERRIDES_FIELD);
    expect(getOverrideFormField(integrationSource(WEBHOOK, 'prod'))).toBe(INTEGRATION_OVERRIDES_FIELD);
  });
});

describe('getSourceOverride', () => {
  it('reads the blob for a provider or integration source', () => {
    const values = {
      providerOverrides: { [WEBHOOK]: { env: 'all' } },
      integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' } } },
    };

    expect(getSourceOverride(providerSource(WEBHOOK), values)).toEqual({ env: 'all' });
    expect(getSourceOverride(integrationSource(WEBHOOK, 'prod'), values)).toEqual({ env: 'prod' });
    expect(getSourceOverride(integrationSource(WEBHOOK, 'staging'), values)).toBe(undefined);
    expect(getSourceOverride(integrationSource(WEBHOOK, 'constructor'), values)).toBe(undefined);
    expect(getSourceOverride(providerSource(ToolProviderIdEnum.PagerDuty), { providerOverrides: null })).toBe(
      undefined
    );
  });
});

describe('updateSourceOverride', () => {
  const prod = integrationSource(WEBHOOK, 'prod');
  const staging = integrationSource(WEBHOOK, 'staging');

  it('sets and removes a provider override, saving an emptied map as null', () => {
    const added = updateSourceOverride(providerSource(WEBHOOK), { providerOverrides: undefined }, {});
    expect(added).toEqual({ [WEBHOOK]: {} });
    expect(updateSourceOverride(providerSource(WEBHOOK), { providerOverrides: added }, undefined)).toBe(null);
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

describe('listSourceOverrides', () => {
  it('lists provider then integration overrides for the channel, tagged with their source kind', () => {
    expect(
      listSourceOverrides(ChannelTypeEnum.TOOL, {
        providerOverrides: { [WEBHOOK]: { env: 'all' }, [ChatProviderIdEnum.Slack]: { text: 'ignored' } },
        integrationOverrides: { [WEBHOOK]: { prod: { env: 'prod' } } },
      })
    ).toEqual([
      { source: providerSource(WEBHOOK), override: { env: 'all' } },
      { source: integrationSource(WEBHOOK, 'prod'), override: { env: 'prod' } },
    ]);
  });
});
