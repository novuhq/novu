import { ZulipProvider } from './zulip.provider';

const mockMessage = {
  webhookUrl:
    'https://test.zulipchat.com/api/v1/external/slack_incoming?api_key=apikey&stream=general',
  content: 'Hello world',
};

test('should trigger zulip library correctly', async () => {
  const provider = new ZulipProvider({});
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage(mockMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(mockMessage);
});
