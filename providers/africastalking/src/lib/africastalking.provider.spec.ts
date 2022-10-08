import { AfricastalkingSmsProvider } from './africastalking.provider';

test('should trigger AT library correctly', async () => {
  const provider = new AfricastalkingSmsProvider({
    apiKey: '<AT-api-key>',
    username: '<AT-username>'
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.africasTalkingClient.message, 'sendSms')
    .mockImplementation(async (_a, _b, _c, _d, cb) => {
      cb(null, {/* ... */});
    });

  await provider.sendMessage({
    to: '+255747XXXYYY',
    content: 'SMS Content',
  });

  expect(spy.mock.calls[0][0]).toBe('<AT-username>');
  expect(spy.mock.calls[0][1]).toBe('+255747XXXYYY');
  expect(spy.mock.calls[0][2]).toBe('SMS Content');
});
