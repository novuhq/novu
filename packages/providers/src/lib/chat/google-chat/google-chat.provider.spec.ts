import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { GoogleChatProvider } from './google-chat.provider';

test('should trigger google chat webhook correctly', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy();

  const provider = new GoogleChatProvider({});
  const testWebhookUrl = 'https://chat.googleapis.com/v1/spaces/AAAA1234/messages?key=apikey&token=token';
  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: testWebhookUrl,
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'Hello world',
  });

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: testWebhookUrl,
    method: 'POST',
    headers: undefined,
    body: {
      text: 'Hello world',
    },
  });
  expect(result.date).toBeDefined();
});

test('should trigger google chat webhook correctly with _passthrough', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy();

  const provider = new GoogleChatProvider({});
  const testWebhookUrl = 'https://chat.googleapis.com/v1/spaces/AAAA1234/messages?key=apikey&token=token';

  await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: testWebhookUrl,
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: 'Hello world',
    },
    {
      _passthrough: {
        body: {
          text: 'passthrough message',
        },
      },
    }
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: testWebhookUrl,
    method: 'POST',
    headers: undefined,
    body: {
      text: 'passthrough message',
    },
  });
});
