import { beforeEach, expect, test, vi } from 'vitest';

const { twilioCreateMock, twilioConstructorMock } = vi.hoisted(() => {
  const createMock = vi.fn().mockResolvedValue({
    sid: 'SM123',
    dateCreated: new Date(),
  });

  const constructorMock = vi.fn();

  return {
    twilioCreateMock: createMock,
    twilioConstructorMock: constructorMock,
  };
});

vi.mock('twilio', () => ({
  Twilio: class {
    messages = {
      create: twilioCreateMock,
    };

    constructor(accountSid: string, authToken: string, regionConfig?: unknown) {
      twilioConstructorMock(accountSid, authToken, regionConfig);
    }
  },
}));

import { TwilioSmsProvider } from './twilio.provider';

beforeEach(() => {
  twilioConstructorMock.mockClear();
  twilioCreateMock.mockClear();
});

test('should trigger Twilio correctly', async () => {
  const provider = new TwilioSmsProvider({
    accountSid: 'AC<twilio-account-Sid>',
    authToken: '<twilio-auth-Token>',
    from: '+112345',
  });

  await provider.sendMessage(
    {
      to: '+176543',
      content: 'SMS Content',
    },
    {
      ApplicationSid: 'test',
    }
  );

  expect(twilioConstructorMock).toHaveBeenCalledWith('AC<twilio-account-Sid>', '<twilio-auth-Token>', undefined);
  expect(twilioCreateMock).toHaveBeenCalledWith({
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
    }
  );

  expect(twilioCreateMock).toHaveBeenCalledWith({
    from: '+112345',
    body: 'SMS Content _passthrough',
    to: '+176543',
    applicationSid: 'test',
  });
});

test('should initialize Twilio client with EU region config', () => {
  new TwilioSmsProvider({
    accountSid: 'AC<twilio-account-Sid>',
    authToken: '<twilio-auth-Token>',
    from: '+112345',
    region: 'eu',
  });

  expect(twilioConstructorMock).toHaveBeenCalledWith('AC<twilio-account-Sid>', '<twilio-auth-Token>', {
    edge: 'dublin',
    region: 'ie1',
  });
});

test('should initialize Twilio client without region config for US', () => {
  new TwilioSmsProvider({
    accountSid: 'AC<twilio-account-Sid>',
    authToken: '<twilio-auth-Token>',
    from: '+112345',
    region: 'us',
  });

  expect(twilioConstructorMock).toHaveBeenCalledWith('AC<twilio-account-Sid>', '<twilio-auth-Token>', undefined);
});
