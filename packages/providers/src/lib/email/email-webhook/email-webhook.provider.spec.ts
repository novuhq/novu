import axios from 'axios';
import { EmailWebhookProvider } from './email-webhook.provider';

test('should trigger email-webhook-provider library correctly', async () => {
  const fakePost = jest.fn(() => {
    return Promise.resolve({ data: true });
  });

  jest.spyOn(axios, 'post').mockImplementation(fakePost);

  const provider = new EmailWebhookProvider({
    webhookUrl: 'http://127.0.0.1:8080/webhook',
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
    'http://127.0.0.1:8080/webhook',
    '{"to":["johndoe@example.com"],"from":"janedoe@example.com","subject":"test","html":"<h1>test</h1>","text":"test"}',
    {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature':
          'd1e94cd19eeceec2e0717e36f7edacaa93612b311bde8756ee35b89d4a994767',
      },
    }
  );
});
