import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { EazySmsProvider } from '@novu/eazy-sms';
import { BaseSmsHandler } from './base.handler';

export class EazySmsHandler extends BaseSmsHandler {
  constructor() {
    super('eazy-sms', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config = {
      apiKey: credentials.apiKey,
      channelId: credentials.channelId,
    };
    this.provider = new EazySmsProvider(config);
  }
}
