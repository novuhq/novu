import { describe, expect, it } from 'vitest';
import { ToolProviderIdEnum } from '../../../types';
import {
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

  it('maps each override provider to a lenient object schema', () => {
    expect(TOOL_PROVIDER_OVERRIDE_SCHEMAS[ToolProviderIdEnum.PagerDuty]).toBe(pagerdutyOverrideJsonSchema);
    expect(TOOL_PROVIDER_OVERRIDE_SCHEMAS[ToolProviderIdEnum.Opsgenie]).toBe(opsgenieOverrideJsonSchema);
    expect(pagerdutyOverrideJsonSchema.additionalProperties).toBe(true);
    expect(opsgenieOverrideJsonSchema.additionalProperties).toBe(true);
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
