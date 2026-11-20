import { ENDPOINT_TYPES } from '@novu/shared';
import { expect, test } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { GoogleChatProvider } from './google-chat.provider';

const WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/space-id/messages?key=key&token=token';
const MESSAGE_NAME = 'spaces/space-id/messages/message-id';

function webhookOptions(content = 'Hello from Novu') {
  return {
    channelData: {
      endpoint: {
        url: WEBHOOK_URL,
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content,
  };
}

test('should send a text message to a Google Chat incoming webhook', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: {
      name: MESSAGE_NAME,
      createTime: '2026-09-21T12:00:00.000Z',
    },
  });
  const provider = new GoogleChatProvider();
  const result = await provider.sendMessage(webhookOptions());

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: WEBHOOK_URL,
    method: 'POST',
    headers: undefined,
    body: {
      text: 'Hello from Novu',
    },
  });
  expect(result).toEqual({
    id: MESSAGE_NAME,
    date: '2026-09-21T12:00:00.000Z',
  });
});

test('should reject a 2xx webhook response without a message name', async () => {
  safeOutboundJsonSpy({
    body: {
      createTime: '2026-09-21T12:00:00.000Z',
    },
  });
  const provider = new GoogleChatProvider();

  await expect(provider.sendMessage(webhookOptions())).rejects.toThrow(
    'Google Chat webhook response did not include a message name'
  );
});

test('should apply passthrough body fields', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: {
      name: MESSAGE_NAME,
    },
  });
  const provider = new GoogleChatProvider();

  const result = await provider.sendMessage(webhookOptions(), {
    _passthrough: {
      body: {
        text: 'Passthrough message',
        cardsV2: [{ cardId: 'status-card' }],
      },
    },
  });

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: WEBHOOK_URL,
    method: 'POST',
    headers: undefined,
    body: {
      text: 'Passthrough message',
      cardsV2: [{ cardId: 'status-card' }],
    },
  });
  expect(result).toEqual({ id: MESSAGE_NAME });
});

test('should reject non-webhook channel data', async () => {
  const provider = new GoogleChatProvider();

  await expect(
    provider.sendMessage({
      channelData: {
        endpoint: {
          channelId: 'channel-id',
        },
        type: ENDPOINT_TYPES.SLACK_CHANNEL,
        identifier: 'test-channel-identifier',
        token: 'connection-token',
      },
      content: 'Hello from Novu',
    })
  ).rejects.toThrow('Invalid channel data for Google Chat provider');
});
