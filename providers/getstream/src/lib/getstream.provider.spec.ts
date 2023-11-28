import { GetstreamChatProvider } from './getstream.provider';

test('should trigger getstream correctly', async () => {
  const config = { apiKey: 'test' };

  const provider = new GetstreamChatProvider(config);
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
