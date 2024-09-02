import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { SNSSmsProvider, SNSConfig } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class SnsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.SNS, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new SNSSmsProvider({
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.secretKey,
      region: credentials.region,
    });
  }
}
