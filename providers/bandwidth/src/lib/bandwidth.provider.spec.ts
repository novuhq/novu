import { BandwidthSmsProvider } from './bandwidth.provider';

test('should trigger BandwidthSmsProvider library correctly', async () => {
  const provider = new BandwidthSmsProvider({
    username: '<your-bandwidth-username>',
    password: '<your-bandwidth-password>',
    accountId: '<your-bandwidth-accountId>',
  });

  const spy = jest
    .spyOn(provider.controller, 'createMessage')
    .mockImplementation(async () => {
      return {
        result: {
          id: '12345-67a8',
          time: new Date().toISOString(),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '+12345678902',
    content: 'test message',
    from: '+1234567890',
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith('<your-bandwidth-accountId>', {
    applicationId: '<your-bandwidth-accountId>',
    to: ['+12345678902'],
    from: '+1234567890',
    text: 'test message',
  });
});
