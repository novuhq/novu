import { MsTeamsProvider } from './msTeams.provider';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

test('should trigger msTeams webhook correctly', async () => {
  const fakePost = jest.fn(() => {
    return { headers: { ['request-id']: uuidv4() } };
  });

  jest.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
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
