import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { RyverChatProvider } from './ryver.provider';

test('Should trigger ryver correctly', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    statusCode: 200,
  });

  const provider = new RyverChatProvider();

  await provider.sendMessage({
    channelData: {
      endpoint: {
        url: 'https://google.com',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'chat message',
  });

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: 'https://google.com/',
    method: 'POST',
    headers: undefined,
    body: {
      content: 'chat message',
    },
  });
});

test('Should trigger ryver correctly with _passthrough', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    statusCode: 200,
  });

  const provider = new RyverChatProvider();

  await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: 'https://google.com',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: 'chat message',
    },
    {
      _passthrough: {
        body: {
          content: 'chat message _passthrough',
        },
      },
    }
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: 'https://google.com/',
    method: 'POST',
    headers: undefined,
    body: {
      content: 'chat message _passthrough',
    },
  });
});
