import { SlackProvider } from './slack.provider';

test('should trigger Slack correctly', async () => {
  const provider = new SlackProvider();
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
    webhookUrl: 'webhookUrl',
    content: 'chat message',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    webhookUrl: 'webhookUrl',
    content: 'chat message',
  });
});
