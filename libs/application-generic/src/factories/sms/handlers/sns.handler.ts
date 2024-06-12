import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { SNSSmsProvider } from '@novu/providers';
import { SNSConfig } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class SnsHandler extends BaseSmsHandler {
  constructor() {
    super('sns', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new SNSSmsProvider({
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.secretKey,
      region: credentials.region,
    });
  }
}
