import { ENDPOINT_TYPES } from '@novu/shared';
import { expect, test, vi } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { DiscordProvider } from './discord.provider';

test('should trigger Discord provider correctly', async () => {
  const provider = new DiscordProvider({});
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

test('should trigger Discord provider correctly with _passthrough', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: {
      id: 'id',
      timestamp: new Date().toISOString(),
    },
  });
  const provider = new DiscordProvider({});

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
          content: 'passthrough content',
        },
      },
    }
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: 'https://www.google.com/?wait=true',
    method: 'POST',
    headers: undefined,
    body: {
      content: 'passthrough content',
    },
  });
});
