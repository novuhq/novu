<<<<<<< HEAD
<<<<<<< HEAD
import { Outlook365Provider } from './outlook365.provider';
=======
import { Outlook365EmailProvider } from './outlook365.provider';
>>>>>>> df77c37be (feat: New Office365 provider)
=======
import { Outlook365Provider } from './outlook365.provider';
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)

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
<<<<<<< HEAD
  senderName: 'test@test.com',
=======
  user: 'test@test.com',
>>>>>>> df77c37be (feat: New Office365 provider)
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
<<<<<<< HEAD
<<<<<<< HEAD
  const provider = new Outlook365Provider(mockConfig);
=======
  const provider = new Outlook365EmailProvider(mockConfig);
>>>>>>> df77c37be (feat: New Office365 provider)
=======
  const provider = new Outlook365Provider(mockConfig);
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)
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
<<<<<<< HEAD
<<<<<<< HEAD
  const provider = new Outlook365Provider(mockConfig);
=======
  const provider = new Outlook365EmailProvider(mockConfig);
>>>>>>> df77c37be (feat: New Office365 provider)
=======
  const provider = new Outlook365Provider(mockConfig);
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)
  const response = await provider.checkIntegration(mockNovuMessage);

  expect(sendMailMock).toHaveBeenCalled();
  expect(response.success).toBe(true);
});
