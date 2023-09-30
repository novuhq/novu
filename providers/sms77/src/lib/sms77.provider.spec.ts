import { Sms77SmsProvider } from './sms77.provider';

test('should trigger sms77 correctly', async () => {
  const provider = new Sms77SmsProvider({
    apiKey: '<sms77-api-key>',
    from: '+1145678',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.sms77Client, 'sms')
    .mockImplementation(async () => {
      return {
        messages: [{ id: null }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '+187654',
    content: 'Test',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: '+1145678',
    json: true,
    text: 'Test',
    to: '+187654',
  });
});
