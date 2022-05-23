import { SlackProvider } from './slack.provider';

test('should trigger Slack correctly', async () => {
  const provider = new SlackProvider({
    applicationId: 'applicationId_123',
  });
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
    channelId: 'slack',
    accessToken: 'apiKey',
    content: 'direct message',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    channelId: 'slack',
    accessToken: 'apiKey',
    content: 'direct message',
  });
});
