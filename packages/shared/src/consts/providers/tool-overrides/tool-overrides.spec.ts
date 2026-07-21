import { describe, expect, it } from 'vitest';
import { ToolProviderIdEnum } from '../../../types';
import {
  getToolProviderOverrideKeys,
  getToolProviderOverrideKeysOnlySchema,
  getToolProviderOverrideSchema,
  getToolProviderPrimaryContentKey,
  opsgenieOverrideJsonSchema,
  pagerdutyOverrideJsonSchema,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  TOOL_PROVIDER_OVERRIDE_KEYS,
  TOOL_PROVIDER_OVERRIDE_SCHEMAS,
  TOOL_PROVIDER_PRIMARY_CONTENT_KEY,
} from './index';

describe('tool provider override schemas', () => {
  it('exposes override-capable provider ids excluding tool-webhook', () => {
    expect(TOOL_CONTENT_OVERRIDE_PROVIDER_IDS).toEqual([ToolProviderIdEnum.PagerDuty, ToolProviderIdEnum.Opsgenie]);
  });

  it('maps each override provider to a strict object schema', () => {
    expect(TOOL_PROVIDER_OVERRIDE_SCHEMAS[ToolProviderIdEnum.PagerDuty]).toBe(pagerdutyOverrideJsonSchema);
    expect(TOOL_PROVIDER_OVERRIDE_SCHEMAS[ToolProviderIdEnum.Opsgenie]).toBe(opsgenieOverrideJsonSchema);
    expect(pagerdutyOverrideJsonSchema.additionalProperties).toBe(false);
    expect(opsgenieOverrideJsonSchema.additionalProperties).toBe(false);
  });

  it('keeps documented free-form maps permissive', () => {
    expect(pagerdutyOverrideJsonSchema.properties.custom_details.additionalProperties).toBe(true);
    expect(opsgenieOverrideJsonSchema.properties.details.additionalProperties).toBe(true);
  });

  it('exposes a key inventory that matches each schema property set', () => {
    expect(TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.PagerDuty]).toEqual(
      Object.keys(pagerdutyOverrideJsonSchema.properties)
    );
    expect(TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.Opsgenie]).toEqual(
      Object.keys(opsgenieOverrideJsonSchema.properties)
    );
    expect(getToolProviderOverrideKeys(ToolProviderIdEnum.PagerDuty)).toEqual(
      TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.PagerDuty]
    );
    expect(getToolProviderOverrideKeys('unknown')).toBeUndefined();
  });

  it('derives keys-only schemas that are strict on names and permissive on values', () => {
    const keysOnlySchema = getToolProviderOverrideKeysOnlySchema(ToolProviderIdEnum.Opsgenie);

    expect(keysOnlySchema?.additionalProperties).toBe(false);
    expect(Object.keys(keysOnlySchema?.properties ?? {})).toEqual(Object.keys(opsgenieOverrideJsonSchema.properties));
    expect(keysOnlySchema?.properties?.priority).toBe(true);
    expect(getToolProviderOverrideKeysOnlySchema('unknown')).toBeUndefined();
  });

  it('returns undefined for unsupported providers', () => {
    expect(getToolProviderOverrideSchema(ToolProviderIdEnum.Webhook)).toBeUndefined();
    expect(getToolProviderOverrideSchema('unknown')).toBeUndefined();
  });

  it('documents the primary content fields for each provider', () => {
    expect(pagerdutyOverrideJsonSchema.properties?.summary).toBeDefined();
    expect(pagerdutyOverrideJsonSchema.properties?.severity).toBeDefined();
    expect(opsgenieOverrideJsonSchema.properties?.message).toBeDefined();
    expect(opsgenieOverrideJsonSchema.properties?.priority).toBeDefined();
  });

  it('maps each override provider to its primary content key', () => {
    expect(TOOL_PROVIDER_PRIMARY_CONTENT_KEY[ToolProviderIdEnum.PagerDuty]).toBe('summary');
    expect(TOOL_PROVIDER_PRIMARY_CONTENT_KEY[ToolProviderIdEnum.Opsgenie]).toBe('message');
    expect(getToolProviderPrimaryContentKey(ToolProviderIdEnum.PagerDuty)).toBe('summary');
  });
});
