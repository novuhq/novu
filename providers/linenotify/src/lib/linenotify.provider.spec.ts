import { LinenotifyProvider } from './linenotify.provider';

const mockConfig = {
  authToken: 'LINE_NOTIFY_TOKEN',
};
test('should trigger LINENotify provider correctly', async () => {
  const provider = new LinenotifyProvider(mockConfig);
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        dateCreated: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    content: 'chat message',
    webhookUrl: 'https://notify-api.line.me/api/notify',
  });
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    content: 'chat message',
    webhookUrl: 'https://notify-api.line.me/api/notify',
  });
});
