import { InfobipSmsProvider } from './infobip.provider';

test('should trigger infobip library correctly', async () => {
  const provider = new InfobipSmsProvider({
    baseUrl: 'localhost',
    apiKey: '<infobip-auth-token>',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
