import { CheckIntegrationResponseEnum } from '@novu/stateless';
import { expect, test, vi } from 'vitest';
import { MailersendEmailProvider } from './mailersend.provider';

const mail = { to: ['test@test.com'], subject: 'Checking', html: '<div>HTML</div>' };

test('checkIntegration should report a refusal MailerSend rejects with, instead of throwing', async () => {
  const provider = new MailersendEmailProvider({ apiKey: 'API_KEY', from: 'test@test.com', senderName: 'Test' });
  const spy = vi.spyOn(provider['mailerSend'].email, 'send');

  // The SDK rejects with a plain `{ statusCode, body }` object.
  spy.mockRejectedValueOnce({ statusCode: 401, body: { message: 'Unauthenticated.' } });
  expect(await provider.checkIntegration(mail)).toEqual({
    success: false,
    message: 'Unauthenticated.',
    code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
  });

  // Denied for a token MailerSend knows: a failure, but not a rejected credential.
  spy.mockRejectedValueOnce({ statusCode: 403, body: { message: 'This action is unauthorized.' } });
  expect(await provider.checkIntegration(mail)).toMatchObject({
    success: false,
    code: CheckIntegrationResponseEnum.FAILED,
  });

  spy.mockResolvedValueOnce({ statusCode: 202, body: {}, headers: {} } as any);
  expect(await provider.checkIntegration(mail)).toMatchObject({ success: true });
});

test('checkIntegration should still throw when the request never got an answer', async () => {
  const provider = new MailersendEmailProvider({ apiKey: 'API_KEY', from: 'test@test.com', senderName: 'Test' });
  vi.spyOn(provider['mailerSend'].email, 'send').mockRejectedValueOnce(new Error('socket hang up'));

  await expect(provider.checkIntegration(mail)).rejects.toThrow('socket hang up');
});
