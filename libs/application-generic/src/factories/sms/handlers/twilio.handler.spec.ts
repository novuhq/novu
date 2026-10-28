import { TwilioSmsProvider } from '@novu/providers';
import { TwilioHandler } from './twilio.handler';

jest.mock('@novu/providers', () => ({ TwilioSmsProvider: jest.fn() }));

const credentials = {
  accountSid: 'AC123',
  token: 'auth-token',
  apiKey: 'SK123',
  secretKey: 'api-key-secret',
  from: '+15550000000',
  region: 'eu',
};

describe('TwilioHandler', () => {
  beforeEach(() => {
    jest.mocked(TwilioSmsProvider).mockClear();
  });

  it('uses the auth token when no auth method is set, even if API key credentials exist', () => {
    new TwilioHandler().buildProvider(credentials);

    expect(TwilioSmsProvider).toHaveBeenCalledWith({
      accountSid: 'AC123',
      authToken: 'auth-token',
      from: '+15550000000',
      region: 'eu',
    });
  });

  it('uses the auth token for the authToken auth method', () => {
    new TwilioHandler().buildProvider({ ...credentials, authMethod: 'authToken' });

    expect(TwilioSmsProvider).toHaveBeenCalledWith({
      accountSid: 'AC123',
      authToken: 'auth-token',
      from: '+15550000000',
      region: 'eu',
    });
  });

  it('uses the API key SID and secret for the apiKey auth method', () => {
    new TwilioHandler().buildProvider({ ...credentials, authMethod: 'apiKey' });

    expect(TwilioSmsProvider).toHaveBeenCalledWith({
      accountSid: 'AC123',
      apiKeySid: 'SK123',
      apiKeySecret: 'api-key-secret',
      from: '+15550000000',
      region: 'eu',
    });
  });
});
