import { DiscordProvider } from './discord.provider';

test('should trigger Discord provider correctly', async () => {
  const provider = new DiscordProvider({});
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        dateCreated: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    webhookUrl: 'webhookUrl',
    content: 'chat message',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    webhookUrl: 'webhookUrl',
    content: 'chat message',
  });
});
