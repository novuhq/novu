import nock from 'nock';
import { MailgunEmailProvider } from './mailgun.provider';

const mockConfig = {
  apiKey: 'SG.1234',
  domain: 'test.com',
  username: 'api',
  from: 'test@test.com',
};

const mockNovuMessage = {
  to: ['test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
};

test('should trigger mailgun correctly', async () => {
  const provider = new MailgunEmailProvider(mockConfig);

  const api = nock('https://api.mailgun.net');

  api.post('/v3/test.com/messages').reply(200, {
    message: 'Queued. Thank you.',
    id: '<20111114174239.25659.5817@samples.mailgun.org>',
  });

  await provider.sendMessage(mockNovuMessage);

  expect(api.isDone()).toBeTruthy();
  api.done();
});

test('should trigger mailgun correctly with custom baseUrl', async () => {
  const provider = new MailgunEmailProvider({
    ...mockConfig,
    baseUrl: 'https://api.eu.mailgun.net',
  });

  const api = nock('https://api.eu.mailgun.net');

  api.post('/v3/test.com/messages').reply(200, {
    message: 'Queued. Thank you.',
    id: '<20111114174239.25659.5817@samples.mailgun.org>',
  });

  await provider.sendMessage(mockNovuMessage);

  expect(api.isDone()).toBeTruthy();
  api.done();
});
