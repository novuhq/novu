import { expect, test, vi } from 'vitest';
import { InfobipEmailProvider } from './infobip.provider';

test('should trigger infobip library correctly - E-mail', async () => {
  const provider = new InfobipEmailProvider({
    baseUrl: 'localhost',
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
    baseUrl: 'localhost',
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
    },
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
