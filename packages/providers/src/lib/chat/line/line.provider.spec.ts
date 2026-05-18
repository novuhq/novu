import { ChannelEndpointByType, ENDPOINT_TYPES, IChatOptions } from '@novu/stateless';
import { nanoid } from 'nanoid';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { LineChatProvider } from './line.provider';

const mockProviderConfig = {
  channelAccessToken: 'my-channel-access-token',
};

const lineUserId = 'U1234567890abcdef';

const buildChannelData = (): IChatOptions['channelData'] => ({
  identifier: '-',
  type: ENDPOINT_TYPES.WEBHOOK,
  endpoint: { url: lineUserId },
});

const buildResponse = (messageId: string) => ({
  data: {
    sentMessages: [{ id: messageId, quoteToken: nanoid() }],
  },
});

const expectedHeaders = {
  baseURL: 'https://api.line.me/v2/bot/message',
  headers: {
    Authorization: `Bearer ${mockProviderConfig.channelAccessToken}`,
    'Content-Type': 'application/json',
  },
};

test('should trigger LINE library correctly with text message', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new LineChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Hello from Novu',
    channelData: buildChannelData(),
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalledWith('/push', {
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.WEBHOOK]).url,
    messages: [{ type: 'text', text: options.content }],
  });

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders);
  expect(res.id).toBe(messageId);
});

test('should send a flex message when customData.flex is provided', async () => {
  const messageId = nanoid();
  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new LineChatProvider(mockProviderConfig);

  const flexPayload = {
    altText: 'Order shipped',
    contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } },
  };

  const options: IChatOptions = {
    content: 'Order shipped',
    channelData: buildChannelData(),
    customData: { flex: flexPayload },
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalledWith('/push', {
    to: lineUserId,
    messages: [{ type: 'flex', ...flexPayload }],
  });
  expect(res.id).toBe(messageId);
});

test('should send an image message when customData.image is provided', async () => {
  const messageId = nanoid();
  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new LineChatProvider(mockProviderConfig);

  const imagePayload = {
    originalContentUrl: 'https://example.com/image.jpg',
    previewImageUrl: 'https://example.com/preview.jpg',
  };

  const options: IChatOptions = {
    content: 'Check this image',
    channelData: buildChannelData(),
    customData: { image: imagePayload },
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalledWith('/push', {
    to: lineUserId,
    messages: [{ type: 'image', ...imagePayload }],
  });
  expect(res.id).toBe(messageId);
});

test('should send a sticker message when customData.sticker is provided', async () => {
  const messageId = nanoid();
  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new LineChatProvider(mockProviderConfig);

  const stickerPayload = { packageId: '1', stickerId: '1' };

  const options: IChatOptions = {
    content: 'Sticker fallback',
    channelData: buildChannelData(),
    customData: { sticker: stickerPayload },
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalledWith('/push', {
    to: lineUserId,
    messages: [{ type: 'sticker', ...stickerPayload }],
  });
  expect(res.id).toBe(messageId);
});

test('should return id as undefined when sentMessages is empty', async () => {
  const { mockPost: _ } = axiosSpy({ data: { sentMessages: [] } });

  const provider = new LineChatProvider(mockProviderConfig);

  const res = await provider.sendMessage({
    content: 'Hello',
    channelData: buildChannelData(),
  });

  expect(res.id).toBeUndefined();
});

test('should override scalar fields via _passthrough', async () => {
  const messageId = nanoid();

  const { mockPost } = axiosSpy(buildResponse(messageId));

  const provider = new LineChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Hello from Novu',
    channelData: buildChannelData(),
  };

  const overrideUserId = 'U_OVERRIDE_USER_ID';

  const res = await provider.sendMessage(options, {
    _passthrough: {
      body: { to: overrideUserId },
    },
  });

  expect(mockPost).toHaveBeenCalledWith('/push', {
    to: overrideUserId,
    messages: [{ type: 'text', text: options.content }],
  });

  expect(res.id).toBe(messageId);
});

test('should throw on invalid channel data', async () => {
  const provider = new LineChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Hello',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+1234567890' },
    },
  };

  await expect(provider.sendMessage(options)).rejects.toThrow('Invalid channel data for LINE provider');
});
