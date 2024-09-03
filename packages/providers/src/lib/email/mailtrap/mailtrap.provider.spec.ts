import { expect, test, vi } from 'vitest';
import { MailtrapClient, SendResponse } from 'mailtrap';
import { CheckIntegrationResponseEnum } from '@novu/stateless';
import { MailtrapEmailProvider } from './mailtrap.provider';

const mockConfig = {
  apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  from: 'test@test.com',
};

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
};

const mockMailtrapResponse: SendResponse = {
  success: true,
  message_ids: ['0c7fd939-02cf-11ed-88c2-0a58a9feac02'],
};

test('should trigger mailtrap library correctly', async () => {
  const provider = new MailtrapEmailProvider(mockConfig);
  const spy = vi
    .spyOn(MailtrapClient.prototype, 'send')
    .mockImplementation(async () => mockMailtrapResponse);

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith({
    from: { email: mockNovuMessage.from },
    to: [{ email: mockNovuMessage.to[0] }],
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
  });
});

test('should check integration successfully', async () => {
  const provider = new MailtrapEmailProvider(mockConfig);
  const spy = vi
    .spyOn(MailtrapClient.prototype, 'send')
    .mockImplementation(async () => mockMailtrapResponse);

  const messageResponse = await provider.checkIntegration(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(messageResponse).toStrictEqual({
    success: true,
    message: 'Integrated successfully!',
    code: CheckIntegrationResponseEnum.SUCCESS,
  });
});
