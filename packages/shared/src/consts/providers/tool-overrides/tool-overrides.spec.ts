import { describe, expect, it } from 'vitest';
import { ToolProviderIdEnum } from '../../../types';
import {
  getToolProviderOverrideKeysOnlySchema,
  getToolProviderOverrideSchema,
  getToolProviderPrimaryContentKey,
  opsgenieOverrideJsonSchema,
  pagerdutyOverrideJsonSchema,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
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

  it('derives keys-only schemas that are strict on names and permissive on values', () => {
    const keysOnlySchema = getToolProviderOverrideKeysOnlySchema(ToolProviderIdEnum.Opsgenie);

    expect(keysOnlySchema?.additionalProperties).toBe(false);
    expect(Object.keys(keysOnlySchema?.properties ?? {})).toEqual(Object.keys(opsgenieOverrideJsonSchema.properties));
    expect(keysOnlySchema?.properties?.priority).toEqual({});
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

  it('requires documented PagerDuty link and image identifiers', () => {
    expect(pagerdutyOverrideJsonSchema.properties.links.items.required).toEqual(['href']);
    expect(pagerdutyOverrideJsonSchema.properties.images.items.required).toEqual(['src']);
  });

  it('documents Opsgenie Create Alert size and count limits', () => {
    expect(opsgenieOverrideJsonSchema.properties.entity.maxLength).toBe(512);
    expect(opsgenieOverrideJsonSchema.properties.tags.maxItems).toBe(20);
    expect(opsgenieOverrideJsonSchema.properties.tags.items.maxLength).toBe(50);
    expect(opsgenieOverrideJsonSchema.properties.actions.maxItems).toBe(10);
    expect(opsgenieOverrideJsonSchema.properties.actions.items.maxLength).toBe(50);
    expect(opsgenieOverrideJsonSchema.properties.responders.maxItems).toBe(50);
    expect(opsgenieOverrideJsonSchema.properties.responders.items.required).toEqual(['type']);
    expect(opsgenieOverrideJsonSchema.properties.visibleTo.maxItems).toBe(50);
    expect(opsgenieOverrideJsonSchema.properties.visibleTo.items.required).toEqual(['type']);
  });
});
