import { ClicksendSmsProvider } from './clicksend.provider';

test('should trigger ClicksendSmsProvider library correctly', async () => {
  const provider = new ClicksendSmsProvider({
    username: '<your-clicksend-username>',
    apiKey: '<your-clicksend-API>',
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
    to: '+0451111111',
    content: 'test message',
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith({
    to: '+0451111111',
    content: 'test message',
  });
});
