import { ChatProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { resolveOverrideForPreview } from './override-preview';

describe('resolveOverrideForPreview', () => {
  it('ignores preview-only keys so a late preview echo cannot invent an override', () => {
    expect(
      resolveOverrideForPreview({
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        formOverrides: undefined,
        previewOverrides: {
          [ChatProviderIdEnum.WhatsAppBusiness]: { text: { preview_url: true } },
        },
      })
    ).toEqual({ hasOverride: false, override: undefined });
  });

  it('uses form presence for hasOverride and prefers liquid-resolved preview content', () => {
    const formOverride = { text: 'from form {{payload.x}}' };
    const previewOverride = { text: 'from preview resolved' };

    expect(
      resolveOverrideForPreview({
        providerId: ChatProviderIdEnum.Slack,
        formOverrides: { [ChatProviderIdEnum.Slack]: formOverride },
        previewOverrides: { [ChatProviderIdEnum.Slack]: previewOverride },
      })
    ).toEqual({ hasOverride: true, override: previewOverride });
  });

  it('falls back to the form override while preview is still settling', () => {
    const formOverride = { message: 'pagerduty alert' };

    expect(
      resolveOverrideForPreview({
        providerId: ToolProviderIdEnum.PagerDuty,
        formOverrides: { [ToolProviderIdEnum.PagerDuty]: formOverride },
        previewOverrides: {},
      })
    ).toEqual({ hasOverride: true, override: formOverride });
  });

  it('treats an empty form entry as an override', () => {
    expect(
      resolveOverrideForPreview({
        providerId: ChatProviderIdEnum.Discord,
        formOverrides: { [ChatProviderIdEnum.Discord]: {} },
        previewOverrides: undefined,
      })
    ).toEqual({ hasOverride: true, override: {} });
  });
});
