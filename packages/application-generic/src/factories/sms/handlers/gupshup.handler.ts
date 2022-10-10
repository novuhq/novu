import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';
import { GupshupSmsProvider } from '@novu/gupshup';

export class GupshupSmsHandler extends BaseSmsHandler {
  constructor() {
    super('Gupshup', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      userId: string;
      password: string;
    } = { userId: credentials.user, password: credentials.password };

    this.provider = new GupshupSmsProvider(config);
  }
}
