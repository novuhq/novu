import {
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { Outlook365Provider } from './outlook365.provider';

const mockConfig = {
  from: 'test@test.com',
  senderName: 'test@test.com',
  password: 'test123',
};

const buffer = Buffer.from('test');

const mockNovuMessage = {
  to: ['test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [{ mime: 'text/plain', file: buffer, name: 'test.txt' }],
};

test('should trigger outlook365 library correctly', async () => {
  const provider = new Outlook365Provider(mockConfig);
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: 'message-id',
        date: '11/28/2022',
      } as ISendMessageSuccessResponse;
    });

  const response = await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(mockNovuMessage);

  expect(response).not.toBeNull();
  expect(response.date).toBe('11/28/2022');
  expect(response.id).toBe('message-id');
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
