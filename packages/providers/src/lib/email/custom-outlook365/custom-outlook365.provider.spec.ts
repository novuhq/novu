import { CheckIntegrationResponseEnum, ICheckIntegrationResponse } from '@novu/stateless';
import nodemailer from 'nodemailer';
import { expect, test, vi } from 'vitest';
import { CustomOutlook365Provider } from './custom-outlook365.provider';

const sendMailMock = vi.fn().mockReturnValue(() => {
  return {
    messageId: 'message-id',
  } as any;
});

vi.spyOn(nodemailer, 'createTransport').mockImplementation(() => {
  return {
    sendMail: sendMailMock,
  } as any;
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
  cc: ['cc1@test.com', 'cc2@test.com'],
  bcc: ['bcc1@test.com'],
};

test('should trigger custom-outlook365 library correctly', async () => {
  const provider = new CustomOutlook365Provider(mockConfig);

  const response = await provider.sendMessage(mockNovuMessage);

  expect(response).not.toBeNull();
  expect(sendMailMock).toHaveBeenCalled();
  expect(sendMailMock).toHaveBeenCalledWith({
    attachments: undefined,
    from: {
      name: mockConfig.senderName,
      address: mockConfig.from,
    },
    to: ['test@test2.com'],
    cc: ['cc1@test.com', 'cc2@test.com'],
    bcc: ['bcc1@test.com'],
    subject: 'test subject',
    html: '<div> Mail Content </div>',
    text: undefined,
  });
});

test('should trigger custom-outlook365 library correctly with _passthrough', async () => {
  const provider = new CustomOutlook365Provider(mockConfig);

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
      name: mockConfig.senderName,
      address: mockConfig.from,
    },
    to: ['test@test2.com'],
    cc: ['cc1@test.com', 'cc2@test.com'],
    bcc: ['bcc1@test.com'],
    subject: 'test subject',
    html: '<div> Mail Content _passthrough </div>',
    text: undefined,
  });
});

test('should check provider integration correctly', async () => {
  const provider = new CustomOutlook365Provider(mockConfig);

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
