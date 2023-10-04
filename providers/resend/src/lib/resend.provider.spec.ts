import { ResendEmailProvider } from './resend.provider';
import { Resend } from 'resend';
const mockConfig = {
  apiKey: 'this-api-key-from-resend',
  from: 'test@test.com',
};

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  attachments: [
    {
      mime: 'text/plain',
      file: Buffer.from('test'),
      name: 'test.txt',
    },
  ],
};

test('should trigger resend library correctly', async () => {
  const provider = new ResendEmailProvider(mockConfig);
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith({
    from: mockNovuMessage.from,
    to: mockNovuMessage.to,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
    attachments: mockNovuMessage.attachments,
  });
});

test('should trigger resend email with From Name', async () => {
  const mockConfigWithSenderName = {
    ...mockConfig,
    senderName: 'Test User',
  };

  const provider = new ResendEmailProvider(mockConfigWithSenderName);
  const spy = jest
    .spyOn(Resend.prototype, 'sendEmail')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: `${mockConfigWithSenderName.senderName} <${mockNovuMessage.from}>`,
    to: mockNovuMessage.to,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
    attachments: mockNovuMessage.attachments.map((attachment) => ({
      filename: attachment?.name,
      content: attachment.file,
    })),
    cc: undefined,
    bcc: undefined,
  });
});
