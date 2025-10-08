import { SinchSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class SinchHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Sinch, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config = credentials as Record<string, string>;
    this.provider = new SinchSmsProvider({
      servicePlanId: config.servicePlanId,
      apiToken: config.apiToken,
      from: config.from,
      region: config.region,
    });
  }
}
