import { MailersendEmailProvider } from './mailersend.provider';
import MailerSend, { Attachment, Recipient } from 'mailersend';

const mockConfig = {
  apiKey: 'SG.1234',
};

const mockNovuMessage = {
  to: ['test@test1.com', 'test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  text: 'Mail Content',
  from: 'test@tet.com',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
};

test('should trigger mailerSend with expected parameters', async () => {
  const provider = new MailersendEmailProvider(mockConfig);
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });
  const response = await provider.sendMessage(mockNovuMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toBeCalledWith({
    to: mockNovuMessage.to,
    subject: mockNovuMessage.subject,
    html: mockNovuMessage.html,
    text: mockNovuMessage.text,
    from: mockNovuMessage.from,
    attachments: [
      {
        mime: 'text/plain',
        file: Buffer.from('dGVzdA=='),
        name: 'test.txt',
      },
    ],
  });
});

test('should trigger mailerSend correctly', async () => {
  const provider = new MailersendEmailProvider(mockConfig);
  const spy = jest
    .spyOn(MailerSend.prototype, 'request')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  const attachment = new Attachment(
    Buffer.from('ZEdWemRBPT0=').toString(),
    'test.txt'
  );
  const recipient1 = new Recipient('test@test1.com', undefined);
  const recipient2 = new Recipient('test@test2.com', undefined);

  const response = await provider.sendMessage(mockNovuMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toBeCalledWith('/email', {
    method: 'POST',
    body: {
      from: { email: mockNovuMessage.from, name: undefined },
      to: [recipient1, recipient2],
      cc: undefined,
      bcc: undefined,
      reply_to: undefined,
      attachments: [attachment],
      subject: mockNovuMessage.subject,
      text: mockNovuMessage.text,
      html: mockNovuMessage.html,
      template_id: undefined,
      variables: undefined,
      personalization: undefined,
      tags: undefined,
    },
  });
});
