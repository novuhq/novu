import { describe, expect, it } from 'vitest';
import { ChatProviderIdEnum, ToolProviderIdEnum } from '../../../types';
import { mergeProviderPreview } from './merge-provider-preview';

describe('mergeProviderPreview', () => {
  it('fills omitted primary key from body and sets defaultContentKey', () => {
    const result = mergeProviderPreview({
      body: 'Default incident message',
      providerId: ToolProviderIdEnum.PagerDuty,
      override: { severity: 'critical' },
    });

    expect(result).toEqual({
      merged: {
        severity: 'critical',
        summary: 'Default incident message',
      },
      defaultContentKey: 'summary',
    });
  });

  it('keeps a non-empty primary key override and omits defaultContentKey', () => {
    const result = mergeProviderPreview({
      body: 'Default incident message',
      providerId: ToolProviderIdEnum.Opsgenie,
      override: { message: 'Override alert', priority: 'P1' },
    });

    expect(result).toEqual({
      merged: {
        message: 'Override alert',
        priority: 'P1',
      },
    });
    expect(result.defaultContentKey).toBeUndefined();
  });

  it('keeps webhook overrides unchanged when no primary content key exists', () => {
    expect(
      mergeProviderPreview({
        body: 'Default webhook body',
        providerId: ToolProviderIdEnum.Webhook,
        override: { event: 'incident.created' },
      })
    ).toEqual({
      merged: { event: 'incident.created' },
    });
  });

  it('treats empty-string primary key as missing and fills from body', () => {
    const result = mergeProviderPreview({
      body: 'Default incident message',
      providerId: ToolProviderIdEnum.PagerDuty,
      override: { summary: '', severity: 'warning' },
    });

    expect(result).toEqual({
      merged: {
        summary: 'Default incident message',
        severity: 'warning',
      },
      defaultContentKey: 'summary',
    });
  });

  it('treats null primary key as missing and fills from body', () => {
    const result = mergeProviderPreview({
      body: 'Default opsgenie message',
      providerId: ToolProviderIdEnum.Opsgenie,
      override: { message: null },
    });

    expect(result).toEqual({
      merged: {
        message: 'Default opsgenie message',
      },
      defaultContentKey: 'message',
    });
  });

  it('fills a nested primary path while preserving sibling override fields', () => {
    const result = mergeProviderPreview({
      body: 'Hello from Novu',
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      override: { text: { preview_url: true } },
    });

    expect(result).toEqual({
      merged: {
        text: {
          preview_url: true,
          body: 'Hello from Novu',
        },
      },
      defaultContentKey: 'text.body',
    });
  });

  it('keeps an explicit nested primary path and omits defaultContentKey', () => {
    const result = mergeProviderPreview({
      body: 'Hello from Novu',
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      override: { text: { body: 'Custom WhatsApp body', preview_url: true } },
    });

    expect(result).toEqual({
      merged: {
        text: {
          body: 'Custom WhatsApp body',
          preview_url: true,
        },
      },
    });
    expect(result.defaultContentKey).toBeUndefined();
  });
});
