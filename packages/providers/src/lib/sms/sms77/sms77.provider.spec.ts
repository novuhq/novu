import { expect, test, vi } from 'vitest';
import { Sms77SmsProvider } from './sms77.provider';

test('should trigger sms77 correctly', async () => {
  const provider = new Sms77SmsProvider({
    apiKey: '<sms77-api-key>',
    from: '+1145678',
  });

  const spy = vi
    .spyOn((provider as any).sms77Client, 'sms')
    .mockImplementation(async () => {
      return {
        messages: [{ id: null }],
      };
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

test('should trigger sms77 correctly with _passthrough', async () => {
  const provider = new Sms77SmsProvider({
    apiKey: '<sms77-api-key>',
    from: '+1145678',
  });

  const spy = vi
    .spyOn((provider as any).sms77Client, 'sms')
    .mockImplementation(async () => {
      return {
        messages: [{ id: null }],
      };
    });

  await provider.sendMessage(
    {
      to: '+187654',
      content: 'Test',
    },
    {
      _passthrough: {
        body: {
          json: false,
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: '+1145678',
    json: false,
    text: 'Test',
    to: '+187654',
  });
});
