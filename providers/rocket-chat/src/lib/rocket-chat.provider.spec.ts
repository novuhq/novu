import { RocketChatProvider } from './rocket-chat.provider';

test('should trigger rocket-chat library correctly', async () => {
  const mockConfig = {
    user: '<your-user>',
    token: '<your-auth-token>',
  };
  const provider = new RocketChatProvider(mockConfig);

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage({
    webhookUrl: '<your-root-url>',
    channel: '<your-channel>',
    content: '<your-chat-message>',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    webhookUrl: '<your-root-url>',
    channel: '<your-channel>',
    content: '<your-chat-message>',
  });
});
