import { CheckIntegrationResponseEnum, ICheckIntegrationResponse } from '@novu/stateless';
import nodemailer from 'nodemailer';
import { afterEach, expect, test, vi } from 'vitest';
import { Outlook365Provider } from './outlook365.provider';

const sendMailMock = vi.fn().mockResolvedValue({
  messageId: 'message-id',
});

vi.spyOn(nodemailer, 'createTransport').mockImplementation(() => {
  return {
    sendMail: sendMailMock,
  } as any;
});

afterEach(() => {
  vi.useRealTimers();
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({
    messageId: 'message-id',
  });
});

const mockConfig = {
  from: 'test@test.com',
  senderName: 'test@test.com',
  password: 'test123',
};

const mockNovuMessage = {
  to: ['test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
};

test('keeps nodemailer socketTimeout default so large sends are not capped at handshake timeout', () => {
  new Outlook365Provider(mockConfig);

  expect(nodemailer.createTransport).toHaveBeenCalledWith(
    expect.objectContaining({
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
    })
  );
  expect(nodemailer.createTransport).not.toHaveBeenCalledWith(
    expect.objectContaining({
      socketTimeout: expect.anything(),
    })
  );
});

test('should trigger outlook365 library correctly', async () => {
  const provider = new Outlook365Provider(mockConfig);

  const response = await provider.sendMessage(mockNovuMessage);

  expect(response).not.toBeNull();
  expect(sendMailMock).toHaveBeenCalled();
  expect(sendMailMock).toHaveBeenCalledWith({
    attachments: undefined,
    from: {
      address: 'test@test.com',
      name: 'test@test.com',
    },
    html: '<div> Mail Content </div>',
    subject: 'test subject',
    text: undefined,
    to: ['test@test2.com'],
  });
});

test('should trigger outlook365 library correctly with _passthrough', async () => {
  const provider = new Outlook365Provider(mockConfig);

  const response = await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        html: '<div> Mail Content _passthrough </div>',
      },
    },
  });

  expect(response).not.toBeNull();
  expect(sendMailMock).toHaveBeenCalled();
  expect(sendMailMock).toHaveBeenCalledWith({
    attachments: undefined,
    from: {
      address: 'test@test.com',
      name: 'test@test.com',
    },
    html: '<div> Mail Content _passthrough </div>',
    subject: 'test subject',
    text: undefined,
    to: ['test@test2.com'],
  });
});

test('should forward cc and bcc to sendMail', async () => {
  const provider = new Outlook365Provider(mockConfig);

  const response = await provider.sendMessage({
    ...mockNovuMessage,
    cc: ['cc@example.com'],
    bcc: ['bcc@example.com'],
  });

  expect(response).not.toBeNull();
  expect(sendMailMock).toHaveBeenCalledWith(
    expect.objectContaining({
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
    })
  );
});

test('should forward custom MIME alternatives to sendMail', async () => {
  const provider = new Outlook365Provider(mockConfig);
  const reactionAlternative = {
    contentType: 'text/vnd.google.email-reaction+json',
    content: JSON.stringify({ version: 1, emoji: '👀' }),
  };

  const response = await provider.sendMessage({
    ...mockNovuMessage,
    alternatives: [reactionAlternative],
  });

  expect(response).not.toBeNull();
  expect(sendMailMock).toHaveBeenCalledWith(
    expect.objectContaining({
      alternatives: [reactionAlternative],
    })
  );
});

test('should check provider integration correctly', async () => {
  const provider = new Outlook365Provider(mockConfig);

  const spy = vi.spyOn(provider, 'checkIntegration').mockImplementation(async () => {
    return {
      success: true,
      message: 'test',
      code: CheckIntegrationResponseEnum.SUCCESS,
    } as ICheckIntegrationResponse;
  });

  const response = await provider.checkIntegration(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(mockNovuMessage);
  expect(response).not.toBeNull();
  expect(response.success).toBeTruthy();
  expect(response.message).toBe('test');
  expect(response.code).toBe(CheckIntegrationResponseEnum.SUCCESS);
});

test('retries TCP handshake failures and succeeds on a later attempt', async () => {
  vi.useFakeTimers();
  const connectError = Object.assign(new Error('connect ECONNRESET'), {
    code: 'ESOCKET',
    command: 'CONN',
    syscall: 'connect',
  });
  sendMailMock.mockRejectedValueOnce(connectError).mockResolvedValueOnce({
    messageId: 'retried-id',
  });

  const provider = new Outlook365Provider(mockConfig);
  const sendPromise = provider.sendMessage(mockNovuMessage);
  await vi.runAllTimersAsync();
  const response = await sendPromise;

  expect(response.id).toBe('retried-id');
  expect(sendMailMock).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});

test('does not retry ESOCKET CONN after the SMTP session may have started', async () => {
  const midSessionError = Object.assign(new Error('read ECONNRESET'), {
    code: 'ESOCKET',
    command: 'CONN',
    syscall: 'read',
  });
  sendMailMock.mockRejectedValueOnce(midSessionError);

  const provider = new Outlook365Provider(mockConfig);

  await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('read ECONNRESET');
  expect(sendMailMock).toHaveBeenCalledTimes(1);
});

test('does not retry SMTP errors after the connect phase', async () => {
  const authError = Object.assign(new Error('Invalid login'), {
    code: 'EAUTH',
    command: 'AUTH',
  });
  sendMailMock.mockRejectedValueOnce(authError);

  const provider = new Outlook365Provider(mockConfig);

  await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('Invalid login');
  expect(sendMailMock).toHaveBeenCalledTimes(1);
});

test('exhausts connect retries then throws the original error', async () => {
  vi.useFakeTimers();
  const connectError = Object.assign(new Error('Greeting never received'), {
    code: 'ETIMEDOUT',
    command: 'CONN',
  });
  sendMailMock.mockRejectedValue(connectError);

  const provider = new Outlook365Provider(mockConfig);
  const sendPromise = provider.sendMessage(mockNovuMessage);
  const assertion = expect(sendPromise).rejects.toThrow('Greeting never received');
  await vi.runAllTimersAsync();
  await assertion;
  expect(sendMailMock).toHaveBeenCalledTimes(3);
});
