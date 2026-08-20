import { ChannelEndpointByType, ENDPOINT_TYPES, IChatOptions } from '@novu/stateless';
import { nanoid } from 'nanoid';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { TelegramChatProvider } from './telegram.provider';

const mockProviderConfig = {
  botToken: 'test-bot-token-123',
};

const buildResponse = (messageId: number) => {
  return {
    data: {
      ok: true,
      result: {
        message_id: messageId,
        date: Math.floor(Date.now() / 1000),
      },
    },
  };
};

test('should send a text message to a Telegram chat', async () => {
  const messageId = Math.floor(Math.random() * 100000);

  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new TelegramChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Hello from Novu',
    channelData: {
      identifier: 'chat-123',
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: '123456789' },
    },
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.botToken), {
    chat_id: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.TELEGRAM_CHAT]).chatId,
    text: options.content,
  });

  expect(res.id).toBe(String(messageId));
});

test('should merge _passthrough body fields into the Telegram request', async () => {
  const messageId = Math.floor(Math.random() * 100000);

  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new TelegramChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Hello from Novu',
    channelData: {
      identifier: 'chat-123',
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: '123456789' },
    },
  };

  const res = await provider.sendMessage(options, {
    _passthrough: {
      body: {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
    },
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.botToken), {
    chat_id: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.TELEGRAM_CHAT]).chatId,
    text: options.content,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });

  expect(res.id).toBe(String(messageId));
});

test('should throw when channel data type is not TELEGRAM_CHAT', async () => {
  const messageId = Math.floor(Math.random() * 100000);

  axiosSpy(buildResponse(messageId));

  const provider = new TelegramChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Hello',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+1111111111' },
    },
  };

  await expect(provider.sendMessage(options)).rejects.toThrow('Invalid channel data for Telegram provider');
});

test('should use the bot token in the request URL', async () => {
  const messageId = Math.floor(Math.random() * 100000);
  const customToken = nanoid();

  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new TelegramChatProvider({ botToken: customToken });

  const options: IChatOptions = {
    content: 'Token test',
    channelData: {
      identifier: 'chat-abc',
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: '987654321' },
    },
  };

  await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalledWith(baseUrl(customToken), expect.objectContaining({ chat_id: '987654321' }));
});

test('should update a Telegram message via editMessageText', async () => {
  const messageId = Math.floor(Math.random() * 100000);

  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new TelegramChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Approved',
    nativePayload: { parse_mode: 'HTML' },
    channelData: {
      identifier: 'chat-123',
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: '123456789' },
    },
  };

  const res = await provider.updateMessage(options, String(messageId));

  expect(mockPost).toHaveBeenCalledWith(editUrl(mockProviderConfig.botToken), {
    chat_id: '123456789',
    message_id: String(messageId),
    text: 'Approved',
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [] },
  });
  expect(res.id).toBe(String(messageId));
});

test('should keep reply_markup from native payload when updating a Telegram message', async () => {
  const messageId = Math.floor(Math.random() * 100000);

  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new TelegramChatProvider(mockProviderConfig);
  const replyMarkup = { inline_keyboard: [[{ text: 'Open', url: 'https://novu.co' }]] };

  await provider.updateMessage(
    {
      content: 'Updated',
      nativePayload: { reply_markup: replyMarkup },
      channelData: {
        identifier: 'chat-123',
        type: ENDPOINT_TYPES.TELEGRAM_CHAT,
        endpoint: { chatId: '123456789' },
      },
    },
    String(messageId)
  );

  expect(mockPost).toHaveBeenCalledWith(
    editUrl(mockProviderConfig.botToken),
    expect.objectContaining({ reply_markup: replyMarkup })
  );
});

function baseUrl(botToken: string) {
  return `https://api.telegram.org/bot${botToken}/sendMessage`;
}

function editUrl(botToken: string) {
  return `https://api.telegram.org/bot${botToken}/editMessageText`;
}
