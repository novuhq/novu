import { expect, test } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { MsTeamsProvider } from './msTeams.provider';
import { axiosSpy } from '../../../utils/test/spy-axios';

test('should trigger msTeams webhook correctly', async () => {
  const { mockPost: fakePost } = axiosSpy({
    headers: { 'request-id': uuidv4() },
  });

  const provider = new MsTeamsProvider({});

  const testWebhookUrl = 'https://mycompany.webhook.office.com';
  const testContent = '{"title": "Message test title"}';
  await provider.sendMessage({
    webhookUrl: testWebhookUrl,
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
      webhookUrl: testWebhookUrl,
      content: testContent,
    },
    {
      _passthrough: {
        body: {
          title: '_passthrough test title',
        },
      },
    },
  );

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    title: '_passthrough test title',
  });
});
