import { GupshupSmsProvider } from './gupshup.provider';

test('should trigger gupshup library correctly', async () => {
  const provider = new GupshupSmsProvider({
    userId: '1',
    password: 'password',
  });

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        date: new Date().toISOString(),
        id: Math.ceil(Math.random() * 100),
      } as any;
    });

  await provider.sendMessage({
    content: 'Your otp code is 32901',
    from: 'GupshupTest',
    to: '+2347063317344',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: '+2347063317344',
    from: 'GupshupTest',
    content: 'Your otp code is 32901',
  });
});
