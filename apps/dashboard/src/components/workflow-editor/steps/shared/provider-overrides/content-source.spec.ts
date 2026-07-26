import { ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getUnsupportedOverrideKeys } from './content-source';

describe('getUnsupportedOverrideKeys', () => {
  it('allows arbitrary webhook keys while preserving strict provider schemas', () => {
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.Webhook, { custom: true })).toEqual([]);
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.PagerDuty, { custom: true })).toEqual(['custom']);
    expect(getUnsupportedOverrideKeys(ToolProviderIdEnum.Opsgenie, { custom: true })).toEqual(['custom']);
  });
});
