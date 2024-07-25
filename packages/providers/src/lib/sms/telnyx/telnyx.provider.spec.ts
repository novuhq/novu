import { TelnyxSmsProvider } from './telnyx.provider';

test('should trigger Telnyx correctly', async () => {
  const provider = new TelnyxSmsProvider({
    apiKey: 'API-KEY-MOCK1023893INAPP',
    from: 'TelynxTest',
    messageProfileId: 'jap-ops-pkd-pn-pair',
  });

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.telnyxClient.messages, 'create')
    .mockImplementation(async () => {
      return {
        data: {
          id: Math.ceil(Math.random() * 100),
          received_at: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        },
      } as any;
    });
  await provider.sendMessage({
    content: 'We are testing',
    to: '+2347069652019',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: 'TelynxTest',
    text: 'We are testing',
    to: '+2347069652019',
    messaging_profile_id: 'jap-ops-pkd-pn-pair',
  });
});
