import { CheckIntegrationResponseEnum, IEmailOptions } from '@novu/stateless';
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

test('verifyCredentials should accept a key Resend knows, including one limited to sending', async () => {
  const provider = new ResendEmailProvider(mockConfig);
  const spy = vi.spyOn(provider['resendClient'].domains, 'list');

  spy.mockResolvedValueOnce({ data: { data: [] }, error: null } as any);
  expect((await provider.verifyCredentials()).status).toBe('valid');

  spy.mockResolvedValueOnce({
    data: null,
    error: { statusCode: 401, name: 'restricted_api_key', message: 'This API key is restricted to only send emails' },
  } as any);
  expect((await provider.verifyCredentials()).status).toBe('valid');
});

test('verifyCredentials should reject a key Resend does not know', async () => {
  const provider = new ResendEmailProvider(mockConfig);
  const spy = vi.spyOn(provider['resendClient'].domains, 'list');

  // What Resend answers today for a made-up key.
  spy.mockResolvedValueOnce({
    data: null,
    error: { statusCode: 400, name: 'validation_error', message: 'API key is invalid' },
  } as any);
  expect((await provider.verifyCredentials()).status).toBe('invalid');

  spy.mockResolvedValueOnce({
    data: null,
    error: { statusCode: 403, name: 'invalid_api_key', message: 'API key is invalid' },
  } as any);
  expect((await provider.verifyCredentials()).status).toBe('invalid');
});

test('verifyCredentials should not call an outage or an unknown answer a rejection', async () => {
  const provider = new ResendEmailProvider(mockConfig);
  const spy = vi.spyOn(provider['resendClient'].domains, 'list');

  spy.mockResolvedValueOnce({
    data: null,
    error: { name: 'application_error', message: 'Unable to fetch data. The request could not be resolved.' },
  } as any);
  expect((await provider.verifyCredentials()).status).toBe('unreachable');

  spy.mockRejectedValueOnce(new Error('socket hang up'));
  expect((await provider.verifyCredentials()).status).toBe('unreachable');

  spy.mockResolvedValueOnce({
    data: null,
    error: { statusCode: 422, name: 'validation_error', message: 'Something else is wrong' },
  } as any);
  expect((await provider.verifyCredentials()).status).toBe('inconclusive');
});

test('checkIntegration should fail when Resend returns an error instead of throwing', async () => {
  const provider = new ResendEmailProvider(mockConfig);
  const spy = vi.spyOn(provider['resendClient'].emails, 'send');

  spy.mockResolvedValueOnce({
    data: null,
    error: { statusCode: 400, name: 'validation_error', message: 'API key is invalid' },
  } as any);
  expect(await provider.checkIntegration(mockNovuMessage)).toMatchObject({
    success: false,
    code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
  });

  spy.mockResolvedValueOnce({
    data: null,
    error: { statusCode: 403, name: 'validation_error', message: 'The acme.com domain is not verified.' },
  } as any);
  expect(await provider.checkIntegration(mockNovuMessage)).toMatchObject({
    success: false,
    code: CheckIntegrationResponseEnum.FAILED,
  });

  spy.mockResolvedValueOnce({ data: { id: 'email-id' }, error: null } as any);
  expect(await provider.checkIntegration(mockNovuMessage)).toMatchObject({ success: true });
});
