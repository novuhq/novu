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
    webhookUrl: 'https://google.com',
    content: 'chat message',
  });

  expect(mockPost).toBeCalledWith('https://google.com/', {
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
      webhookUrl: 'https://google.com',
      content: 'chat message',
    },
    {
      _passthrough: {
        body: {
          content: 'chat message _passthrough',
        },
      },
    },
  );

  expect(mockPost).toBeCalledWith('https://google.com/', {
    content: 'chat message _passthrough',
  });
});
