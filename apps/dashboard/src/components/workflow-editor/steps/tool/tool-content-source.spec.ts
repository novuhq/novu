import { ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getUnsupportedToolOverrideKeys } from './tool-content-source';

describe('getUnsupportedToolOverrideKeys', () => {
  it('allows arbitrary webhook keys while preserving strict provider schemas', () => {
    expect(getUnsupportedToolOverrideKeys(ToolProviderIdEnum.Webhook, { custom: true })).toEqual([]);
    expect(getUnsupportedToolOverrideKeys(ToolProviderIdEnum.PagerDuty, { custom: true })).toEqual(['custom']);
    expect(getUnsupportedToolOverrideKeys(ToolProviderIdEnum.Opsgenie, { custom: true })).toEqual(['custom']);
  });
});
