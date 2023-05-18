import { InfobipEmailProvider, InfobipSmsProvider } from './infobip.provider';

test('should trigger infobip library correctly - SMS', async () => {
  const provider = new InfobipSmsProvider({
    baseUrl: 'localhost',
    apiKey: '<infobip-auth-token>',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.infobipClient.channels.sms, 'send')
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
    to: '44123456',
    content: 'Hello World',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    messages: [
      {
        destinations: [
          {
            to: '44123456',
          },
        ],
        text: 'Hello World',
      },
    ],
  });
});
test('should trigger infobip library correctly - E-mail', async () => {
  const provider = new InfobipEmailProvider({
    baseUrl: 'localhost',
    apiKey: '<infobip-auth-token>',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
