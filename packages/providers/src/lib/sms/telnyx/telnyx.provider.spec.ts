import { expect, test, vi } from 'vitest';
import { TelnyxSmsProvider } from './telnyx.provider';

test('should trigger Telnyx correctly', async () => {
  const provider = new TelnyxSmsProvider({
    apiKey: 'API-KEY-MOCK1023893INAPP',
    from: 'TelynxTest',
    messageProfileId: 'jap-ops-pkd-pn-pair',
  });

  const spy = vi
    .spyOn((provider as any).telnyxClient.messages, 'create')
    .mockImplementation(async () => {
      return {
        data: {
          id: Math.ceil(Math.random() * 100),
          received_at: new Date(),
        },
      };
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

test('should trigger Telnyx correctly with _passthrough', async () => {
  const provider = new TelnyxSmsProvider({
    apiKey: 'API-KEY-MOCK1023893INAPP',
    from: 'TelynxTest',
    messageProfileId: 'jap-ops-pkd-pn-pair',
  });

  const spy = vi
    .spyOn((provider as any).telnyxClient.messages, 'create')
    .mockImplementation(async () => {
      return {
        data: {
          id: Math.ceil(Math.random() * 100),
          received_at: new Date(),
        },
      };
    });
  await provider.sendMessage(
    {
      content: 'We are testing',
      to: '+2347069652019',
    },
    {
      _passthrough: {
        body: {
          from: 'TelynxTest1',
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: 'TelynxTest1',
    text: 'We are testing',
    to: '+2347069652019',
    messaging_profile_id: 'jap-ops-pkd-pn-pair',
  });
});
