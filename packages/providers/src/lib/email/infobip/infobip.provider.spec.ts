import { CheckIntegrationResponseEnum } from '@novu/stateless';
import { expect, test, vi } from 'vitest';
import { InfobipEmailProvider } from './infobip.provider';

test('should trigger infobip library correctly - E-mail', async () => {
  const provider = new InfobipEmailProvider({
    baseUrl: 'https://test.api.infobip.com',
    apiKey: '<infobip-auth-token>',
  });

  const spy = vi

    // @ts-expect-error
    .spyOn(provider.infobipClient.channels.email, 'send')
    .mockImplementation(async () => {
      return {
        data: {
          messages: [
            {
              messageId: '<a-valid-message-id>',
            },
          ],
        },
      };
    });

  await provider.sendMessage({
    to: ['example@example.org'],
    from: 'example@example.org',
    subject: 'Hello World Test',
    text: 'Plain text',
    html: '<div>HTML</div>',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: ['example@example.org'],
    from: 'example@example.org',
    subject: 'Hello World Test',
    text: 'Plain text',
    html: '<div>HTML</div>',
  });
});

test('should trigger infobip library correctly - E-mail with _passthrough', async () => {
  const provider = new InfobipEmailProvider({
    baseUrl: 'https://test.api.infobip.com',
    apiKey: '<infobip-auth-token>',
  });

  const spy = vi

    // @ts-expect-error
    .spyOn(provider.infobipClient.channels.email, 'send')
    .mockImplementation(async () => {
      return {
        data: {
          messages: [
            {
              messageId: '<a-valid-message-id>',
            },
          ],
        },
      };
    });

  await provider.sendMessage(
    {
      to: ['example@example.org'],
      from: 'example@example.org',
      subject: 'Hello World Test',
      text: 'Plain text',
      html: '<div>HTML</div>',
    },
    {
      _passthrough: {
        body: {
          html: '<div>_passthrough</div>',
        },
      },
    }
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: ['example@example.org'],
    from: 'example@example.org',
    subject: 'Hello World Test',
    text: 'Plain text',
    html: '<div>_passthrough</div>',
  });
});

test('checkIntegration should fail when the Infobip SDK resolves with the request error', async () => {
  const provider = new InfobipEmailProvider({
    baseUrl: 'https://test.api.infobip.com',
    apiKey: '<infobip-auth-token>',
  });
  // @ts-expect-error
  const spy = vi.spyOn(provider.infobipClient.channels.email, 'send');
  const mail = { to: ['example@example.org'], subject: 'Checking', html: '<div>HTML</div>' };

  // The SDK catches the axios error and returns it.
  spy.mockResolvedValueOnce(
    Object.assign(new Error('Request failed with status code 401'), { response: { status: 401 } })
  );
  expect(await provider.checkIntegration(mail)).toMatchObject({
    success: false,
    code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
  });

  spy.mockResolvedValueOnce(
    Object.assign(new Error('Request failed with status code 400'), { response: { status: 400 } })
  );
  expect(await provider.checkIntegration(mail)).toMatchObject({
    success: false,
    code: CheckIntegrationResponseEnum.FAILED,
  });

  spy.mockResolvedValueOnce({ data: { messages: [{ messageId: 'id' }] } });
  expect(await provider.checkIntegration(mail)).toMatchObject({ success: true });
});
