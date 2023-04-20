import { AfricastalkingSmsProvider } from './africastalking.provider';

test('should trigger africastalking library correctly', async () => {
  const provider = new AfricastalkingSmsProvider({
    apiKey: 'b664b089f04b72c56ac3b0a8ffbb6f3d18a82eb40c29d17b49b84433439fb127',
    username: 'sandbox',
    from: '1234',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.africastalkingClient, 'send')
    .mockImplementation(async () => {
      return {
        date: new Date().toISOString(),
        id: Math.ceil(Math.random() * 100),
      } as any;
    });

  await provider.sendMessage({
    to: '+2347063317344',
    content: 'SMS Content',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: '+2347063317344',
    from: '2585',
    message: 'SMS Content',
  });
});
