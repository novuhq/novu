import { IEmailOptions } from '@novu/stateless';
import { expect, test, vi } from 'vitest';
import { ResendEmailProvider } from './resend.provider';

const mockConfig = {
  apiKey: 'this-api-key-from-resend',
  from: 'test@test.com',
};

const mockNovuMessage: IEmailOptions = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  replyTo: 'no-reply@novu.co',
  attachments: [
    {
      mime: 'text/plain',
      file: Buffer.from('test'),
      name: 'test.txt',
    },
  ],
};
const mockNovuMessageWithContentId: IEmailOptions = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<img src="cid:test" alt="test" />',
  subject: 'Test subject',
  replyTo: 'no-reply@novu.co',
  attachments: [
    {
      mime: 'image/png',
      file: Buffer.from('test'),
      name: 'test.png',
      cid: 'test',
    },
  ],
};

test('should trigger resend library correctly', async () => {
  const provider = new ResendEmailProvider(mockConfig);
  const spy = vi.spyOn(provider, 'sendMessage').mockImplementation(async () => {
    return {};
  });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: mockNovuMessage.from,
    to: mockNovuMessage.to,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
    attachments: mockNovuMessage.attachments,
    replyTo: mockNovuMessage.replyTo,
  });
});

test('should trigger resend email with From Name', async () => {
  const mockConfigWithSenderName = {
    ...mockConfig,
    senderName: 'Test User',
  };

  const provider = new ResendEmailProvider(mockConfigWithSenderName);
  const spy = vi.spyOn((provider as any).resendClient.emails, 'send').mockImplementation(async () => {
    return {};
  });

  await provider.sendMessage(mockNovuMessageWithContentId);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: `${mockConfigWithSenderName.senderName} <${mockNovuMessageWithContentId.from}>`,
    to: mockNovuMessageWithContentId.to,
    html: mockNovuMessageWithContentId.html,
    subject: mockNovuMessageWithContentId.subject,
    attachments: mockNovuMessageWithContentId.attachments.map((attachment) => ({
      filename: attachment?.name,
      content: attachment.file,
      contentId: attachment.cid,
    })),
    replyTo: mockNovuMessageWithContentId.replyTo,
    headers: mockNovuMessageWithContentId.headers,
    cc: mockNovuMessageWithContentId.cc,
    bcc: mockNovuMessageWithContentId.bcc,
    text: mockNovuMessageWithContentId.text,
  });
});

test('should trigger resend email correctly with _passthrough', async () => {
  const mockConfigWithSenderName = {
    ...mockConfig,
    senderName: 'Test User',
  };

  const provider = new ResendEmailProvider(mockConfigWithSenderName);
  const spy = vi.spyOn((provider as any).resendClient.emails, 'send').mockImplementation(async () => {
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
      contentId: attachment.cid,
    })),
    replyTo: mockNovuMessage.replyTo,
    headers: mockNovuMessage.headers,
    cc: mockNovuMessage.cc,
    bcc: mockNovuMessage.bcc,
    text: mockNovuMessage.text,
  });
});
