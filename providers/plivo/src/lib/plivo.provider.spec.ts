import { PlivoSmsProvider } from './plivo.provider';

test('should trigger plivo correctly', async () => {
  const provider = new PlivoSmsProvider({
    accountSid: '<plivo-id>',
    authToken: '<plivo-token>',
    from: '+1145678',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.plivoClient.messages, 'create')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage({
    to: '+187654',
    content: 'Test',
  });
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith('+1145678', '+187654', 'Test');
});
