import { RingcentralSmsProvider } from './ringcentral.provider';

test('should trigger ringcentral library correctly', async () => {
  const provider = new RingcentralSmsProvider({
    server: 'https://platform.devtest.ringcentral.com',
    clientId: '<ringcentral-client-id>',
    clientSecret: '<ringcentral-client-secret>',
    from: '+1145678',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.ringcentralClient.platform(), 'post')
    .mockImplementation(async () => {
      return {
        creationTime: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '+187654',
    content: 'Test',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: '+1145678',
    json: true,
    text: 'Test',
    to: '+187654',
  });
});
