import { ChatProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getUnsupportedOverrideKeys, isEscapeHatchProvider } from './content-source';

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

describe('isEscapeHatchProvider', () => {
  it('separates schema-backed providers from free-form passthroughs', () => {
    expect(isEscapeHatchProvider(ToolProviderIdEnum.PagerDuty)).toBe(false);
    expect(isEscapeHatchProvider(ChatProviderIdEnum.Slack)).toBe(false);
    expect(isEscapeHatchProvider(ToolProviderIdEnum.Webhook)).toBe(true);
    expect(isEscapeHatchProvider(ChatProviderIdEnum.Discord)).toBe(true);
  });
});
