import { ENDPOINT_TYPES } from '@novu/stateless';
import { v4 as uuidv4 } from 'uuid';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { MsTeamsProvider } from './msTeams.provider';

test('should trigger msTeams webhook correctly', async () => {
  const { mockPost: fakePost } = axiosSpy({
    headers: { 'request-id': uuidv4() },
  });

  const provider = new MsTeamsProvider({});

  const testWebhookUrl = 'https://mycompany.webhook.office.com';
  const testContent = '{"title": "Message test title"}';
  await provider.sendMessage({
    channelData: {
      endpoint: {
        url: testWebhookUrl,
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: testContent,
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    title: 'Message test title',
  });
});

test('should trigger msTeams webhook correctly with _passthrough', async () => {
  const { mockPost: fakePost } = axiosSpy({
    headers: { 'request-id': uuidv4() },
  });

  const provider = new MsTeamsProvider({});

  const testWebhookUrl = 'https://mycompany.webhook.office.com';
  const testContent = '{"title": "Message test title"}';
  await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: testWebhookUrl,
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: testContent,
    },
    {
      _passthrough: {
        body: {
          title: '_passthrough test title',
        },
      },
    }
  );

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    title: '_passthrough test title',
  });
});
