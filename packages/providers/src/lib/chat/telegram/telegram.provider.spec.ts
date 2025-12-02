import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { TelegramChatProvider } from './telegram.provider';
import { ENDPOINT_TYPES } from '@novu/stateless';

test('should trigger telegram correctly', async () => {
  const { mockPost } = axiosSpy({
    data: {
      ok: true,
      result: {
        message_id: 123,
        date: 1636996660,
        chat: {
          id: 123456789,
          first_name: 'John',
          username: 'doe',
          type: 'private',
        },
        text: 'Hello world',
      },
    },
  });

  const provider = new TelegramChatProvider({
    token: '123456789:ABCdefGhIJKlmNoPQRstuVWxyz',
  });

  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: '123456789',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'telegram-provider-test',
    },
    content: 'Hello world',
  });

  expect(mockPost).toHaveBeenCalledWith(
    'https://api.telegram.org/bot123456789:ABCdefGhIJKlmNoPQRstuVWxyz/sendMessage',
    {
      chat_id: '123456789',
      text: 'Hello world',
    }
  );

  expect(result.id).toBe('123');
  expect(result.date).toBeDefined();
});

test('should trigger telegram correctly with _passthrough', async () => {
  const { mockPost } = axiosSpy({
    data: {
      ok: true,
      result: {
        message_id: 456,
        date: 1636996660,
      },
    },
  });

  const provider = new TelegramChatProvider({
    token: '123456789:ABCdefGhIJKlmNoPQRstuVWxyz',
  });

  await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: '123456789',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'telegram-provider-test',
      },
      content: 'Hello world',
    },
    {
      _passthrough: {
        body: {
          content: 'Hello world passthrough',
        },
      },
    }
  );

  expect(mockPost).toHaveBeenCalledWith(
    'https://api.telegram.org/bot123456789:ABCdefGhIJKlmNoPQRstuVWxyz/sendMessage',
    {
      chat_id: '123456789',
      text: 'Hello world passthrough',
    }
  );
});

test('should throw error when chatId is missing', async () => {
  const provider = new TelegramChatProvider({
    token: '123456789:ABCdefGhIJKlmNoPQRstuVWxyz',
  });

  await expect(
    provider.sendMessage({
      channelData: {
        endpoint: {} as any,
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'telegram-provider-test',
      },
      content: 'Hello world',
    })
  ).rejects.toThrow('Chat ID is missing');
});
