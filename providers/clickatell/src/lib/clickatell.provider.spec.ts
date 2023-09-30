import { ClickatellSmsProvider } from './clickatell.provider';

test('should trigger clickatellSmsProvider library correctly', async () => {
  const provider = new ClickatellSmsProvider({
    apiKey: '<clickatell-api-key>',
  });

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: '67890-90q8',
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '+2347089736898',
    content: 'Test',
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith({
    to: '+2347089736898',
    content: 'Test',
  });
});
