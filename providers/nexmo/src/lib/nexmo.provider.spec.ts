import { NexmoSmsProvider } from './nexmo.provider';

test('should trigger nexmo library correctly', async () => {
  const provider = new NexmoSmsProvider({
    apiKey: '<vonage-api-key>',
    apiSecret: '<vonage-api-secret>',
    from: '+112345',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.vonageClient.message, 'sendSms')
    .mockImplementation(async () => {
      return {
        messages: [{ 'message-id': '123' }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });
  await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: '+112345',
    body: 'SMS Content',
    to: '+176543',
  });
});
