import { SfrSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class SfrSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.SfrSms, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    if (!credentials.serviceId || !credentials.servicePassword || !credentials.spaceId || !credentials.from) {
      throw Error('Invalid credentials');
    }

    const config = {
      serviceId: credentials.serviceId,
      servicePassword: credentials.servicePassword,
      spaceId: credentials.spaceId,
      from: credentials.from,
    };

    this.provider = new SfrSmsProvider(config);
  }
}
