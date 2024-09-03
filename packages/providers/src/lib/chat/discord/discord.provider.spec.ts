import { expect, test, vi } from 'vitest';

import { axiosSpy } from '../../../utils/test/spy-axios';
import { DiscordProvider } from './discord.provider';

test('should trigger Discord provider correctly', async () => {
  const provider = new DiscordProvider({});
  const spy = vi.spyOn(provider, 'sendMessage').mockImplementation(async () => {
    return {
      dateCreated: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  await provider.sendMessage({
    webhookUrl: 'webhookUrl',
    content: 'chat message',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    webhookUrl: 'webhookUrl',
    content: 'chat message',
  });
});

test('should trigger Discord provider correctly with _passthrough', async () => {
  const { mockPost } = axiosSpy({
    data: {
      id: 'id',
      timestamp: new Date().toISOString(),
    },
  });
  const provider = new DiscordProvider({});

  await provider.sendMessage(
    {
      webhookUrl: 'https://www.google.com/',
      content: 'chat message',
    },
    {
      _passthrough: {
        body: {
          content: 'passthrough content',
        },
      },
    },
  );

  expect(mockPost).toHaveBeenCalledWith('https://www.google.com/?wait=true', {
    content: 'passthrough content',
  });
});
