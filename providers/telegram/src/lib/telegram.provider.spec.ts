import { TelegramProvider } from './telegram.provider';

test('should trigger telegram library correctly', async () => {
  const provider = new TelegramProvider({
    botToken: 'bottoken_123',
  });
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        message_id: '123456',
        date: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    chatUserId: 'chatUserId',
    content: 'chat message',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    chatUserId: 'chatUserId',
    content: 'chat message',
  });
});
