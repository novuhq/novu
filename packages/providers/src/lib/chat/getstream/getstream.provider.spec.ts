import { ADDRESS_TYPES } from '@novu/stateless';
import { expect, test, vi } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
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
      address: {
        url: 'webhookUrl',
      },
      type: ADDRESS_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'chat message',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    channelData: {
      address: {
        url: 'webhookUrl',
      },
      type: ADDRESS_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'chat message',
  });
});

test('should trigger getstream correctly with _passthrough', async () => {
  const config = { apiKey: 'test' };

  const { mockPost } = axiosSpy({
    headers: {
      'X-WEBHOOK-ID': 'X-WEBHOOK-ID',
    },
  });

  const provider = new GetstreamChatProvider(config);

  await provider.sendMessage(
    {
      channelData: {
        address: {
          url: 'https://www.google.com/',
        },
        type: ADDRESS_TYPES.WEBHOOK,
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

  expect(mockPost).toHaveBeenCalledWith('https://www.google.com/', {
    headers: {
      'X-API-KEY': 'test1',
    },
    text: 'passthrough message',
  });
});
