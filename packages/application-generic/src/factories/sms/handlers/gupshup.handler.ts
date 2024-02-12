import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { GupshupSmsProvider } from '@novu/gupshup';

export class GupshupSmsHandler extends BaseSmsHandler {
  constructor() {
    super('gupshup', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new GupshupSmsProvider({
      userId: credentials.user,
      password: credentials.password,
    });
  }
}
