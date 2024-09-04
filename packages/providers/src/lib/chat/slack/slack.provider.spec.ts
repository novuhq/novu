import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { SlackProvider } from './slack.provider';

test('should trigger Slack correctly', async () => {
  const { mockPost } = axiosSpy({
    data: {
      status: 'test',
    },
  });

  const provider = new SlackProvider();
  await provider.sendMessage({
    webhookUrl: 'webhookUrl',
    content: 'chat message',
  });

  expect(mockPost).toBeCalledWith('webhookUrl', {
    text: 'chat message',
    blocks: undefined,
  });
});

test('should trigger Slack correctly with _passthrough', async () => {
  const { mockPost } = axiosSpy({
    data: {
      status: 'test',
    },
  });

  const provider = new SlackProvider();
  await provider.sendMessage(
    {
      webhookUrl: 'webhookUrl',
      content: 'chat message',
    },
    {
      _passthrough: {
        body: {
          text: 'chat message _passthrough',
        },
      },
    },
  );

  expect(mockPost).toBeCalledWith('webhookUrl', {
    text: 'chat message _passthrough',
    blocks: undefined,
  });
});
