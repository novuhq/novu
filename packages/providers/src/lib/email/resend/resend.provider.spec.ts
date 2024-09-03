import { expect, test, vi } from 'vitest';
import { ResendEmailProvider } from './resend.provider';

const mockConfig = {
  apiKey: 'this-api-key-from-resend',
  from: 'test@test.com',
};

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  reply_to: 'no-reply@novu.co',
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
  const spy = vi.spyOn(provider, 'sendMessage').mockImplementation(async () => {
    return {};
  });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith({
    from: mockNovuMessage.from,
    to: mockNovuMessage.to,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
    attachments: mockNovuMessage.attachments,
    reply_to: mockNovuMessage.reply_to,
  });
});

test('should trigger resend email with From Name', async () => {
  const mockConfigWithSenderName = {
    ...mockConfig,
    senderName: 'Test User',
  };

  const provider = new ResendEmailProvider(mockConfigWithSenderName);
  const spy = vi
    .spyOn((provider as any).resendClient.emails, 'send')
    .mockImplementation(async () => {
      return {};
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
    reply_to: null,
    cc: undefined,
    bcc: undefined,
  });
});

test('should trigger resend email correctly with _passthrough', async () => {
  const mockConfigWithSenderName = {
    ...mockConfig,
    senderName: 'Test User',
  };

  const provider = new ResendEmailProvider(mockConfigWithSenderName);
  const spy = vi
    .spyOn((provider as any).resendClient.emails, 'send')
    .mockImplementation(async () => {
      return {};
    });

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        subject: 'Test subject with _passthrough',
      },
    },
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: `${mockConfigWithSenderName.senderName} <${mockNovuMessage.from}>`,
    to: mockNovuMessage.to,
    html: mockNovuMessage.html,
    subject: 'Test subject with _passthrough',
    attachments: mockNovuMessage.attachments.map((attachment) => ({
      filename: attachment?.name,
      content: attachment.file,
    })),
    reply_to: null,
    cc: undefined,
    bcc: undefined,
  });
});
