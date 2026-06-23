import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { GrafanaOnCallChatProvider } from './grafana-on-call.provider';

test('should trigger grafana-on-call library correctly', async () => {
  const date = new Date();

  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    headers: { date: date.toUTCString() },
  });

  const provider = new GrafanaOnCallChatProvider({
    alertUid: '123',
    externalLink: 'link',
    imageUrl: 'url',
    state: 'ok',
    title: 'title',
  });

  const testWebhookUrl = 'https://mycompany.webhook.grafana.com/';
  const testContent = 'warning!!';
  const res = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: testWebhookUrl,
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: testContent,
  });

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalled();
  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: testWebhookUrl,
    method: 'POST',
    headers: undefined,
    body: {
      alert_uid: '123',
      link_to_upstream_details: 'link',
      image_url: 'url',
      state: 'ok',
      title: 'title',
      message: testContent,
    },
  });
  expect(res.id).toEqual(expect.any(String));
  expect(res.date).toBe(new Date(date.toUTCString()).toISOString());
});

test('should trigger grafana-on-call library correctly with _passthrough', async () => {
  const date = new Date();

  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    headers: { date: date.toUTCString() },
  });

  const provider = new GrafanaOnCallChatProvider({
    alertUid: '123',
    externalLink: 'link',
    imageUrl: 'url',
    state: 'ok',
    title: 'title',
  });

  const testWebhookUrl = 'https://mycompany.webhook.grafana.com/';
  const testContent = 'warning!!';
  const res = await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: testWebhookUrl,
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: testContent,
    },
    {
      _passthrough: {
        body: {
          message: 'passthrough',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalled();
  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: testWebhookUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      alert_uid: '123',
      link_to_upstream_details: 'link',
      image_url: 'url',
      state: 'ok',
      title: 'title',
      message: 'passthrough',
    },
  });
  expect(res.id).toEqual(expect.any(String));
  expect(res.date).toBe(new Date(date.toUTCString()).toISOString());
});
