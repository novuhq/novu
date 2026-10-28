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

test('retries 421 Service not active during AUTH LOGIN', async () => {
  vi.useFakeTimers();
  const serviceNotActive = Object.assign(
    new Error('Invalid login sequence while waiting for "334 VXNlcm5hbWU6": 421 4.3.2 Service not active'),
    {
      code: 'EAUTH',
      response: '421 4.3.2 Service not active [BN9PR03CA0257.namprd03.prod.outlook.com]',
      responseCode: 421,
      command: 'AUTH LOGIN',
    }
  );
  sendMailMock.mockRejectedValueOnce(serviceNotActive).mockResolvedValueOnce({
    messageId: 'retried-id',
  });

  const provider = new Outlook365Provider(mockConfig);
  const sendPromise = provider.sendMessage(mockNovuMessage);
  await vi.runAllTimersAsync();
  const response = await sendPromise;

  expect(response.id).toBe('retried-id');
  expect(sendMailMock).toHaveBeenCalledTimes(2);
});

test.each([450, 451, 452, 454])('retries transient SMTP %s before the message is submitted', async (responseCode) => {
  vi.useFakeTimers();
  const temporaryFailure = Object.assign(new Error(`temporary ${responseCode}`), {
    code: 'EAUTH',
    response: `${responseCode} 4.7.0 Temporary failure`,
    responseCode,
    command: 'AUTH LOGIN',
  });
  sendMailMock.mockRejectedValueOnce(temporaryFailure).mockResolvedValueOnce({
    messageId: 'retried-id',
  });

  const provider = new Outlook365Provider(mockConfig);
  const sendPromise = provider.sendMessage(mockNovuMessage);
  await vi.runAllTimersAsync();
  const response = await sendPromise;

  expect(response.id).toBe('retried-id');
  expect(sendMailMock).toHaveBeenCalledTimes(2);
});

test('retries a transient code carried only on the SMTP response during EHLO', async () => {
  vi.useFakeTimers();
  const ehloFailure = Object.assign(new Error('Server terminates connection'), {
    code: 'ECONNECTION',
    response: '451 4.7.0 Temporary server error. Please try again later',
    command: 'EHLO',
  });
  sendMailMock.mockRejectedValueOnce(ehloFailure).mockResolvedValueOnce({
    messageId: 'retried-id',
  });

  const provider = new Outlook365Provider(mockConfig);
  const sendPromise = provider.sendMessage(mockNovuMessage);
  await vi.runAllTimersAsync();
  const response = await sendPromise;

  expect(response.id).toBe('retried-id');
  expect(sendMailMock).toHaveBeenCalledTimes(2);
});

test('does not retry permanent SMTP authentication failures', async () => {
  const authError = Object.assign(new Error('Invalid login: 535 5.7.3 Authentication unsuccessful'), {
    code: 'EAUTH',
    response: '535 5.7.3 Authentication unsuccessful',
    responseCode: 535,
    command: 'AUTH LOGIN',
  });
  sendMailMock.mockRejectedValueOnce(authError);

  const provider = new Outlook365Provider(mockConfig);

  await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('Authentication unsuccessful');
  expect(sendMailMock).toHaveBeenCalledTimes(1);
});

test('does not retry transient SMTP codes after MAIL or DATA', async () => {
  const dataError = Object.assign(new Error('Message failed: 421 4.4.2 Connection dropped'), {
    code: 'EMESSAGE',
    response: '421 4.4.2 Connection dropped',
    responseCode: 421,
    command: 'DATA',
  });
  sendMailMock.mockRejectedValueOnce(dataError);

  const provider = new Outlook365Provider(mockConfig);

  await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('Connection dropped');
  expect(sendMailMock).toHaveBeenCalledTimes(1);
});

test('exhausts transient AUTH retries then throws the original error', async () => {
  vi.useFakeTimers();
  const serviceNotActive = Object.assign(new Error('421 4.3.2 Service not active'), {
    code: 'EAUTH',
    response: '421 4.3.2 Service not active',
    responseCode: 421,
    command: 'AUTH LOGIN',
  });
  sendMailMock.mockRejectedValue(serviceNotActive);

  const provider = new Outlook365Provider(mockConfig);
  const sendPromise = provider.sendMessage(mockNovuMessage);
  const assertion = expect(sendPromise).rejects.toThrow('421 4.3.2 Service not active');
  await vi.runAllTimersAsync();
  await assertion;
  expect(sendMailMock).toHaveBeenCalledTimes(3);
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
