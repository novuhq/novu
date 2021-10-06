import Mailgun from 'mailgun.js';
import nock from 'nock';

import { MailgunEmailProvider } from './mailgun.provider';

test('should trigger mailgun correctly', async () => {
  const provider = new MailgunEmailProvider({
    apiKey: 'SG.1234',
    domain: 'test.com',
    username: 'api',
    from: 'test@tet.com',
  });
  const createFn = jest.fn();
  jest.spyOn(Mailgun.prototype, 'client').mockImplementation(() => {
    return {
      messages: {
        create: createFn,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
  const api = nock('https://api.mailgun.net');
  api.post('/v3/test.com/messages').reply(200, {
    message: 'Queued. Thank you.',
    id: '<20111114174239.25659.5817@samples.mailgun.org>',
  });

  await provider.sendMessage({
    to: 'test@test2.com',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
  });

  api.done();
});
