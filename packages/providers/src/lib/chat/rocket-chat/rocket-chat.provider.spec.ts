import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { RocketChatProvider } from './rocket-chat.provider';

test('should trigger rocket-chat library correctly', async () => {
  const mockConfig = {
    user: '<your-user>',
    token: '<your-auth-token>',
  };
  const { mockPost } = axiosSpy({
    data: {
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
        url: '<your-root-url>',
        channel: '<your-channel>',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: '<your-chat-message>',
  });

  expect(mockPost).toHaveBeenCalledWith(
    '<your-root-url>/api/v1/chat.sendMessage',
    {
      message: {
        msg: '<your-chat-message>',
        rid: '<your-channel>',
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': '<your-auth-token>',
        'x-user-id': '<your-user>',
      },
    }
  );
});

test('should trigger rocket-chat library correctly with _passthrough', async () => {
  const mockConfig = {
    user: '<your-user>',
    token: '<your-auth-token>',
  };
  const { mockPost } = axiosSpy({
    data: {
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
          url: '<your-root-url>',
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

  expect(mockPost).toHaveBeenCalledWith(
    '<your-root-url>/api/v1/chat.sendMessage',
    {
      message: {
        msg: '<your-chat-message>',
        rid: '_passthrough',
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': '_passthrough',
        'x-user-id': '<your-user>',
      },
    }
  );
});
