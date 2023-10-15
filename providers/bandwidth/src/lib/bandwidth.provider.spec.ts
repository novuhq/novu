import { BandwidthSmsProvider } from './bandwidth.provider';

test('should trigger BandwidthSmsProvider library correctly', async () => {
  const provider = new BandwidthSmsProvider({
    username: '<your-bandwidth-username>',
    password: '<your-bandwidth-password>',
    accountId: '<your-bandwidth-accountId>',
  });

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: '12345-67a8',
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '+12345678902',
    content: 'test message',
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith({
    to: '+12345678902',
    content: 'test message',
  });
});
