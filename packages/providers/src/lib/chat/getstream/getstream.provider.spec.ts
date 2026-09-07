import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test, vi } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { GetstreamChatProvider } from './getstream.provider';

test('should trigger getstream correctly', async () => {
  const config = { apiKey: 'test' };

  const provider = new GetstreamChatProvider(config);
  const spy = vi.spyOn(provider, 'sendMessage').mockImplementation(async () => {
    return {
      dateCreated: new Date(),
    } as any;
  });

  await provider.sendMessage({
    channelData: {
      endpoint: {
        url: 'webhookUrl',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'chat message',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    channelData: {
      endpoint: {
        url: 'webhookUrl',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'chat message',
  });
});

test('should trigger getstream correctly with _passthrough', async () => {
  const config = { apiKey: 'test' };

  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    headers: {
      'x-webhook-id': 'X-WEBHOOK-ID',
    },
  });

  const provider = new GetstreamChatProvider(config);

  await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: 'https://www.google.com/',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: 'chat message',
    },
    {
      _passthrough: {
        body: {
          text: 'passthrough message',
        },
        headers: {
          'X-API-KEY': 'test1',
        },
      },
    }
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: 'https://www.google.com/',
    method: 'POST',
    headers: undefined,
    body: {
      headers: {
        'X-API-KEY': 'test1',
      },
      text: 'passthrough message',
    },
  });
});
