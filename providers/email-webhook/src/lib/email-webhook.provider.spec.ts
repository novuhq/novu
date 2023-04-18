import axios from 'axios';
import { EmailWebhookProvider } from './email-webhook.provider';

test('should trigger email-webhook-provider library correctly', async () => {
  const fakePost = jest.fn(() => {
    return Promise.resolve({ data: true });
  });

  jest.spyOn(axios, 'post').mockImplementation(fakePost);

  const provider = new EmailWebhookProvider({
    webhookUrl: 'http://localhost:8080/webhook',
    hmacSecretKey: 'super-secret-key',
    retryDelay: 1,
    retryCount: 1,
  });

  const testTo = 'johndoe@example.com';
  const testFrom = 'janedoe@example.com';

  const payload = {
    to: [testTo],
    from: testFrom,
    subject: 'test',
    html: '<h1>test</h1>',
    text: 'test',
  };

  await provider.sendMessage(payload);

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(
    'http://localhost:8080/webhook',
    {
      templateId: 2,
      subscriber_email: testTo,
      from_email: testFrom,
    },
    {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature':
          '77e213e0d31711be9153a724f521c4d7d050fcfdcecf84a53bbc6d478932ed2a',
      },
    }
  );
});
