import { Outlook365EmailProvider } from './outlook365.provider';

const sendMailMock = jest.fn().mockReturnValue(() => {
  return {} as any;
});

jest.mock('office365', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: sendMailMock,
    }),
  };
});

const mockConfig = {
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

test('should trigger outlook365 library correctly', async () => {
  const provider = new Outlook365EmailProvider(mockConfig);
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
  const provider = new Outlook365EmailProvider(mockConfig);
  const response = await provider.checkIntegration(mockNovuMessage);

  expect(sendMailMock).toHaveBeenCalled();
  expect(response.success).toBe(true);
});
