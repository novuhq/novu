import {
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
} from '@novu/stateless';
import { Outlook365Provider } from './outlook365.provider';
import nodemailer from 'nodemailer';

const sendMailMock = jest.fn().mockReturnValue(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    messageId: 'message-id',
  } as any;
});

jest.spyOn(nodemailer, 'createTransport').mockImplementation(() => {
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
};

test('should trigger outlook365 library correctly', async () => {
  const provider = new Outlook365Provider(mockConfig);

  const response = await provider.sendMessage(mockNovuMessage);

  expect(response).not.toBeNull();
  expect(sendMailMock).toBeCalled();
  expect(sendMailMock).toBeCalledWith({
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
  expect(sendMailMock).toBeCalled();
  expect(sendMailMock).toBeCalledWith({
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

test('should check provider integration correctly', async () => {
  const provider = new Outlook365Provider(mockConfig);

  const spy = jest
    .spyOn(provider, 'checkIntegration')
    .mockImplementation(async () => {
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
