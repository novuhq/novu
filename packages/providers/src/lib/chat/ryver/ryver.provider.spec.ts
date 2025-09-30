import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { RyverChatProvider } from './ryver.provider';

test('Should trigger ryver correctly', async () => {
  const { mockPost } = axiosSpy({
    data: {
      status: 'test',
    },
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

  expect(mockPost).toHaveBeenCalledWith('https://google.com/', {
    content: 'chat message',
  });
});

test('Should trigger ryver correctly with _passthrough', async () => {
  const { mockPost } = axiosSpy({
    data: {
      status: 'test',
    },
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

  expect(mockPost).toHaveBeenCalledWith('https://google.com/', {
    content: 'chat message _passthrough',
  });
});
