import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { MattermostProvider } from './mattermost.provider';

test('should trigger mattermost library correctly, default channel', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    headers: { 'x-request-id': 'default' },
  });

  const provider = new MattermostProvider();
  const testWebhookUrl = 'https://mattermost.dummy.webhook.com';
  const testContent = 'Dummy content message';
  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: testWebhookUrl,
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: testContent,
  });

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: testWebhookUrl,
    method: 'POST',
    headers: undefined,
    body: {
      text: 'Dummy content message',
    },
  });
  expect(result.id).toBe('default');
});

test('should trigger mattermost library correctly, override channel', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    headers: { 'x-request-id': 'username' },
  });

  const provider = new MattermostProvider();
  const testWebhookUrl = 'https://mattermost.dummy.webhook.com';
  const testContent = 'Dummy content message';
  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: testWebhookUrl,
        channel: '@username',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: testContent,
  });

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: testWebhookUrl,
    method: 'POST',
    headers: undefined,
    body: {
      channel: '@username',
      text: 'Dummy content message',
    },
  });
  expect(result.id).toBe('username');
});

test('should trigger mattermost library correctly, default channel with _passthrough', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    headers: { 'x-request-id': 'default' },
  });

  const provider = new MattermostProvider();
  const testWebhookUrl = 'https://mattermost.dummy.webhook.com';
  const testContent = 'Dummy content message';
  const result = await provider.sendMessage(
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
          text: '_passthrough content message',
        },
      },
    }
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: testWebhookUrl,
    method: 'POST',
    headers: undefined,
    body: {
      text: '_passthrough content message',
    },
  });
  expect(result.id).toBe('default');
});
