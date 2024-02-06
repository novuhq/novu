import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { UnifonicSmsProvider } from '@novu/unifonic';

export class UnifonicHandler extends BaseSmsHandler {
  constructor() {
    super('unifonic', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    if (!credentials.user || !credentials.appID) {
      throw Error('Invalid credentials');
    }

    const config = {
      AppSid: credentials.appID,
      SenderID: credentials.user
    };

    this.provider = new UnifonicSmsProvider(config);
  }
}
