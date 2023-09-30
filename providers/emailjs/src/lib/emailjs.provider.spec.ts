import {
  CheckIntegrationResponseEnum,
  IEmailOptions,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { IEmailJsConfig } from './emailjs.config';
import { EmailJsProvider } from './emailjs.provider';

const mockConfig = {
  from: 'test',
} as IEmailJsConfig;

const mockNovuMessage = {
  to: ['test@test1.com', 'test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  text: 'Mail Content',
  from: 'test@test.com',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
} as IEmailOptions;

test('should trigger emailjs with expected parameters', async () => {
  const provider = new EmailJsProvider(mockConfig);
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: 'message-id',
        date: '12/01/2020',
      } as ISendMessageSuccessResponse;
    });

  const response = await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toBeCalledWith({
    to: mockNovuMessage.to,
    subject: mockNovuMessage.subject,
    html: mockNovuMessage.html,
    text: mockNovuMessage.text,
    from: mockNovuMessage.from,
    attachments: [
      {
        mime: 'text/plain',
        file: Buffer.from('dGVzdA=='),
        name: 'test.txt',
      },
    ],
  });
  expect(response).not.toBeNull();
  expect(response.date).toBe('12/01/2020');
  expect(response.id).toBe('message-id');
});

test('should trigger emailjs checkIntegration correctly', async () => {
  const provider = new EmailJsProvider(mockConfig);
  const spy = jest
    .spyOn(provider, 'checkIntegration')
    .mockImplementation(async () => {
      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    });

  const response = await provider.checkIntegration(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(response.success).toBeTruthy();
  expect(response.message).toEqual('Integrated successfully!');
  expect(response.code).toEqual(CheckIntegrationResponseEnum.SUCCESS);
});
