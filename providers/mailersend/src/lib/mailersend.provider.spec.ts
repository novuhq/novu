import { MailersendEmailProvider } from './mailersend.provider';
import MailerSend from 'mailersend';

const mockConfig = {
  apiKey: 'SG.1234',
};

const mockNotifireMessage = {
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
      return {} as any;
    });
  const response = await provider.sendMessage(mockNotifireMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toBeCalledWith({
    to: mockNotifireMessage.to,
    subject: mockNotifireMessage.subject,
    html: mockNotifireMessage.html,
    text: mockNotifireMessage.text,
    from: mockNotifireMessage.from,
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
      return {} as any;
    });
  const response = await provider.sendMessage(mockNotifireMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toBeCalledWith('/email', {
    method: 'POST',
    body: {
      to: [{ email: 'test@test1.com' }, { email: 'test@test2.com' }],
      subject: mockNotifireMessage.subject,
      html: mockNotifireMessage.html,
      text: mockNotifireMessage.text,
      from: { email: mockNotifireMessage.from },
      attachments: [
        {
          content: Buffer.from('ZEdWemRBPT0=').toString(),
          filename: 'test.txt',
        },
      ],
    },
  });
});
