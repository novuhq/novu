import { TwilioSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class TwilioHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Twilio, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const auth =
      credentials.authMethod === 'apiKey'
        ? { apiKeySid: credentials.apiKey, apiKeySecret: credentials.secretKey }
        : { authToken: credentials.token };

    this.provider = new TwilioSmsProvider({
      accountSid: credentials.accountSid,
      ...auth,
      from: credentials.from,
      region: credentials.region,
    });
  }
}
