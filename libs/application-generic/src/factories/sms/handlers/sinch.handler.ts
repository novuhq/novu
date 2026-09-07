import { SinchSmsProvider } from '@novu/providers';
import { assertAllowedSinchSmsRegion, ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class SinchHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Sinch, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config = credentials as Record<string, string>;
    const region = assertAllowedSinchSmsRegion(config.region);

    this.provider = new SinchSmsProvider({
      servicePlanId: config.servicePlanId,
      apiToken: config.apiToken,
      from: config.from,
      region,
    });
  }
}
