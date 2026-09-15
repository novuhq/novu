import { describe, expect, it } from 'vitest';
import { ChatProviderIdEnum, PushProviderIdEnum, ToolProviderIdEnum } from '../../../types';
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

  it('fills the grafana title from body when only message is overridden', () => {
    const result = mergeProviderPreview({
      body: 'Disk usage above threshold',
      providerId: ToolProviderIdEnum.Grafana,
      override: { message: 'Node db-1 is at 94% of its volume' },
    });

    expect(result).toEqual({
      merged: {
        message: 'Node db-1 is at 94% of its volume',
        title: 'Disk usage above threshold',
      },
      defaultContentKey: 'title',
    });
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

  it('injects a LINE text message from the step body when override omits messages', () => {
    const result = mergeProviderPreview({
      body: 'Hello from Novu',
      providerId: ChatProviderIdEnum.Line,
      override: { notificationDisabled: true },
    });

    expect(result).toEqual({
      merged: {
        notificationDisabled: true,
        messages: [{ type: 'text', text: 'Hello from Novu' }],
      },
      defaultContentKey: 'messages.0.text',
    });
  });

  it('keeps an explicit LINE messages override and omits defaultContentKey', () => {
    const flexMessage = {
      type: 'flex',
      altText: 'Card',
      contents: { type: 'bubble' },
    };
    const result = mergeProviderPreview({
      body: 'Hello from Novu',
      providerId: ChatProviderIdEnum.Line,
      override: { messages: [flexMessage] },
    });

    expect(result).toEqual({
      merged: { messages: [flexMessage] },
    });
    expect(result.defaultContentKey).toBeUndefined();
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

  it('fills omitted Expo body from the step body and sets defaultContentKey', () => {
    const result = mergeProviderPreview({
      body: 'Default push body',
      providerId: PushProviderIdEnum.EXPO,
      override: { channelId: 'orders' },
    });

    expect(result).toEqual({
      merged: {
        channelId: 'orders',
        body: 'Default push body',
      },
      defaultContentKey: 'body',
    });
  });

  it('keeps an explicit Expo body override and omits defaultContentKey', () => {
    const result = mergeProviderPreview({
      body: 'Default push body',
      providerId: PushProviderIdEnum.EXPO,
      override: { body: 'Custom Expo body', channelId: 'orders' },
    });

    expect(result).toEqual({
      merged: {
        body: 'Custom Expo body',
        channelId: 'orders',
      },
    });
    expect(result.defaultContentKey).toBeUndefined();
  });

  it('fills omitted FCM notification.body from the step body and preserves siblings', () => {
    const result = mergeProviderPreview({
      body: 'Default push body',
      providerId: PushProviderIdEnum.FCM,
      override: { notification: { title: 'Orders' }, android: { priority: 'high' } },
    });

    expect(result).toEqual({
      merged: {
        notification: {
          title: 'Orders',
          body: 'Default push body',
        },
        android: { priority: 'high' },
      },
      defaultContentKey: 'notification.body',
    });
  });

  it('keeps an explicit FCM notification.body override and omits defaultContentKey', () => {
    const result = mergeProviderPreview({
      body: 'Default push body',
      providerId: PushProviderIdEnum.FCM,
      override: { notification: { title: 'Orders', body: 'Custom FCM body' } },
    });

    expect(result).toEqual({
      merged: {
        notification: {
          title: 'Orders',
          body: 'Custom FCM body',
        },
      },
    });
    expect(result.defaultContentKey).toBeUndefined();
  });
});
