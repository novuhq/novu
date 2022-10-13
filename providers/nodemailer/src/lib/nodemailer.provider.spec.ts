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

const buffer = Buffer.from('test');
const mockNovuMessage = {
  to: 'test@test2.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [{ mime: 'text/plain', file: buffer, name: 'test.txt' }],
};

test('should trigger nodemailer correctly', async () => {
  const provider = new NodemailerProvider(mockConfig);
  await provider.sendMessage(mockNovuMessage);

  expect(sendMailMock).toHaveBeenCalled();
  expect(sendMailMock).toHaveBeenCalledWith({
    from: mockConfig.from,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
    to: mockNovuMessage.to,
    attachments: [
      {
        contentType: 'text/plain',
        content: buffer,
        filename: 'test.txt',
      },
    ],
  });
});

test('should check provider integration correctly', async () => {
  const provider = new NodemailerProvider(mockConfig);
  const response = await provider.checkIntegration(mockNovuMessage);

  expect(sendMailMock).toHaveBeenCalled();
  expect(response.success).toBe(true);
});
