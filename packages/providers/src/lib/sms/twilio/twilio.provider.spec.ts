import { expect, test, vi } from 'vitest';
import { TwilioSmsProvider } from './twilio.provider';

test('should trigger Twilio correctly', async () => {
  const provider = new TwilioSmsProvider({
    accountSid: 'AC<twilio-account-Sid>',
    authToken: '<twilio-auth-Token>',
    from: '+112345',
  });
  const spy = vi
    .spyOn((provider as any).twilioClient.messages, 'create')
    .mockImplementation(async () => {
      return {
        dateCreated: new Date(),
      };
    });

  await provider.sendMessage(
    {
      to: '+176543',
      content: 'SMS Content',
    },
    {
      ApplicationSid: 'test',
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: '+112345',
    body: 'SMS Content',
    to: '+176543',
    applicationSid: 'test',
  });
});

test('should trigger Twilio correctly with _passthrough', async () => {
  const provider = new TwilioSmsProvider({
    accountSid: 'AC<twilio-account-Sid>',
    authToken: '<twilio-auth-Token>',
    from: '+112345',
  });
  const spy = vi
    .spyOn((provider as any).twilioClient.messages, 'create')
    .mockImplementation(async () => {
      return {
        dateCreated: new Date(),
      };
    });

  await provider.sendMessage(
    {
      to: '+176543',
      content: 'SMS Content',
    },
    {
      ApplicationSid: 'test',
      _passthrough: {
        body: {
          body: 'SMS Content _passthrough',
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: '+112345',
    body: 'SMS Content _passthrough',
    to: '+176543',
    applicationSid: 'test',
  });
});
