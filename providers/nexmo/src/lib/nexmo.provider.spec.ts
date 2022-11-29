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
    .mockImplementation(async (_a, _b, _c, _d, cb) => {
      cb(null, {
        'message-count': 1,
        messages: [
          {
            'message-id': '123',
            to: '1',
            'message-price': '1',
            'remaining-balance': '1',
            status: '0' as never,
            'account-ref': '1',
            network: '1',
          },
        ],
      });
    });

  await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
  });

  expect(spy.mock.calls[0][0]).toBe('+112345');
  expect(spy.mock.calls[0][1]).toBe('+176543');
  expect(spy.mock.calls[0][2]).toBe('SMS Content');
});
