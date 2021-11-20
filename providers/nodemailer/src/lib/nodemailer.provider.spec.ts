const sendMailMock = jest.fn().mockReturnValue(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
});

// eslint-disable-next-line import/first
import { NodemailerProvider } from './nodemailer.provider';

jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: sendMailMock,
    }),
  };
});

const mockConfig = {
  host: 'test.test.email',
  port: 587,
  secure: false,
  from: 'test@test.com',
  user: 'test@test.com',
  password: 'test123',
};

const mockNotifireMessage = {
  to: 'test@test2.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' },
  ],
};

test('should trigger nodemailer correctly', async () => {
  const provider = new NodemailerProvider(mockConfig);
  await provider.sendMessage(mockNotifireMessage);

  expect(sendMailMock).toHaveBeenCalled();
  expect(sendMailMock).toHaveBeenCalledWith({
    from: mockConfig.from,
    html: mockNotifireMessage.html,
    subject: mockNotifireMessage.subject,
    to: mockNotifireMessage.to,
    attachments: [
      {
        contentType: 'text/plain',
        content: 'test',
        filename: 'test.txt',
      },
    ],
  });
});
