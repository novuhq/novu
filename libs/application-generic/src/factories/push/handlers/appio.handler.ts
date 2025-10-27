import { ChannelTypeEnum, ICredentials, PushProviderIdEnum } from '@novu/shared';
import { AppioPushProvider } from '@novu/providers';
import { BasePushHandler } from './base.handler';

export class AppIOHandler extends BasePushHandler {
  constructor() {
    super(PushProviderIdEnum.AppIO, ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    const config: { AppIOBaseUrl?: string } = { AppIOBaseUrl: credentials.apiKey };

    this.provider = new AppioPushProvider(config);
  }
}
