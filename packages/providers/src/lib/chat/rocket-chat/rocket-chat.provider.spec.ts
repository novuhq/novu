import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { RocketChatProvider } from './rocket-chat.provider';

const rootUrl = 'https://rocketchat.example.com';

test('should trigger rocket-chat library correctly', async () => {
  const mockConfig = {
    user: '<your-user>',
    token: '<your-auth-token>',
  };
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: {
      message: {
        _id: 'id',
        ts: new Date().toISOString(),
      },
    },
  });
  const provider = new RocketChatProvider(mockConfig);

  await provider.sendMessage({
    channelData: {
      endpoint: {
        url: rootUrl,
        channel: '<your-channel>',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: '<your-chat-message>',
  });

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: `${rootUrl}/api/v1/chat.sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': '<your-auth-token>',
      'x-user-id': '<your-user>',
    },
    body: {
      message: {
        msg: '<your-chat-message>',
        rid: '<your-channel>',
      },
    },
  });
});

test('should trigger rocket-chat library correctly with _passthrough', async () => {
  const mockConfig = {
    user: '<your-user>',
    token: '<your-auth-token>',
  };
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: {
      message: {
        _id: 'id',
        ts: new Date().toISOString(),
      },
    },
  });
  const provider = new RocketChatProvider(mockConfig);

  await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: rootUrl,
          channel: '<your-channel>',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: '<your-chat-message>',
    },
    {
      _passthrough: {
        body: {
          message: {
            rid: '_passthrough',
          },
        },
        headers: {
          'x-auth-token': '_passthrough',
        },
      },
    }
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: `${rootUrl}/api/v1/chat.sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': '_passthrough',
      'x-user-id': '<your-user>',
    },
    body: {
      message: {
        msg: '<your-chat-message>',
        rid: '_passthrough',
      },
    },
  });
});
