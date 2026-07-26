import { describe, expect, it } from 'vitest';
import { ChatProviderIdEnum, ToolProviderIdEnum } from '../../../types';
import {
  CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
  CONTENT_OVERRIDE_PROVIDER_IDS,
  getProviderOverrideConfig,
  getProviderOverrideKeys,
  getProviderOverrideKeysOnlySchema,
  getProviderOverrideSchema,
  getProviderPrimaryContentKey,
  getToolProviderOverrideKeys,
  getToolProviderOverrideKeysOnlySchema,
  getToolProviderOverrideSchema,
  getToolProviderPrimaryContentKey,
  mergeProviderPreview,
  mergeToolProviderPreview,
  opsgenieOverrideJsonSchema,
  PROVIDER_OVERRIDE_KEYS,
  PROVIDER_OVERRIDE_SCHEMAS,
  PROVIDER_PRIMARY_CONTENT_KEY,
  pagerdutyOverrideJsonSchema,
  TOOL_PROVIDER_OVERRIDE_KEYS,
  TOOL_PROVIDER_OVERRIDE_SCHEMAS,
  TOOL_PROVIDER_PRIMARY_CONTENT_KEY,
  toLiquidTolerantSchema,
} from './index';

describe('provider override registry', () => {
  it('registers every chat provider so a new one cannot ship unconfigured', () => {
    expect([...CHAT_CONTENT_OVERRIDE_PROVIDER_IDS].sort()).toEqual(Object.values(ChatProviderIdEnum).sort());
  });

  it('keeps each config in step with the key inventory published alongside it', () => {
    for (const providerId of CONTENT_OVERRIDE_PROVIDER_IDS) {
      expect(getProviderOverrideConfig(providerId)?.keys).toEqual(getProviderOverrideKeys(providerId));
    }
  });

  it('points each chat provider at the payload key its step body falls back into', () => {
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.Slack)).toBe('text');
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.Discord)).toBe('content');
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.GrafanaOnCall)).toBe('message');
    expect(getProviderPrimaryContentKey(ToolProviderIdEnum.PagerDuty)).toBe('summary');
  });

  it('reports no fallback key for providers that nest their content', () => {
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.Line)).toBeNull();
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.WhatsAppBusiness)).toBeNull();
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.RocketChat)).toBeNull();
  });

  it('reports no fallback key for an unregistered provider', () => {
    expect(getProviderPrimaryContentKey('unknown')).toBeUndefined();
  });

  it('leaves schema-less chat providers as free-form escape hatches', () => {
    expect(getProviderOverrideSchema(ChatProviderIdEnum.Discord)).toBeUndefined();
    expect(getProviderOverrideKeys(ChatProviderIdEnum.Discord)).toBeUndefined();
    expect(getProviderOverrideKeysOnlySchema(ChatProviderIdEnum.Discord)).toBeUndefined();
    expect(getProviderOverrideConfig(ChatProviderIdEnum.Discord)?.schemaSubpath).toBeUndefined();
  });

  it('exposes Slack keys eagerly while its schema stays behind a package subpath', () => {
    const config = getProviderOverrideConfig(ChatProviderIdEnum.Slack);

    expect(config?.schema).toBeUndefined();
    expect(config?.schemaSubpath).toBe('@novu/shared/provider-overrides/slack');
    expect(getProviderOverrideKeys(ChatProviderIdEnum.Slack)).toContain('blocks');
    expect(getProviderOverrideKeysOnlySchema(ChatProviderIdEnum.Slack)?.properties?.blocks).toBe(true);
  });

  it('pairs every eager schema with a liquid-tolerant twin', () => {
    const config = getProviderOverrideConfig(ToolProviderIdEnum.PagerDuty);

    expect(config?.schema).toBe(pagerdutyOverrideJsonSchema);
    expect(config?.liquidTolerantSchema).toEqual(toLiquidTolerantSchema(pagerdutyOverrideJsonSchema));
    expect(PROVIDER_OVERRIDE_SCHEMAS[ToolProviderIdEnum.Opsgenie]).toBe(opsgenieOverrideJsonSchema);
  });

  it('keeps the deprecated tool-scoped names pointing at the same registry', () => {
    expect(TOOL_PROVIDER_OVERRIDE_SCHEMAS).toBe(PROVIDER_OVERRIDE_SCHEMAS);
    expect(TOOL_PROVIDER_OVERRIDE_KEYS).toBe(PROVIDER_OVERRIDE_KEYS);
    expect(getToolProviderOverrideSchema).toBe(getProviderOverrideSchema);
    expect(getToolProviderOverrideKeys).toBe(getProviderOverrideKeys);
    expect(getToolProviderOverrideKeysOnlySchema).toBe(getProviderOverrideKeysOnlySchema);
    expect(mergeToolProviderPreview).toBe(mergeProviderPreview);
  });

  it('keeps the deprecated primary content map on its original string-or-absent shape', () => {
    expect(Object.keys(TOOL_PROVIDER_PRIMARY_CONTENT_KEY)).toEqual([
      ToolProviderIdEnum.PagerDuty,
      ToolProviderIdEnum.Opsgenie,
    ]);
    expect(TOOL_PROVIDER_PRIMARY_CONTENT_KEY[ToolProviderIdEnum.PagerDuty]).toBe('summary');
    expect(TOOL_PROVIDER_PRIMARY_CONTENT_KEY[ToolProviderIdEnum.Webhook]).toBeUndefined();
    expect(getToolProviderPrimaryContentKey(ChatProviderIdEnum.Line)).toBeUndefined();
    expect(PROVIDER_PRIMARY_CONTENT_KEY[ChatProviderIdEnum.Line]).toBeNull();
  });
});
