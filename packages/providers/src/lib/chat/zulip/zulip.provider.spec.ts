import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { ZulipProvider } from './zulip.provider';

test('should trigger zulip library correctly', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy();

  const provider = new ZulipProvider({});
  const testWebhookUrl =
    'https://test.zulipchat.com/api/v1/external/slack_incoming?api_key=apikey&stream=general';
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

test('should trigger zulip library correctly with _passthrough', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy();

  const provider = new ZulipProvider({});
  const testWebhookUrl =
    'https://test.zulipchat.com/api/v1/external/slack_incoming?api_key=apikey&stream=general';

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
