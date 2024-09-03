import { expect, test, vi } from 'vitest';
import { NexmoSmsProvider } from './nexmo.provider';

test('should trigger nexmo library correctly', async () => {
  const provider = new NexmoSmsProvider({
    apiKey: '<vonage-api-key>',
    apiSecret: '<vonage-api-secret>',
    from: '+112345',
  });

  const spy = vi

    // @ts-expect-error
    .spyOn(provider.vonageClient.sms, 'send')
    .mockImplementation(async () => {
      return {
        'message-count': 1,
        messages: [
          {
            'message-id': '123',
            to: '1',
            'message-price': '1',
            'remaining-balance': '1',
            status: '0' as never,
            'account-ref': '1',
            network: '1',
          },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: '+112345',
    text: 'SMS Content',
    to: '+176543',
  });
});

test('should trigger nexmo library correctly with _passthrough', async () => {
  const provider = new NexmoSmsProvider({
    apiKey: '<vonage-api-key>',
    apiSecret: '<vonage-api-secret>',
    from: '+112345',
  });

  const spy = vi

    // @ts-expect-error
    .spyOn(provider.vonageClient.sms, 'send')
    .mockImplementation(async () => {
      return {
        'message-count': 1,
        messages: [
          {
            'message-id': '123',
            to: '1',
            'message-price': '1',
            'remaining-balance': '1',
            status: '0' as never,
            'account-ref': '1',
            network: '1',
          },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage(
    {
      to: '+176543',
      content: 'SMS Content',
    },
    {
      _passthrough: {
        body: {
          from: '+212345',
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: '+212345',
    text: 'SMS Content',
    to: '+176543',
  });
});
